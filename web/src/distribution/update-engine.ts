import {validateResourceManifest} from '../resource-manifest.ts';
import type {ResourceManifest,ResourceManifestEntry} from '../resource-manifest.ts';
import type {AssetStore,InstalledAssetSet} from './asset-store.ts';

export type ManifestDiff={
  unchanged:ResourceManifestEntry[];
  changed:ResourceManifestEntry[];
  newAssets:ResourceManifestEntry[];
  removed:ResourceManifestEntry[];
};

export type UpdateStatus=
  |'checking'
  |'downloading'
  |'verifying'
  |'staging'
  |'committing'
  |'repairing'
  |'complete'
  |'failed';

export type UpdateProgress={
  status:UpdateStatus;
  totalBytes:number;
  downloadedBytes:number;
  currentAsset?:string;
  failure?:string;
};

export type UpdateProgressListener=(progress:UpdateProgress)=>void;

export type AssetFetcher=(entry:ResourceManifestEntry,signal?:AbortSignal)=>Promise<Blob>;

export type UpdateAssetsOptions={
  store:AssetStore;
  targetManifest:ResourceManifest;
  fetchAsset:AssetFetcher;
  onProgress?:UpdateProgressListener;
  signal?:AbortSignal;
  committedAt?:string;
};

export type UpdateAssetsResult={
  diff:ManifestDiff;
  installed:InstalledAssetSet;
  fetchedAssets:number;
};

export type AssetAuditResult={
  installed:InstalledAssetSet;
  missing:ResourceManifestEntry[];
  corrupt:ResourceManifestEntry[];
  healthy:ResourceManifestEntry[];
};

export type RepairAssetsOptions={
  store:AssetStore;
  contentPack:string;
  fetchAsset:AssetFetcher;
  onProgress?:UpdateProgressListener;
  signal?:AbortSignal;
  committedAt?:string;
};

export type RepairAssetsResult={
  auditBefore:AssetAuditResult;
  installed:InstalledAssetSet;
  fetchedAssets:number;
};

function clone<T>(value:T):T{
  return structuredClone(value);
}

function emit(listener:UpdateProgressListener|undefined,progress:UpdateProgress):void{
  if(!listener)return;
  try{listener(clone(progress));}catch{}
}

function failProgress(
  listener:UpdateProgressListener|undefined,
  totalBytes:number,
  downloadedBytes:number,
  currentAsset: string|undefined,
  error:unknown,
):void{
  emit(listener,{
    status:'failed',
    totalBytes,
    downloadedBytes,
    currentAsset,
    failure:error instanceof Error?error.message:String(error),
  });
}

function abortIfNeeded(signal?:AbortSignal):void{
  if(signal?.aborted)throw signal.reason??new DOMException('Aborted','AbortError');
}

function sameContent(a:ResourceManifestEntry,b:ResourceManifestEntry):boolean{
  return a.path===b.path&&a.size===b.size&&a.sha256===b.sha256;
}

export function diffResourceManifests(
  installedManifest:ResourceManifest|undefined,
  rawTargetManifest:ResourceManifest,
):ManifestDiff{
  const target=validateResourceManifest(clone(rawTargetManifest));
  if(!installedManifest){
    return{unchanged:[],changed:[],newAssets:clone(target.assets),removed:[]};
  }
  const installed=validateResourceManifest(clone(installedManifest));
  if(installed.contentPack!==target.contentPack){
    throw new Error(`Content pack mismatch: ${installed.contentPack} -> ${target.contentPack}`);
  }

  const previousByPath=new Map(installed.assets.map(entry=>[entry.path,entry]));
  const targetPaths=new Set(target.assets.map(entry=>entry.path));
  const unchanged:ResourceManifestEntry[]=[];
  const changed:ResourceManifestEntry[]=[];
  const newAssets:ResourceManifestEntry[]=[];

  for(const entry of target.assets){
    const previous=previousByPath.get(entry.path);
    if(!previous)newAssets.push(clone(entry));
    else if(sameContent(previous,entry))unchanged.push(clone(entry));
    else changed.push(clone(entry));
  }

  const removed=installed.assets
    .filter(entry=>!targetPaths.has(entry.path))
    .map(clone);

  return{unchanged,changed,newAssets,removed};
}

function hex(bytes:ArrayBuffer):string{
  return Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function sha256Blob(blob:Blob):Promise<string>{
  return hex(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));
}

export async function verifyAssetBlob(entry:ResourceManifestEntry,blob:Blob):Promise<void>{
  if(blob.size!==entry.size)throw new Error(`Asset size mismatch: ${entry.path}`);
  const sha256=await sha256Blob(blob);
  if(sha256!==entry.sha256)throw new Error(`Asset SHA-256 mismatch: ${entry.path}`);
}

async function fetchVerifiedAndStage(
  store:AssetStore,
  entry:ResourceManifestEntry,
  fetchAsset:AssetFetcher,
  listener:UpdateProgressListener|undefined,
  progress:{totalBytes:number;downloadedBytes:number},
  signal?:AbortSignal,
  fetchStatus:UpdateStatus='downloading',
):Promise<void>{
  abortIfNeeded(signal);
  emit(listener,{
    status:fetchStatus,
    totalBytes:progress.totalBytes,
    downloadedBytes:progress.downloadedBytes,
    currentAsset:entry.path,
  });
  const blob=await fetchAsset(entry,signal);
  progress.downloadedBytes+=blob.size;
  abortIfNeeded(signal);
  emit(listener,{
    status:'verifying',
    totalBytes:progress.totalBytes,
    downloadedBytes:progress.downloadedBytes,
    currentAsset:entry.path,
  });
  await verifyAssetBlob(entry,blob);
  abortIfNeeded(signal);
  emit(listener,{
    status:'staging',
    totalBytes:progress.totalBytes,
    downloadedBytes:progress.downloadedBytes,
    currentAsset:entry.path,
  });
  await store.putBlob(entry,blob);
}

export async function updateAssets(options:UpdateAssetsOptions):Promise<UpdateAssetsResult>{
  const target=validateResourceManifest(clone(options.targetManifest));
  let totalBytes=0;
  let downloadedBytes=0;
  let currentAsset:string|undefined;
  emit(options.onProgress,{status:'checking',totalBytes:0,downloadedBytes:0});

  try{
    abortIfNeeded(options.signal);
    const existing=await options.store.getInstalled(target.contentPack);
    const diff=diffResourceManifests(existing?.manifest,target);
    const required=[...diff.changed,...diff.newAssets];
    totalBytes=required.reduce((sum,entry)=>sum+entry.size,0);
    const progress={totalBytes,downloadedBytes};

    for(const entry of required){
      currentAsset=entry.path;
      await fetchVerifiedAndStage(
        options.store,
        entry,
        options.fetchAsset,
        options.onProgress,
        progress,
        options.signal,
      );
      downloadedBytes=progress.downloadedBytes;
    }

    abortIfNeeded(options.signal);
    emit(options.onProgress,{
      status:'committing',
      totalBytes,
      downloadedBytes,
    });
    const installed=await options.store.commit(
      target,
      existing?'update':'install',
      options.committedAt,
    );
    emit(options.onProgress,{
      status:'complete',
      totalBytes,
      downloadedBytes,
    });
    return{diff,installed,fetchedAssets:required.length};
  }catch(error){
    failProgress(options.onProgress,totalBytes,downloadedBytes,currentAsset,error);
    throw error;
  }
}

export async function auditInstalledAssets(
  store:AssetStore,
  contentPack:string,
):Promise<AssetAuditResult>{
  const installed=await store.getInstalled(contentPack);
  if(!installed)throw new Error(`No installed asset pack: ${contentPack}`);
  const missing:ResourceManifestEntry[]=[];
  const corrupt:ResourceManifestEntry[]=[];
  const healthy:ResourceManifestEntry[]=[];

  for(const entry of installed.manifest.assets){
    let record;
    try{
      record=await store.getBlob(entry.sha256);
    }catch{
      corrupt.push(clone(entry));
      continue;
    }
    if(!record){
      missing.push(clone(entry));
      continue;
    }
    if(record.size!==entry.size||record.blob.size!==entry.size){
      corrupt.push(clone(entry));
      continue;
    }
    const sha256=await sha256Blob(record.blob);
    if(sha256!==entry.sha256)corrupt.push(clone(entry));
    else healthy.push(clone(entry));
  }

  return{installed,missing,corrupt,healthy};
}

export async function repairAssets(options:RepairAssetsOptions):Promise<RepairAssetsResult>{
  let totalBytes=0;
  let downloadedBytes=0;
  let currentAsset:string|undefined;
  emit(options.onProgress,{status:'checking',totalBytes:0,downloadedBytes:0});

  try{
    abortIfNeeded(options.signal);
    const auditBefore=await auditInstalledAssets(options.store,options.contentPack);
    const broken=[...auditBefore.missing,...auditBefore.corrupt];
    totalBytes=broken.reduce((sum,entry)=>sum+entry.size,0);
    const progress={totalBytes,downloadedBytes};

    for(const entry of broken){
      currentAsset=entry.path;
      await fetchVerifiedAndStage(
        options.store,
        entry,
        options.fetchAsset,
        options.onProgress,
        progress,
        options.signal,
        'repairing',
      );
      downloadedBytes=progress.downloadedBytes;
    }

    if(broken.length===0){
      emit(options.onProgress,{status:'complete',totalBytes:0,downloadedBytes:0});
      return{auditBefore,installed:auditBefore.installed,fetchedAssets:0};
    }

    abortIfNeeded(options.signal);
    emit(options.onProgress,{
      status:'committing',
      totalBytes,
      downloadedBytes,
    });
    const installed=await options.store.commit(
      auditBefore.installed.manifest,
      'repair',
      options.committedAt,
    );
    emit(options.onProgress,{
      status:'complete',
      totalBytes,
      downloadedBytes,
    });
    return{auditBefore,installed,fetchedAssets:broken.length};
  }catch(error){
    failProgress(options.onProgress,totalBytes,downloadedBytes,currentAsset,error);
    throw error;
  }
}

export function createHttpAssetFetcher(baseUrl:string|URL):AssetFetcher{
  const root=baseUrl instanceof URL?baseUrl:new URL(baseUrl);
  return async(entry,signal)=>{
    const response=await fetch(new URL(entry.path,root),{signal,cache:'no-store'});
    if(!response.ok)throw new Error(`Asset download failed (${response.status}): ${entry.path}`);
    return response.blob();
  };
}

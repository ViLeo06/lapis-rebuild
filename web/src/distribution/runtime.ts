import {validateResourceManifest, type ResourceManifest, type ResourceManifestEntry} from '../resource-manifest.ts';
import {IndexedDbAssetStore, type InstalledAssetSet} from './asset-store.ts';
import {
  auditInstalledAssets,
  createHttpAssetFetcher,
  diffResourceManifests,
  repairAssets,
  updateAssets,
  type UpdateProgress,
} from './update-engine.ts';
import {verifyFullPack, type FullPackProgress, type VerifiedFullPack} from './full-pack.ts';
import {
  installDistributionPanel,
  type DistributionActionContext,
  type DistributionPanelController,
} from '../ui/distribution-panel.ts';
import type {
  DistributionProgress,
  DistributionSnapshot,
  DistributionState,
} from '../ui/distribution-panel-model.ts';

const ACTIVE_CONTENT_PACK_KEY='lapis-active-content-pack';
const RELEASE_METADATA_PATH='./release-metadata.json';
const TOKEN=/^[A-Za-z0-9._-]{1,128}$/;

type ReleaseContent={
  contentPack:string;
  version:string;
  manifestPath:string;
  fullPackPath:string|null;
};

type ReleaseMetadata={
  schema:1;
  release:{
    channel:'production'|'preview'|'ci'|'local';
    commit:string|null;
    branch:string|null;
    url:string|null;
  };
  content:ReleaseContent|null;
};

export type DistributionRuntimeController={
  panel:DistributionPanelController;
  refresh:()=>Promise<void>;
};

declare global{
  interface Window{
    lapisDistribution?:{
      snapshot:()=>DistributionSnapshot;
      open:()=>void;
      refresh:()=>Promise<void>;
    };
  }
}

function object(value:unknown):value is Record<string,unknown>{
  return !!value&&typeof value==='object'&&!Array.isArray(value);
}

function publicResourceReference(value:unknown,label:string):string{
  if(typeof value!=='string')throw new Error(`Invalid ${label}`);
  if(value.startsWith('/')){
    if(value.startsWith('//')||value.includes('\\')||value.includes('?')||value.includes('#')){
      throw new Error(`Invalid ${label}`);
    }
    const parts=value.slice(1).split('/');
    if(parts.some(part=>!part||part==='.'||part==='..')||parts.includes('game-data')){
      throw new Error(`Invalid ${label}`);
    }
    return value;
  }
  let parsed:URL;
  try{parsed=new URL(value);}catch{throw new Error(`Invalid ${label}`);}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.search||parsed.hash||
      parsed.pathname.split('/').includes('game-data')){
    throw new Error(`Invalid ${label}`);
  }
  return parsed.toString();
}

export function validateReleaseMetadata(raw:unknown):ReleaseMetadata{
  if(!object(raw)||raw.schema!==1||!object(raw.release))throw new Error('Invalid release metadata');
  const channel=raw.release.channel;
  if(!['production','preview','ci','local'].includes(String(channel)))throw new Error('Invalid release channel');
  let content:ReleaseContent|null=null;
  if(raw.content!==null&&raw.content!==undefined){
    if(!object(raw.content)||
        typeof raw.content.contentPack!=='string'||!TOKEN.test(raw.content.contentPack)||
        typeof raw.content.version!=='string'||!TOKEN.test(raw.content.version)){
      throw new Error('Invalid release content identity');
    }
    const manifestPath=publicResourceReference(raw.content.manifestPath,'manifest path');
    const fullPackPath=raw.content.fullPackPath===null||raw.content.fullPackPath===undefined
      ?null
      :publicResourceReference(raw.content.fullPackPath,'full pack path');
    content={
      contentPack:raw.content.contentPack,
      version:raw.content.version,
      manifestPath,
      fullPackPath,
    };
  }
  return{
    schema:1,
    release:{
      channel:channel as ReleaseMetadata['release']['channel'],
      commit:typeof raw.release.commit==='string'?raw.release.commit:null,
      branch:typeof raw.release.branch==='string'?raw.release.branch:null,
      url:typeof raw.release.url==='string'?raw.release.url:null,
    },
    content,
  };
}

export function distributionAssetRoot(content:{contentPack:string;version:string}):string{
  if(!TOKEN.test(content.contentPack)||!TOKEN.test(content.version))throw new Error('Invalid distribution asset identity');
  return `/distribution/assets/${content.contentPack}/${content.version}/`;
}

function releaseUrl(path:string):URL{
  return new URL(path,location.origin);
}

async function fetchJson(url:string|URL):Promise<unknown>{
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error(`资源信息读取失败（${response.status}）`);
  return response.json();
}

async function fetchReleaseMetadata():Promise<ReleaseMetadata>{
  return validateReleaseMetadata(await fetchJson(new URL(RELEASE_METADATA_PATH,location.href)));
}

async function fetchTargetManifest(content:ReleaseContent):Promise<ResourceManifest>{
  const manifest=validateResourceManifest(await fetchJson(releaseUrl(content.manifestPath)));
  if(manifest.contentPack!==content.contentPack||manifest.version!==content.version){
    throw new Error('在线资源版本信息不一致');
  }
  return manifest;
}

function readActiveContentPack():string|undefined{
  try{
    const value=localStorage.getItem(ACTIVE_CONTENT_PACK_KEY)?.trim();
    return value&&TOKEN.test(value)?value:undefined;
  }catch{
    return undefined;
  }
}

function writeActiveContentPack(contentPack:string):void{
  try{localStorage.setItem(ACTIVE_CONTENT_PACK_KEY,contentPack);}catch{}
}

async function preferredInstalled(
  store:IndexedDbAssetStore,
  release:ReleaseMetadata|null,
):Promise<InstalledAssetSet|undefined>{
  const candidates=[
    release?.content?.contentPack,
    readActiveContentPack(),
  ].filter((value,index,all):value is string=>Boolean(value)&&all.indexOf(value)===index);
  for(const contentPack of candidates){
    try{
      const installed=await store.getInstalled(contentPack);
      if(installed)return installed;
    }catch{}
  }
  return undefined;
}

function readyState():DistributionState{
  return navigator.onLine?'READY':'OFFLINE_READY';
}

function initialSnapshot(
  release:ReleaseMetadata|null,
  installed:InstalledAssetSet|undefined,
  releaseReadFailed:boolean,
):DistributionSnapshot{
  if(installed){
    return{
      state:release?.content&&
        release.content.contentPack===installed.contentPack&&
        release.content.version!==installed.version
        ?'UPDATE_AVAILABLE'
        :readyState(),
      installedVersion:installed.version,
      targetVersion:release?.content?.version,
    };
  }
  if(release?.content){
    return{
      state:'NO_PACK',
      targetVersion:release.content.version,
      canDownloadFullPack:Boolean(release.content.fullPackPath),
    };
  }
  return{
    state:'NO_PACK',
    canDownloadFullPack:false,
    message:releaseReadFailed
      ?'暂时无法读取在线资源信息，可以稍后重试或导入本地完整资源包。'
      :'当前站点尚未配置公开资源包，可以导入本地完整资源包。',
  };
}

function progressState(progress:UpdateProgress):DistributionState{
  switch(progress.status){
    case'checking':return'CHECKING';
    case'verifying':return'VERIFYING';
    case'staging':
    case'committing':return'INSTALLING';
    case'complete':return'READY';
    case'failed':return'ERROR';
    case'downloading':
    case'repairing':return'DOWNLOADING';
  }
}

function progressCopy(progress:UpdateProgress):DistributionProgress{
  return{
    totalBytes:progress.totalBytes,
    downloadedBytes:progress.downloadedBytes,
    currentAsset:progress.currentAsset,
    status:progress.status==='repairing'?'正在修复资源':progress.status,
    failure:progress.failure,
  };
}

function applyUpdateProgress(context:DistributionActionContext,progress:UpdateProgress):void{
  const current=context.getSnapshot();
  context.setSnapshot({
    ...current,
    state:progressState(progress),
    progress:progressCopy(progress),
    message:progress.failure,
  });
}

function applyFullPackProgress(context:DistributionActionContext,progress:FullPackProgress):void{
  context.setSnapshot({
    ...context.getSnapshot(),
    state:'VERIFYING',
    progress:{
      totalBytes:progress.totalBytes,
      downloadedBytes:progress.verifiedBytes,
      currentAsset:progress.currentAsset,
      status:'正在校验完整资源',
    },
  });
}

async function stageVerifiedPack(
  store:IndexedDbAssetStore,
  verified:VerifiedFullPack,
  context:DistributionActionContext,
):Promise<InstalledAssetSet>{
  const existing=await store.getInstalled(verified.manifest.contentPack);
  const totalBytes=verified.manifest.assets.reduce((sum,entry)=>sum+entry.size,0);
  let stagedBytes=0;
  for(const entry of verified.manifest.assets){
    context.setSnapshot({
      ...context.getSnapshot(),
      state:'INSTALLING',
      progress:{
        totalBytes,
        downloadedBytes:stagedBytes,
        currentAsset:entry.path,
        status:'正在安装资源',
      },
    });
    await store.putBlob(entry,verified.getAsset(entry.path));
    stagedBytes+=entry.size;
  }
  const installed=await store.commit(verified.manifest,existing?'update':'install');
  writeActiveContentPack(installed.contentPack);
  context.setSnapshot({
    state:readyState(),
    installedVersion:installed.version,
    targetVersion:installed.version,
    progress:{totalBytes,downloadedBytes:totalBytes,status:'资源已安装'},
  });
  return installed;
}

function assetFetcher(content:{contentPack:string;version:string}){
  return createHttpAssetFetcher(releaseUrl(distributionAssetRoot(content)));
}

async function serviceWorkerReadyForAssets():Promise<void>{
  if(!('serviceWorker'in navigator))return;
  if(navigator.serviceWorker.controller)return;
  await Promise.race([
    navigator.serviceWorker.ready.catch(()=>undefined),
    new Promise<void>(resolve=>setTimeout(resolve,5000)),
  ]);
  if(navigator.serviceWorker.controller)return;
  await new Promise<void>(resolve=>{
    let settled=false;
    const finish=()=>{
      if(settled)return;
      settled=true;
      navigator.serviceWorker.removeEventListener('controllerchange',finish);
      resolve();
    };
    navigator.serviceWorker.addEventListener('controllerchange',finish,{once:true});
    setTimeout(finish,1500);
  });
}

export async function installDistributionRuntime(options:{
  startGame:()=>void;
}):Promise<DistributionRuntimeController>{
  const store=new IndexedDbAssetStore();
  let release:ReleaseMetadata|null=null;
  let releaseReadFailed=false;
  try{
    release=await fetchReleaseMetadata();
  }catch{
    releaseReadFailed=true;
  }
  let installed=await preferredInstalled(store,release);
  let targetManifest:ResourceManifest|undefined;

  const getRelease=async(force=false):Promise<ReleaseMetadata|null>=>{
    if(release&&!force)return release;
    try{
      release=await fetchReleaseMetadata();
      releaseReadFailed=false;
      targetManifest=undefined;
      return release;
    }catch{
      releaseReadFailed=true;
      return release;
    }
  };

  const getTargetManifest=async(force=false):Promise<ResourceManifest>=>{
    const current=await getRelease(force);
    if(!current?.content)throw new Error('当前发行没有配置在线资源版本');
    if(!targetManifest||force)targetManifest=await fetchTargetManifest(current.content);
    return targetManifest;
  };

  const refresh=async(context:DistributionActionContext):Promise<void>=>{
    const current=await getRelease(true);
    installed=await preferredInstalled(store,current);
    if(!current?.content){
      context.setSnapshot(initialSnapshot(current,installed,releaseReadFailed));
      return;
    }
    const target=await getTargetManifest();
    const currentInstall=await store.getInstalled(target.contentPack);
    if(!currentInstall){
      installed=undefined;
      context.setSnapshot({
        state:'NO_PACK',
        targetVersion:target.version,
        canDownloadFullPack:Boolean(current.content.fullPackPath),
      });
      return;
    }
    installed=currentInstall;
    const diff=diffResourceManifests(currentInstall.manifest,target);
    if(diff.changed.length||diff.newAssets.length||diff.removed.length){
      context.setSnapshot({
        state:'UPDATE_AVAILABLE',
        installedVersion:currentInstall.version,
        targetVersion:target.version,
      });
      return;
    }
    const audit=await auditInstalledAssets(store,target.contentPack);
    if(audit.missing.length||audit.corrupt.length){
      context.setSnapshot({
        state:'REPAIR_REQUIRED',
        installedVersion:currentInstall.version,
        targetVersion:target.version,
        message:`检测到 ${audit.missing.length+audit.corrupt.length} 个资源需要修复。`,
      });
      return;
    }
    context.setSnapshot({
      state:readyState(),
      installedVersion:currentInstall.version,
      targetVersion:target.version,
    });
  };

  let panel!:DistributionPanelController;
  const actions={
    enterGame:async(context:DistributionActionContext)=>{
      installed=await preferredInstalled(store,release);
      if(release?.content&&!installed)throw new Error('请先安装游戏资源');
      if(installed)await serviceWorkerReadyForAssets();
      options.startGame();
      panel.close();
    },
    downloadFullPack:async(context:DistributionActionContext)=>{
      const current=await getRelease(true);
      if(!current?.content?.fullPackPath){
        throw new Error('当前发行没有提供可下载的完整资源包，请导入本地完整资源包。');
      }
      const target=await getTargetManifest();
      context.setSnapshot({
        ...context.getSnapshot(),
        state:'DOWNLOADING',
        targetVersion:target.version,
        progress:{status:'正在下载完整资源',totalBytes:0,downloadedBytes:0},
      });
      const response=await fetch(releaseUrl(current.content.fullPackPath),{cache:'no-store'});
      if(!response.ok)throw new Error(`完整资源下载失败（${response.status}）`);
      const blob=await response.blob();
      context.updateProgress({status:'完整资源下载完成',totalBytes:blob.size,downloadedBytes:blob.size});
      const verified=await verifyFullPack(blob,{
        expectedManifest:target,
        expectedContentPack:target.contentPack,
        expectedVersion:target.version,
        onProgress:value=>applyFullPackProgress(context,value),
      });
      installed=await stageVerifiedPack(store,verified,context);
    },
    importFullPack:async(file:File,context:DistributionActionContext)=>{
      const current=await getRelease(false);
      const expected=current?.content?await getTargetManifest():undefined;
      const verified=await verifyFullPack(file,{
        ...(expected?{
          expectedManifest:expected,
          expectedContentPack:expected.contentPack,
          expectedVersion:expected.version,
        }:{}),
        onProgress:value=>applyFullPackProgress(context,value),
      });
      installed=await stageVerifiedPack(store,verified,context);
    },
    checkUpdate:async(context:DistributionActionContext)=>{
      context.setSnapshot({...context.getSnapshot(),state:'CHECKING',progress:{status:'正在检查更新'}});
      await refresh(context);
    },
    applyUpdate:async(context:DistributionActionContext)=>{
      const current=await getRelease(true);
      if(!current?.content)throw new Error('当前发行没有配置在线更新');
      const target=await getTargetManifest();
      const result=await updateAssets({
        store,
        targetManifest:target,
        fetchAsset:assetFetcher(current.content),
        onProgress:value=>applyUpdateProgress(context,value),
      });
      installed=result.installed;
      writeActiveContentPack(installed.contentPack);
      context.setSnapshot({
        state:readyState(),
        installedVersion:installed.version,
        targetVersion:target.version,
        progress:context.getSnapshot().progress,
      });
    },
    repair:async(context:DistributionActionContext)=>{
      installed=await preferredInstalled(store,release);
      if(!installed)throw new Error('当前没有可修复的已安装资源');
      const result=await repairAssets({
        store,
        contentPack:installed.contentPack,
        fetchAsset:assetFetcher(installed),
        onProgress:value=>applyUpdateProgress(context,value),
      });
      installed=result.installed;
      writeActiveContentPack(installed.contentPack);
      context.setSnapshot({
        state:readyState(),
        installedVersion:installed.version,
        targetVersion:release?.content?.version,
        progress:context.getSnapshot().progress,
      });
    },
  };

  panel=installDistributionPanel({
    initial:initialSnapshot(release,installed,releaseReadFailed),
    actions,
  });

  const runtime:DistributionRuntimeController={
    panel,
    refresh:()=>refresh({
      getSnapshot:panel.getSnapshot,
      setSnapshot:panel.setSnapshot,
      updateProgress:panel.updateProgress,
    }),
  };
  window.lapisDistribution={
    snapshot:panel.getSnapshot,
    open:panel.open,
    refresh:runtime.refresh,
  };

  window.addEventListener('online',()=>{void runtime.refresh();});
  window.addEventListener('offline',()=>{
    const snapshot=panel.getSnapshot();
    if(snapshot.installedVersion){
      panel.setSnapshot({...snapshot,state:'OFFLINE_READY',message:'资源已安装，当前离线也可以进入游戏。'});
    }
  });

  if(installed){
    await serviceWorkerReadyForAssets();
    options.startGame();
  }else if(
    !release?.content&&
    (navigator.webdriver||location.hostname==='127.0.0.1'||location.hostname==='localhost')
  ){
    // Browser automation/local fixture mode auto-boots the synthetic game-data fixture.
    // Public hosts never auto-boot solely because release metadata is missing or stale;
    // they keep the install/import panel open until verified resources exist.
    options.startGame();
    panel.close();
  }

  return runtime;
}

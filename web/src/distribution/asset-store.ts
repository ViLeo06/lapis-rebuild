import {validateResourceManifest} from '../resource-manifest.ts';
import type {ResourceManifest,ResourceManifestEntry} from '../resource-manifest.ts';

export const DEFAULT_ASSET_DB_NAME='lapis-asset-store';
export const DEFAULT_ASSET_DB_VERSION=1;
export const DEFAULT_ASSET_BLOB_STORE='blobs';
export const DEFAULT_ASSET_MANIFEST_STORE='manifests';
export const DEFAULT_ASSET_INSTALL_STORE='installed';

const SHA256=/^[a-f0-9]{64}$/;

export type AssetInstallOperation='install'|'update'|'repair';

export type InstalledAssetSet={
  contentPack:string;
  version:string;
  manifest:ResourceManifest;
  installedAt:string;
  updatedAt:string;
  lastOperation:AssetInstallOperation;
  assetCount:number;
  totalBytes:number;
};

export type StoredAssetBlob={
  sha256:string;
  size:number;
  blob:Blob;
};

export type ResolvedAsset={
  entry:ResourceManifestEntry;
  blob:Blob;
};

export interface AssetStore{
  getInstalled(contentPack:string):Promise<InstalledAssetSet|undefined>;
  getManifest(contentPack:string,version:string):Promise<ResourceManifest|undefined>;
  getBlob(sha256:string):Promise<StoredAssetBlob|undefined>;
  getAsset(contentPack:string,path:string):Promise<ResolvedAsset|undefined>;
  putBlob(entry:ResourceManifestEntry,blob:Blob):Promise<void>;
  commit(manifest:ResourceManifest,operation:AssetInstallOperation,committedAt?:string):Promise<InstalledAssetSet>;
}

export interface AssetStoreDatabase{
  getInstalled(contentPack:string):Promise<InstalledAssetSet|undefined>;
  getManifest(contentPack:string,version:string):Promise<ResourceManifest|undefined>;
  getBlob(sha256:string):Promise<StoredAssetBlob|undefined>;
  putBlob(record:StoredAssetBlob):Promise<void>;
  commitInstall(manifest:ResourceManifest,install:InstalledAssetSet):Promise<void>;
  close():void;
}

export type AssetStoreDatabaseFactory=()=>Promise<AssetStoreDatabase>;

function clone<T>(value:T):T{
  return structuredClone(value);
}

function validToken(value:string,label:string):string{
  if(typeof value!=='string'||value.length<1||value.length>128||!/^[A-Za-z0-9._-]+$/.test(value)){
    throw new Error(`Invalid ${label}`);
  }
  return value;
}

function validSha(value:string):string{
  if(!SHA256.test(value))throw new Error('Invalid asset sha256');
  return value;
}

function manifestKey(contentPack:string,version:string):string{
  return `${validToken(contentPack,'contentPack')}@${validToken(version,'version')}`;
}

function isBlobRecord(value:unknown):value is StoredAssetBlob{
  if(!value||typeof value!=='object')return false;
  const record=value as Partial<StoredAssetBlob>;
  return typeof record.sha256==='string'&&SHA256.test(record.sha256)
    &&Number.isSafeInteger(record.size)&&Number(record.size)>=0
    &&record.blob instanceof Blob;
}

function validateInstall(raw:InstalledAssetSet):InstalledAssetSet{
  const manifest=validateResourceManifest(clone(raw.manifest));
  if(raw.contentPack!==manifest.contentPack||raw.version!==manifest.version){
    throw new Error('Installed asset metadata does not match manifest');
  }
  if(!Number.isSafeInteger(raw.assetCount)||raw.assetCount!==manifest.assets.length){
    throw new Error('Installed asset count does not match manifest');
  }
  const totalBytes=manifest.assets.reduce((sum,entry)=>sum+entry.size,0);
  if(raw.totalBytes!==totalBytes)throw new Error('Installed asset byte count does not match manifest');
  if(!Number.isFinite(Date.parse(raw.installedAt))||!Number.isFinite(Date.parse(raw.updatedAt))){
    throw new Error('Invalid asset install timestamp');
  }
  if(!['install','update','repair'].includes(raw.lastOperation)){
    throw new Error('Invalid asset install operation');
  }
  return clone({...raw,manifest});
}

export class AssetStoreAdapter implements AssetStore{
  private readonly openDatabase:AssetStoreDatabaseFactory;

  constructor(openDatabase:AssetStoreDatabaseFactory){
    this.openDatabase=openDatabase;
  }

  async getInstalled(contentPack:string):Promise<InstalledAssetSet|undefined>{
    const key=validToken(contentPack,'contentPack');
    const db=await this.openDatabase();
    try{
      const value=await db.getInstalled(key);
      return value===undefined?undefined:validateInstall(value);
    }finally{
      db.close();
    }
  }

  async getManifest(contentPack:string,version:string):Promise<ResourceManifest|undefined>{
    const pack=validToken(contentPack,'contentPack');
    const targetVersion=validToken(version,'version');
    const db=await this.openDatabase();
    try{
      const value=await db.getManifest(pack,targetVersion);
      return value===undefined?undefined:validateResourceManifest(clone(value));
    }finally{
      db.close();
    }
  }

  async getBlob(sha256:string):Promise<StoredAssetBlob|undefined>{
    const hash=validSha(sha256);
    const db=await this.openDatabase();
    try{
      const value=await db.getBlob(hash);
      if(value===undefined)return undefined;
      if(!isBlobRecord(value)||value.sha256!==hash||value.blob.size!==value.size){
        throw new Error(`Corrupt asset blob record: ${hash}`);
      }
      return clone(value);
    }finally{
      db.close();
    }
  }

  async getAsset(contentPack:string,path:string):Promise<ResolvedAsset|undefined>{
    const installed=await this.getInstalled(contentPack);
    if(!installed)return undefined;
    const entry=installed.manifest.assets.find(candidate=>candidate.path===path);
    if(!entry)return undefined;
    const record=await this.getBlob(entry.sha256);
    if(!record||record.size!==entry.size)return undefined;
    return{entry:clone(entry),blob:record.blob};
  }

  async putBlob(entry:ResourceManifestEntry,blob:Blob):Promise<void>{
    validSha(entry.sha256);
    if(!(blob instanceof Blob))throw new Error(`Asset is not a Blob: ${entry.path}`);
    if(blob.size!==entry.size)throw new Error(`Asset size mismatch: ${entry.path}`);
    const db=await this.openDatabase();
    try{
      await db.putBlob({sha256:entry.sha256,size:entry.size,blob});
    }finally{
      db.close();
    }
  }

  async commit(
    rawManifest:ResourceManifest,
    operation:AssetInstallOperation,
    committedAt=new Date().toISOString(),
  ):Promise<InstalledAssetSet>{
    const manifest=validateResourceManifest(clone(rawManifest));
    if(!Number.isFinite(Date.parse(committedAt)))throw new Error('Invalid asset commit timestamp');
    const existing=await this.getInstalled(manifest.contentPack);
    const install:InstalledAssetSet={
      contentPack:manifest.contentPack,
      version:manifest.version,
      manifest,
      installedAt:existing?.installedAt??committedAt,
      updatedAt:committedAt,
      lastOperation:operation,
      assetCount:manifest.assets.length,
      totalBytes:manifest.assets.reduce((sum,entry)=>sum+entry.size,0),
    };
    const db=await this.openDatabase();
    try{
      await db.commitInstall(manifest,install);
    }finally{
      db.close();
    }
    return validateInstall(install);
  }
}

class IndexedDbAssetStoreDatabase implements AssetStoreDatabase{
  constructor(
    private readonly db:IDBDatabase,
    private readonly blobStore:string,
    private readonly manifestStore:string,
    private readonly installStore:string,
  ){}

  private read(storeName:string,key:IDBValidKey):Promise<unknown>{
    return new Promise((resolve,reject)=>{
      let tx:IDBTransaction;
      try{
        tx=this.db.transaction(storeName,'readonly');
      }catch(error){
        reject(error);
        return;
      }
      const request=tx.objectStore(storeName).get(key);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error??new Error('IndexedDB asset read failed'));
      tx.onabort=()=>reject(tx.error??new Error('IndexedDB asset read transaction aborted'));
    });
  }

  async getInstalled(contentPack:string):Promise<InstalledAssetSet|undefined>{
    const value=await this.read(this.installStore,contentPack);
    return value as InstalledAssetSet|undefined;
  }

  async getManifest(contentPack:string,version:string):Promise<ResourceManifest|undefined>{
    const value=await this.read(this.manifestStore,manifestKey(contentPack,version));
    return value as ResourceManifest|undefined;
  }

  async getBlob(sha256:string):Promise<StoredAssetBlob|undefined>{
    const value=await this.read(this.blobStore,sha256);
    return value as StoredAssetBlob|undefined;
  }

  putBlob(record:StoredAssetBlob):Promise<void>{
    return new Promise((resolve,reject)=>{
      let tx:IDBTransaction;
      try{
        tx=this.db.transaction(this.blobStore,'readwrite');
        tx.objectStore(this.blobStore).put(record,record.sha256);
      }catch(error){
        reject(error);
        return;
      }
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error??new Error('IndexedDB asset write failed'));
      tx.onabort=()=>reject(tx.error??new Error('IndexedDB asset write transaction aborted'));
    });
  }

  commitInstall(manifest:ResourceManifest,install:InstalledAssetSet):Promise<void>{
    return new Promise((resolve,reject)=>{
      let tx:IDBTransaction;
      let failure:Error|undefined;
      try{
        tx=this.db.transaction(
          [this.blobStore,this.manifestStore,this.installStore],
          'readwrite',
        );
        const blobs=tx.objectStore(this.blobStore);
        for(const entry of manifest.assets){
          const request=blobs.get(entry.sha256);
          request.onsuccess=()=>{
            const record=request.result as StoredAssetBlob|undefined;
            if(!isBlobRecord(record)||record.sha256!==entry.sha256||record.size!==entry.size||record.blob.size!==entry.size){
              failure=new Error(`Missing staged asset: ${entry.path}`);
              try{tx.abort();}catch{}
            }
          };
          request.onerror=()=>{
            failure=request.error??new Error(`Failed to verify staged asset: ${entry.path}`);
            try{tx.abort();}catch{}
          };
        }
        tx.objectStore(this.manifestStore).put(clone(manifest),manifestKey(manifest.contentPack,manifest.version));
        tx.objectStore(this.installStore).put(clone(install),manifest.contentPack);
      }catch(error){
        reject(error);
        return;
      }
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(failure??tx.error??new Error('IndexedDB asset commit failed'));
      tx.onabort=()=>reject(failure??tx.error??new Error('IndexedDB asset commit aborted'));
    });
  }

  close():void{
    this.db.close();
  }
}

export type IndexedDbAssetStoreOptions={
  dbName?:string;
  dbVersion?:number;
  blobStore?:string;
  manifestStore?:string;
  installStore?:string;
};

function openIndexedDbDatabase(options:IndexedDbAssetStoreOptions):Promise<AssetStoreDatabase>{
  const dbName=options.dbName??DEFAULT_ASSET_DB_NAME;
  const dbVersion=options.dbVersion??DEFAULT_ASSET_DB_VERSION;
  const blobStore=options.blobStore??DEFAULT_ASSET_BLOB_STORE;
  const manifestStore=options.manifestStore??DEFAULT_ASSET_MANIFEST_STORE;
  const installStore=options.installStore??DEFAULT_ASSET_INSTALL_STORE;
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(dbName,dbVersion);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(blobStore))request.result.createObjectStore(blobStore);
      if(!request.result.objectStoreNames.contains(manifestStore))request.result.createObjectStore(manifestStore);
      if(!request.result.objectStoreNames.contains(installStore))request.result.createObjectStore(installStore);
    };
    request.onsuccess=()=>resolve(new IndexedDbAssetStoreDatabase(
      request.result,
      blobStore,
      manifestStore,
      installStore,
    ));
    request.onerror=()=>reject(request.error??new Error('IndexedDB asset store open failed'));
    request.onblocked=()=>reject(new Error('IndexedDB asset store open blocked'));
  });
}

export class IndexedDbAssetStore extends AssetStoreAdapter{
  constructor(options:IndexedDbAssetStoreOptions={}){
    super(()=>openIndexedDbDatabase(options));
  }
}

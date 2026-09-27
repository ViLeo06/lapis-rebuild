import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {ResourceManifest,ResourceManifestEntry} from '../src/resource-manifest.ts';
import {
  AssetStoreAdapter,
  type AssetStoreDatabase,
  type InstalledAssetSet,
  type StoredAssetBlob,
} from '../src/distribution/asset-store.ts';
import {
  auditInstalledAssets,
  repairAssets,
  sha256Blob,
  updateAssets,
  type AssetFetcher,
  type UpdateProgress,
} from '../src/distribution/update-engine.ts';

const PACK='m8-1-test-pack';

class MemoryAssetDatabase implements AssetStoreDatabase{
  readonly blobs=new Map<string,StoredAssetBlob>();
  readonly manifests=new Map<string,ResourceManifest>();
  readonly installs=new Map<string,InstalledAssetSet>();
  failNextPutBlob=false;
  failNextCommit=false;

  async getInstalled(contentPack:string):Promise<InstalledAssetSet|undefined>{
    const value=this.installs.get(contentPack);
    return value===undefined?undefined:structuredClone(value);
  }

  async getManifest(contentPack:string,version:string):Promise<ResourceManifest|undefined>{
    const value=this.manifests.get(`${contentPack}@${version}`);
    return value===undefined?undefined:structuredClone(value);
  }

  async getBlob(sha256:string):Promise<StoredAssetBlob|undefined>{
    const value=this.blobs.get(sha256);
    return value===undefined?undefined:structuredClone(value);
  }

  async putBlob(record:StoredAssetBlob):Promise<void>{
    if(this.failNextPutBlob){
      this.failNextPutBlob=false;
      throw new Error('simulated asset storage failure');
    }
    this.blobs.set(record.sha256,structuredClone(record));
  }

  async commitInstall(manifest:ResourceManifest,install:InstalledAssetSet):Promise<void>{
    if(this.failNextCommit){
      this.failNextCommit=false;
      throw new Error('simulated atomic commit failure');
    }
    for(const entry of manifest.assets){
      const record=this.blobs.get(entry.sha256);
      if(!record||record.size!==entry.size||record.blob.size!==entry.size){
        throw new Error(`Missing staged asset: ${entry.path}`);
      }
    }
    this.manifests.set(`${manifest.contentPack}@${manifest.version}`,structuredClone(manifest));
    this.installs.set(manifest.contentPack,structuredClone(install));
  }

  close():void{}
}

type Fixture={
  manifest:ResourceManifest;
  blobs:Map<string,Blob>;
};

async function fixture(
  version:string,
  count:number,
  changed=new Set<number>(),
):Promise<Fixture>{
  const assets:ResourceManifestEntry[]=[];
  const blobs=new Map<string,Blob>();
  for(let index=0;index<count;index+=1){
    const path=`assets/asset-${String(index).padStart(3,'0')}.bin`;
    const body=changed.has(index)?`changed-${version}-${index}`:`stable-${index}`;
    const blob=new Blob([body],{type:'application/octet-stream'});
    const sha256=await sha256Blob(blob);
    assets.push({
      assetId:`asset-${index}`,
      path,
      contentPack:PACK,
      size:blob.size,
      sha256,
      mediaType:'application/octet-stream',
      version,
    });
    blobs.set(path,blob);
  }
  return{manifest:{schema:1,contentPack:PACK,version,assets},blobs};
}

function setup(database=new MemoryAssetDatabase()){
  return{database,store:new AssetStoreAdapter(async()=>database)};
}

async function installFixture(
  store:AssetStoreAdapter,
  target:Fixture,
  committedAt='2026-09-27T00:00:00Z',
):Promise<void>{
  for(const entry of target.manifest.assets){
    const blob=target.blobs.get(entry.path);
    assert.ok(blob);
    await store.putBlob(entry,blob);
  }
  await store.commit(target.manifest,'install',committedAt);
}

function fetcher(target:Fixture,calls:string[]):AssetFetcher{
  return async entry=>{
    calls.push(entry.path);
    const blob=target.blobs.get(entry.path);
    if(!blob)throw new Error(`fixture missing: ${entry.path}`);
    return blob;
  };
}

async function wrongSameSize(blob:Blob):Promise<Blob>{
  const bytes=new Uint8Array(await blob.arrayBuffer());
  if(bytes.length===0)return new Blob([new Uint8Array([1])]);
  bytes[0]^=1;
  return new Blob([bytes],{type:blob.type});
}

test('V1 -> V2 fetches only 3 changed + 2 new assets while 95 remain unchanged',async()=>{
  const oldPack=await fixture('v1',98);
  const target=await fixture('v2',100,new Set([0,1,2]));
  const{store}=setup();
  await installFixture(store,oldPack);

  const calls:string[]=[];
  const progress:UpdateProgress[]=[];
  const result=await updateAssets({
    store,
    targetManifest:target.manifest,
    fetchAsset:fetcher(target,calls),
    onProgress:value=>progress.push(value),
    committedAt:'2026-09-27T01:00:00Z',
  });

  assert.equal(result.diff.unchanged.length,95);
  assert.equal(result.diff.changed.length,3);
  assert.equal(result.diff.newAssets.length,2);
  assert.equal(result.diff.removed.length,0);
  assert.equal(result.fetchedAssets,5);
  assert.equal(calls.length,5);
  assert.deepEqual(new Set(calls),new Set([
    target.manifest.assets[0].path,
    target.manifest.assets[1].path,
    target.manifest.assets[2].path,
    target.manifest.assets[98].path,
    target.manifest.assets[99].path,
  ]));
  assert.equal((await store.getInstalled(PACK))?.version,'v2');
  assert.equal(progress.at(-1)?.status,'complete');
  assert.equal(progress.at(-1)?.downloadedBytes,progress.at(-1)?.totalBytes);
});

test('removed assets are retired by the active manifest without refetching unchanged data',async()=>{
  const oldPack=await fixture('v1',3);
  const target=await fixture('v2',2);
  const{store}=setup();
  await installFixture(store,oldPack);

  const calls:string[]=[];
  const result=await updateAssets({
    store,
    targetManifest:target.manifest,
    fetchAsset:fetcher(target,calls),
    committedAt:'2026-09-27T01:00:00Z',
  });

  assert.equal(result.diff.unchanged.length,2);
  assert.equal(result.diff.removed.length,1);
  assert.equal(calls.length,0);
  assert.equal(await store.getAsset(PACK,oldPack.manifest.assets[2].path),undefined);
  assert.ok(await store.getAsset(PACK,target.manifest.assets[0].path));
});

test('network failure during staged update leaves V1 active and reports failed progress',async()=>{
  const oldPack=await fixture('v1',2);
  const target=await fixture('v2',2,new Set([0,1]));
  const{store}=setup();
  await installFixture(store,oldPack);
  const events:UpdateProgress[]=[];
  let requests=0;

  await assert.rejects(updateAssets({
    store,
    targetManifest:target.manifest,
    fetchAsset:async entry=>{
      requests+=1;
      if(requests===2)throw new Error('simulated network failure');
      return target.blobs.get(entry.path)!;
    },
    onProgress:value=>events.push(value),
  }),/simulated network failure/);

  assert.equal((await store.getInstalled(PACK))?.version,'v1');
  assert.equal(events.at(-1)?.status,'failed');
  assert.match(events.at(-1)?.failure??'',/network failure/);
  assert.ok(await store.getAsset(PACK,oldPack.manifest.assets[0].path));
});

test('SHA mismatch is rejected before commit and preserves V1',async()=>{
  const oldPack=await fixture('v1',1);
  const target=await fixture('v2',1,new Set([0]));
  const{store}=setup();
  await installFixture(store,oldPack);
  const correct=target.blobs.get(target.manifest.assets[0].path)!;
  const wrong=await wrongSameSize(correct);

  await assert.rejects(updateAssets({
    store,
    targetManifest:target.manifest,
    fetchAsset:async()=>wrong,
  }),/SHA-256 mismatch/);

  assert.equal((await store.getInstalled(PACK))?.version,'v1');
});

test('partial/size mismatch is rejected before commit and preserves V1',async()=>{
  const oldPack=await fixture('v1',1);
  const target=await fixture('v2',1,new Set([0]));
  const{store}=setup();
  await installFixture(store,oldPack);

  await assert.rejects(updateAssets({
    store,
    targetManifest:target.manifest,
    fetchAsset:async()=>new Blob([]),
  }),/size mismatch/);

  assert.equal((await store.getInstalled(PACK))?.version,'v1');
});

test('storage failure while staging leaves V1 active',async()=>{
  const oldPack=await fixture('v1',1);
  const target=await fixture('v2',1,new Set([0]));
  const{database,store}=setup();
  await installFixture(store,oldPack);
  database.failNextPutBlob=true;

  await assert.rejects(updateAssets({
    store,
    targetManifest:target.manifest,
    fetchAsset:fetcher(target,[]),
  }),/storage failure/);

  assert.equal((await store.getInstalled(PACK))?.version,'v1');
});

test('final commit failure is atomic and leaves V1 active',async()=>{
  const oldPack=await fixture('v1',1);
  const target=await fixture('v2',1,new Set([0]));
  const{database,store}=setup();
  await installFixture(store,oldPack);
  database.failNextCommit=true;

  await assert.rejects(updateAssets({
    store,
    targetManifest:target.manifest,
    fetchAsset:fetcher(target,[]),
  }),/atomic commit failure/);

  assert.equal((await store.getInstalled(PACK))?.version,'v1');
  assert.ok(await store.getAsset(PACK,oldPack.manifest.assets[0].path));
});

test('repair fetches only missing and corrupt assets',async()=>{
  const pack=await fixture('v1',4);
  const{database,store}=setup();
  await installFixture(store,pack);
  const missing=pack.manifest.assets[0];
  const corrupt=pack.manifest.assets[1];
  database.blobs.delete(missing.sha256);
  const corruptRecord=database.blobs.get(corrupt.sha256)!;
  corruptRecord.blob=await wrongSameSize(corruptRecord.blob);
  database.blobs.set(corrupt.sha256,corruptRecord);

  const audit=await auditInstalledAssets(store,PACK);
  assert.deepEqual(audit.missing.map(entry=>entry.path),[missing.path]);
  assert.deepEqual(audit.corrupt.map(entry=>entry.path),[corrupt.path]);
  assert.equal(audit.healthy.length,2);

  const calls:string[]=[];
  const result=await repairAssets({
    store,
    contentPack:PACK,
    fetchAsset:fetcher(pack,calls),
    committedAt:'2026-09-27T02:00:00Z',
  });

  assert.equal(result.fetchedAssets,2);
  assert.deepEqual(new Set(calls),new Set([missing.path,corrupt.path]));
  const after=await auditInstalledAssets(store,PACK);
  assert.equal(after.missing.length,0);
  assert.equal(after.corrupt.length,0);
  assert.equal(after.healthy.length,4);
  assert.equal((await store.getInstalled(PACK))?.lastOperation,'repair');
});

test('installed metadata and blobs survive a fresh AssetStore adapter instance',async()=>{
  const pack=await fixture('v1',2);
  const database=new MemoryAssetDatabase();
  const first=setup(database).store;
  await installFixture(first,pack);
  const second=setup(database).store;

  const installed=await second.getInstalled(PACK);
  assert.equal(installed?.version,'v1');
  assert.equal(installed?.assetCount,2);
  const asset=await second.getAsset(PACK,pack.manifest.assets[1].path);
  assert.ok(asset);
  assert.equal(await asset.blob.text(),'stable-1');
});

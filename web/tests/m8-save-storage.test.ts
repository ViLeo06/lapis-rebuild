import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInventory} from '../src/progression/inventory.ts';
import {initialProgression} from '../src/progression/progression.ts';
import {SAVE_KIND} from '../src/progression/save-schema.ts';
import type {SaveV2} from '../src/progression/save-schema.ts';
import {CorruptSaveError,SaveStoreAdapter} from '../src/storage/save-store.ts';
import type {SaveStoreDatabase} from '../src/storage/save-store.ts';

function fixture(gold=15):SaveV2{
  return{
    kind:SAVE_KIND,
    version:2,
    pack:'m8-test-pack',
    character:'100',
    mapId:0,
    x:32,
    y:64,
    gold,
    inventory:createInventory(),
    quest:{guide:'complete'},
    questFlags:{'m8.fixture':true},
    progression:initialProgression(),
    rewardReceipts:[],
    savedAt:'2026-09-25T00:00:00Z',
  };
}

class MemorySaveDatabase implements SaveStoreDatabase{
  readonly values=new Map<string,unknown>();
  failNextPut=false;

  async get(slot:string):Promise<unknown>{
    const value=this.values.get(slot);
    return value===undefined?undefined:structuredClone(value);
  }

  async put(slot:string,value:SaveV2):Promise<void>{
    if(this.failNextPut){
      this.failNextPut=false;
      throw new Error('simulated transaction failure');
    }
    this.values.set(slot,structuredClone(value));
  }

  async delete(slot:string):Promise<void>{this.values.delete(slot);}
  close():void{}
}

function setup(){
  const database=new MemorySaveDatabase();
  const store=new SaveStoreAdapter(async()=>database);
  return{database,store};
}

test('SaveStore save/load round trip returns an isolated SaveV2 copy',async()=>{
  const{store}=setup();
  const original=fixture();
  await store.save('manual',original);
  original.gold=999;
  const loaded=await store.load('manual');
  assert.ok(loaded);
  assert.equal(loaded.gold,15);
  assert.equal(await store.exists('manual'),true);
  loaded.gold=123;
  assert.equal((await store.load('manual'))?.gold,15);
});

test('SaveStore overwrite replaces one slot without creating duplicate state',async()=>{
  const{database,store}=setup();
  await store.save('manual',fixture(10));
  await store.save('manual',fixture(20));
  assert.equal(database.values.size,1);
  assert.equal((await store.load('manual'))?.gold,20);
});

test('SaveStore missing slot and delete are idempotent',async()=>{
  const{store}=setup();
  assert.equal(await store.load('missing'),undefined);
  assert.equal(await store.exists('missing'),false);
  await store.delete('missing');
  await store.save('manual',fixture());
  await store.delete('manual');
  assert.equal(await store.exists('manual'),false);
});

test('SaveStore rejects corrupt persisted values instead of returning them as SaveV2',async()=>{
  const{database,store}=setup();
  database.values.set('corrupt',{kind:SAVE_KIND,version:2,pack:'m8-test-pack'});
  assert.equal(await store.exists('corrupt'),true);
  await assert.rejects(store.load('corrupt'),CorruptSaveError);
});

test('failed replacement preserves the previously committed valid save',async()=>{
  const{database,store}=setup();
  await store.save('manual',fixture(10));
  database.failNextPut=true;
  await assert.rejects(store.save('manual',fixture(99)),/simulated transaction failure/);
  assert.equal((await store.load('manual'))?.gold,10);
});

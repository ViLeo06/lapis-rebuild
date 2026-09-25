import {CURRENT_SAVE_VERSION,SAVE_KIND} from '../progression/save-schema.ts';
import type {SaveV2} from '../progression/save-schema.ts';

export const DEFAULT_SAVE_DB_NAME='lapis-web-lab';
export const DEFAULT_SAVE_STORE_NAME='saves';
export const DEFAULT_SAVE_DB_VERSION=1;

export class CorruptSaveError extends Error{
  constructor(message='Corrupt SaveV2 value'){
    super(message);
    this.name='CorruptSaveError';
  }
}

export interface SaveStore{
  save(slot:string,save:SaveV2):Promise<void>;
  load(slot:string):Promise<SaveV2|undefined>;
  exists(slot:string):Promise<boolean>;
  delete(slot:string):Promise<void>;
}

export interface SaveStoreDatabase{
  get(slot:string):Promise<unknown>;
  put(slot:string,value:SaveV2):Promise<void>;
  delete(slot:string):Promise<void>;
  close():void;
}

export type SaveStoreDatabaseFactory=()=>Promise<SaveStoreDatabase>;

function validSlot(slot:string):string{
  if(typeof slot!=='string'||slot.length<1||slot.length>128||!/^[A-Za-z0-9._:-]+$/.test(slot))throw new Error('Invalid save slot');
  return slot;
}

function record(value:unknown):value is Record<string,unknown>{
  return !!value&&typeof value==='object'&&!Array.isArray(value);
}

function cloneSave(value:SaveV2):SaveV2{
  try{return structuredClone(value);}
  catch{throw new CorruptSaveError('SaveV2 value is not structured-cloneable');}
}

export function validateStoredSaveV2(raw:unknown):SaveV2{
  if(!record(raw))throw new CorruptSaveError();
  if(raw.kind!==SAVE_KIND||raw.version!==CURRENT_SAVE_VERSION)throw new CorruptSaveError('Stored value is not SaveV2');
  if(typeof raw.pack!=='string'||!raw.pack||typeof raw.character!=='string'||!raw.character)throw new CorruptSaveError('Stored SaveV2 identity is invalid');
  if(typeof raw.mapId!=='number'||!Number.isInteger(raw.mapId)||raw.mapId<0||typeof raw.x!=='number'||!Number.isFinite(raw.x)||typeof raw.y!=='number'||!Number.isFinite(raw.y))throw new CorruptSaveError('Stored SaveV2 position is invalid');
  if(typeof raw.gold!=='number'||!Number.isInteger(raw.gold)||raw.gold<0)throw new CorruptSaveError('Stored SaveV2 gold is invalid');
  if(!record(raw.inventory)||!record(raw.questFlags)||!record(raw.progression)||!Array.isArray(raw.rewardReceipts))throw new CorruptSaveError('Stored SaveV2 payload is incomplete');
  if(typeof raw.savedAt!=='string'||!Number.isFinite(Date.parse(raw.savedAt)))throw new CorruptSaveError('Stored SaveV2 timestamp is invalid');
  return cloneSave(raw as unknown as SaveV2);
}

export class SaveStoreAdapter implements SaveStore{
  constructor(private readonly openDatabase:SaveStoreDatabaseFactory){}

  async save(slot:string,save:SaveV2):Promise<void>{
    const key=validSlot(slot);
    const value=validateStoredSaveV2(save);
    const db=await this.openDatabase();
    try{await db.put(key,value);}
    finally{db.close();}
  }

  async load(slot:string):Promise<SaveV2|undefined>{
    const raw=await this.loadRaw(slot);
    return raw===undefined?undefined:validateStoredSaveV2(raw);
  }

  async loadRaw(slot:string):Promise<unknown>{
    const key=validSlot(slot);
    const db=await this.openDatabase();
    try{return await db.get(key);}
    finally{db.close();}
  }

  async exists(slot:string):Promise<boolean>{
    return (await this.loadRaw(slot))!==undefined;
  }

  async delete(slot:string):Promise<void>{
    const key=validSlot(slot);
    const db=await this.openDatabase();
    try{await db.delete(key);}
    finally{db.close();}
  }
}

class IndexedDbDatabase implements SaveStoreDatabase{
  constructor(private readonly db:IDBDatabase,private readonly storeName:string){}

  get(slot:string):Promise<unknown>{
    return new Promise((resolve,reject)=>{
      let tx:IDBTransaction;
      try{tx=this.db.transaction(this.storeName,'readonly');}
      catch(error){reject(error);return;}
      const request=tx.objectStore(this.storeName).get(slot);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error??new Error('IndexedDB read failed'));
      tx.onabort=()=>reject(tx.error??new Error('IndexedDB read transaction aborted'));
    });
  }

  put(slot:string,value:SaveV2):Promise<void>{
    return new Promise((resolve,reject)=>{
      let tx:IDBTransaction;
      try{
        tx=this.db.transaction(this.storeName,'readwrite');
        tx.objectStore(this.storeName).put(value,slot);
      }catch(error){
        reject(error);
        return;
      }
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error??new Error('IndexedDB write failed'));
      tx.onabort=()=>reject(tx.error??new Error('IndexedDB write transaction aborted'));
    });
  }

  delete(slot:string):Promise<void>{
    return new Promise((resolve,reject)=>{
      let tx:IDBTransaction;
      try{
        tx=this.db.transaction(this.storeName,'readwrite');
        tx.objectStore(this.storeName).delete(slot);
      }catch(error){
        reject(error);
        return;
      }
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error??new Error('IndexedDB delete failed'));
      tx.onabort=()=>reject(tx.error??new Error('IndexedDB delete transaction aborted'));
    });
  }

  close():void{this.db.close();}
}

export type IndexedDbSaveStoreOptions={
  dbName?:string;
  storeName?:string;
  dbVersion?:number;
};

function openIndexedDbDatabase(options:IndexedDbSaveStoreOptions):Promise<SaveStoreDatabase>{
  const dbName=options.dbName??DEFAULT_SAVE_DB_NAME;
  const storeName=options.storeName??DEFAULT_SAVE_STORE_NAME;
  const dbVersion=options.dbVersion??DEFAULT_SAVE_DB_VERSION;
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(dbName,dbVersion);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(storeName))request.result.createObjectStore(storeName);
    };
    request.onsuccess=()=>resolve(new IndexedDbDatabase(request.result,storeName));
    request.onerror=()=>reject(request.error??new Error('IndexedDB open failed'));
    request.onblocked=()=>reject(new Error('IndexedDB open blocked'));
  });
}

export class IndexedDbSaveStore extends SaveStoreAdapter{
  constructor(options:IndexedDbSaveStoreOptions={}){
    super(()=>openIndexedDbDatabase(options));
  }
}

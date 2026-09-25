import type {SaveV2} from './progression/save-schema.ts';
import {IndexedDbSaveStore,validateStoredSaveV2} from './storage/save-store.ts';

const SAVE_KEY='manual';
const store=new IndexedDbSaveStore();

export async function writeM4Save(save:unknown):Promise<void>{
  await store.save(SAVE_KEY,validateStoredSaveV2(save) as SaveV2);
}

export async function readM4Save():Promise<unknown>{
  // Keep the raw-read migration bridge so pre-SaveV2 records in the existing
  // lapis-web-lab/saves/manual slot can still flow through migrateSaveToM7.
  return store.loadRaw(SAVE_KEY);
}

const DB_NAME='lapis-web-lab';
const STORE_NAME='saves';
const SAVE_KEY='manual';

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(STORE_NAME))request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}

export async function writeM4Save(save:unknown):Promise<void>{
  const db=await openDb();
  try{
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction(STORE_NAME,'readwrite');
      tx.objectStore(STORE_NAME).put(save,SAVE_KEY);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  }finally{db.close();}
}

export async function readM4Save():Promise<unknown>{
  const db=await openDb();
  try{
    return await new Promise((resolve,reject)=>{
      const request=db.transaction(STORE_NAME,'readonly').objectStore(STORE_NAME).get(SAVE_KEY);
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }finally{db.close();}
}

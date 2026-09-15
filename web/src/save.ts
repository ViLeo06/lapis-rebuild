export type Save = { version:1; pack:string; character:string; x:number;y:number; gold:number; savedAt:string };
export function validateSave(raw:unknown,pack:string,ids:string[],width:number,height:number):Save {
  if(!raw||typeof raw!=='object')throw new Error('Invalid save');const s=raw as Save;
  if(s.version!==1||s.pack!==pack||!ids.includes(s.character))throw new Error('Save version or resource pack mismatch');
  if(!Number.isFinite(s.x)||!Number.isFinite(s.y)||s.x<0||s.y<0||s.x>width||s.y>height||!Number.isInteger(s.gold)||s.gold<0||s.gold>1000000)throw new Error('Invalid save coordinates or reward');
  if(typeof s.savedAt!=='string'||!Number.isFinite(Date.parse(s.savedAt)))throw new Error('Invalid save timestamp');return s;
}
function openDb():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open('lapis-web-lab',1);r.onupgradeneeded=()=>r.result.createObjectStore('saves');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function writeSave(save:Save):Promise<void>{const db=await openDb();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(save,'manual');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
export async function readSave():Promise<unknown>{const db=await openDb();try{return await new Promise((resolve,reject)=>{const r=db.transaction('saves','readonly').objectStore('saves').get('manual');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}

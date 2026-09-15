import catalogData from '../../data/items/training-catalog.json' with { type: 'json' };
export type Inventory = { owned: number[]; weapon: number | null; armor: number | null };
export const CATALOG = catalogData.items;
export const roleFor = (character: string) => Number(character)%10===9?'wizard':'swordsman';
export function initialInventory(): Inventory { return {owned:CATALOG.map(i=>i.item_id),weapon:null,armor:null}; }
export function validateInventory(raw: unknown, character: string): Inventory {
 if(!raw||typeof raw!=='object')throw new Error('Invalid inventory');const inv=raw as Inventory;
 if(!Array.isArray(inv.owned)||inv.owned.length>32||new Set(inv.owned).size!==inv.owned.length||!inv.owned.every(id=>Number.isInteger(id)&&CATALOG.some(i=>i.item_id===id)))throw new Error('Invalid owned items');
 for(const slot of ['weapon','armor'] as const){const id=inv[slot];if(id===null)continue;const item=CATALOG.find(i=>i.item_id===id);if(!item||!inv.owned.includes(id)||item.training.slot!==slot||item.training.role!==roleFor(character))throw new Error('Invalid equipped item');}
 return {owned:[...inv.owned],weapon:inv.weapon,armor:inv.armor};
}
export function equip(inv:Inventory,id:number|null,slot:'weapon'|'armor',character:string):Inventory {
 return validateInventory({...inv,[slot]:id},character);
}
export function changeRole(inv:Inventory,character:string):Inventory {
 const result={...inv,owned:[...inv.owned]};for(const slot of ['weapon','armor'] as const)if(CATALOG.find(i=>i.item_id===result[slot])?.training.role!==roleFor(character))result[slot]=null;
 return validateInventory(result,character);
}
export function equipmentBonus(inv:Inventory,character:string):{attack:number;defense:number} {
 const valid=validateInventory(inv,character);let attack=0,defense=0;
 for(const id of [valid.weapon,valid.armor]){const p=CATALOG.find(i=>i.item_id===id)?.training;if(p){attack+=p.attack_bonus;defense+=p.defense_bonus;}}
 return {attack,defense};
}

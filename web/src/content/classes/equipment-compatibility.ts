import catalogData from '../../../../data/items/training-catalog.json' with { type: 'json' };
import type {ClassFamily, EquipmentCompatibility, EquipmentSelection, EquipmentSlot} from '../content-types.ts';

const POLICY_EVIDENCE=Object.freeze({
  level:'RECONSTRUCTION_POLICY',
  source:'data/items/training-catalog.json training.role/training.slot',
  note:'Item rows and names come from retail itemtbl.atr, but the current swordsman/wizard compatibility assignment is an explicit offline training policy.',
} as const);

const ITEMS=catalogData.items;

function buildCompatibility(family:ClassFamily):EquipmentCompatibility {
  const ids=(slot:EquipmentSlot)=>Object.freeze(ITEMS.filter(item=>item.training.role===family&&item.training.slot===slot).map(item=>item.item_id));
  return Object.freeze({weapon:ids('weapon'),armor:ids('armor'),provenance:POLICY_EVIDENCE});
}

export const EQUIPMENT_COMPATIBILITY: Readonly<Record<ClassFamily, EquipmentCompatibility>> = Object.freeze({
  swordsman:buildCompatibility('swordsman'),
  wizard:buildCompatibility('wizard'),
});

export function equipmentCompatibilityForFamily(family:ClassFamily):EquipmentCompatibility {
  return EQUIPMENT_COMPATIBILITY[family];
}

export function isEquipmentCompatible(family:ClassFamily,itemId:number,slot?:EquipmentSlot):boolean {
  if(!Number.isInteger(itemId))return false;
  const item=ITEMS.find(candidate=>candidate.item_id===itemId);
  if(!item || item.training.role!==family)return false;
  if(slot!==undefined && item.training.slot!==slot)return false;
  return true;
}

export function reconcileEquipmentForFamily(selection:EquipmentSelection,family:ClassFamily):EquipmentSelection {
  return Object.freeze({
    weapon:selection.weapon!==null&&isEquipmentCompatible(family,selection.weapon,'weapon')?selection.weapon:null,
    armor:selection.armor!==null&&isEquipmentCompatible(family,selection.armor,'armor')?selection.armor:null,
  });
}

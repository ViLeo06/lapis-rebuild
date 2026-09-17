import type {EquipmentSelection, EquipmentSlot, PlayableClassDefinition} from '../content-types.ts';
import {skillById} from '../skills/skill-catalog.ts';
import {isEquipmentCompatible,reconcileEquipmentForFamily} from './equipment-compatibility.ts';
import {SWORDSMAN} from './swordsman.ts';
import {WIZARD} from './wizard.ts';

const definitions=[SWORDSMAN,WIZARD] as const;

export const CLASS_CATALOG:Readonly<Record<number,PlayableClassDefinition>>=Object.freeze(
  Object.fromEntries(definitions.map(definition=>[definition.classId,definition])) as Record<number,PlayableClassDefinition>,
);

export function playableClassById(classId:string|number):PlayableClassDefinition {
  const id=Number(classId);
  if(!Number.isInteger(id))throw new Error('Invalid playable class id');
  const definition=CLASS_CATALOG[id];
  if(!definition)throw new Error(`Unsupported playable class ${id}`);
  return definition;
}

export function skillAvailableForClass(classId:string|number,skillId:number):boolean {
  const definition=playableClassById(classId);
  const skill=skillById(skillId);
  return skill.family===definition.family&&definition.availableSkillIds.includes(skillId);
}

export function isEquipmentCompatibleWithClass(classId:string|number,itemId:number,slot?:EquipmentSlot):boolean {
  return isEquipmentCompatible(playableClassById(classId).family,itemId,slot);
}

export function reconcileEquipmentForClass(selection:EquipmentSelection,classId:string|number):EquipmentSelection {
  return reconcileEquipmentForFamily(selection,playableClassById(classId).family);
}

export function serializableClassSnapshot():readonly PlayableClassDefinition[] {
  return definitions;
}

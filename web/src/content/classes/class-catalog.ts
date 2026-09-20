import swordsmanRows from '../../../../data/classes/swordsman.json' with { type: 'json' };
import wizardRows from '../../../../data/classes/wizard.json' with { type: 'json' };
import type {EquipmentSelection,EquipmentSlot,PlayableClassDefinition} from '../content-types.ts';
import {skillById} from '../skills/skill-catalog.ts';
import {isEquipmentCompatible,reconcileEquipmentForFamily} from './equipment-compatibility.ts';
import {buildPlayableClass} from './class-helpers.ts';
import {SWORDSMAN} from './swordsman.ts';
import {WIZARD} from './wizard.ts';
import {availableSwordsmanSkillIds,SWORDSMAN_STAGE_IDS} from '../../classes/swordsman-ten-stage.ts';
import {availableWizardSkillIds,WIZARD_STAGE_IDS} from '../../classes/wizard-ten-stage.ts';

type AuthoredRow=(typeof swordsmanRows)[number];

function stagedDefinitions():PlayableClassDefinition[]{
  const swordById=new Map((swordsmanRows as AuthoredRow[]).map(row=>[row.class_id,row]));
  const wizardById=new Map((wizardRows as AuthoredRow[]).map(row=>[row.class_id,row]));
  const out:PlayableClassDefinition[]=[SWORDSMAN,WIZARD];
  for(const id of SWORDSMAN_STAGE_IDS){
    if(id===100)continue;
    const row=swordById.get(id);
    if(!row)throw new Error(`Missing swordsman class row ${id}`);
    out.push(buildPlayableClass(row,'swordsman',availableSwordsmanSkillIds(id)));
  }
  for(const id of WIZARD_STAGE_IDS){
    if(id===109)continue;
    const row=wizardById.get(id);
    if(!row)throw new Error(`Missing wizard class row ${id}`);
    out.push(buildPlayableClass(row,'wizard',availableWizardSkillIds(id)));
  }
  return out;
}

const definitions=stagedDefinitions();

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

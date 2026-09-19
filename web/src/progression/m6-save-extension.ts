import {classFamilyForCharacter} from './equipment.ts';
import {validateM6EquipmentLoadoutShape} from './m6-equipment.ts';
import type {M6EquipmentLoadout} from './m6-equipment.ts';
import {validateM6StageProgressionState} from './m6-stage-promotion.ts';
import type {M6StageProgressionState} from './m6-stage-promotion.ts';
import {validateM6QuestChainState} from '../world/m6-quest-chain.ts';
import type {M6QuestChainState} from '../world/m6-quest-chain.ts';
import type {ClassFamily} from './inventory.ts';

export type M6SaveExtension={
  schema:1;
  family:ClassFamily;
  stage:M6StageProgressionState;
  questChain:M6QuestChainState;
  equipment:M6EquipmentLoadout;
  provenance:'RECONSTRUCTION_POLICY';
};

const fields=new Set(['schema','family','stage','questChain','equipment','provenance']);

export function validateM6SaveExtension(raw:unknown,characterId:string):M6SaveExtension{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid M6 save extension');
  const value=raw as Record<string,unknown>;
  const keys=Object.keys(value);
  if(keys.length!==fields.size||keys.some(key=>!fields.has(key)))throw new Error('Unknown M6 save extension field');
  if(value.schema!==1||!['swordsman','wizard'].includes(String(value.family))||value.provenance!=='RECONSTRUCTION_POLICY')throw new Error('Unsupported M6 save extension');
  const family=value.family as ClassFamily;
  const characterFamily=classFamilyForCharacter(characterId);
  if(characterFamily!==family)throw new Error('M6 save family does not match character');
  const stage=validateM6StageProgressionState(value.stage);
  if(stage.family!==family||classFamilyForCharacter(String(stage.stageId))!==family)throw new Error('M6 save stage family mismatch');
  const questChain=validateM6QuestChainState(value.questChain);
  const equipment=validateM6EquipmentLoadoutShape(value.equipment);
  return{
    schema:1,
    family,
    stage,
    questChain,
    equipment,
    provenance:'RECONSTRUCTION_POLICY',
  };
}

export function createM6SaveExtension(
  characterId:string,
  input:{stage:M6StageProgressionState;questChain:M6QuestChainState;equipment:M6EquipmentLoadout},
):M6SaveExtension{
  const family=classFamilyForCharacter(characterId);
  if(!family)throw new Error('Unsupported M6 save character');
  return validateM6SaveExtension({
    schema:1,
    family,
    stage:input.stage,
    questChain:input.questChain,
    equipment:input.equipment,
    provenance:'RECONSTRUCTION_POLICY',
  },characterId);
}

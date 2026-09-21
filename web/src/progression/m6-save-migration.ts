import {classFamilyForCharacter} from './equipment.ts';
import {validateM6EquipmentLoadout} from './m6-equipment.ts';
import type {M6EquipmentRule} from './m6-equipment.ts';
import {createM6SaveExtension,validateM6SaveExtension} from './m6-save-extension.ts';
import type {M6SaveExtension} from './m6-save-extension.ts';
import {createM6StageProgression,validateM6StageProgressionState,validateM6StageTrack} from './m6-stage-promotion.ts';
import type {M6StageTrack} from './m6-stage-promotion.ts';
import {migrateSave} from './save-migration.ts';
import {serializeSaveV2,validateSaveV2} from './save-schema.ts';
import type {SaveV2,SaveValidationContext} from './save-schema.ts';
import {createM6QuestChainState,validateM6QuestChainDefinition,validateM6QuestChainStateForDefinition} from '../world/m6-quest-chain.ts';
import type {M6QuestChainDefinition} from '../world/m6-quest-chain.ts';

export type M6SaveContentContext={
  stageTracks:readonly M6StageTrack[];
  questChain:M6QuestChainDefinition;
  equipmentRules:readonly M6EquipmentRule[];
};

export type M6SaveV2=SaveV2&{m6:M6SaveExtension};

function stageTrackForCharacter(
  characterId:string,
  tracks:readonly M6StageTrack[],
):M6StageTrack{
  const family=classFamilyForCharacter(characterId);
  if(!family)throw new Error('Unsupported M6 save character family');
  const matching=tracks.map(validateM6StageTrack).filter(track=>track.family===family);
  if(matching.length!==1)throw new Error('M6 save requires exactly one stage track per family');
  return matching[0];
}

export function validateM6SaveForContent(
  raw:unknown,
  saveContext:SaveValidationContext,
  content:M6SaveContentContext,
):M6SaveV2{
  const save=validateSaveV2(raw,saveContext);
  if(!save.m6)throw new Error('M6 save extension is required');
  const extension=validateM6SaveExtension(save.m6,save.character);
  const track=stageTrackForCharacter(save.character,content.stageTracks);
  validateM6StageProgressionState(extension.stage,track);
  const questDefinition=validateM6QuestChainDefinition(content.questChain);
  validateM6QuestChainStateForDefinition(extension.questChain,questDefinition);
  validateM6EquipmentLoadout(
    extension.equipment,
    save.inventory,
    content.equipmentRules,
    {
      characterId:save.character,
      family:extension.family,
      stageId:extension.stage.stageId,
      level:save.progression.level,
    },
  );
  return{...save,m6:extension};
}

export function migrateSaveToM6(
  raw:unknown,
  saveContext:SaveValidationContext,
  content:M6SaveContentContext,
):M6SaveV2{
  const base=migrateSave(raw,saveContext);
  if(base.m6)return validateM6SaveForContent(base,saveContext,content);

  const track=stageTrackForCharacter(base.character,content.stageTracks);
  const characterStage=Number(base.character);
  const stageId=track.stageIds.includes(characterStage)?characterStage:track.stageIds[0];
  const stage=createM6StageProgression(track,stageId);
  const questChain=createM6QuestChainState(content.questChain,base.questFlags);
  const equipment={
    weapon:base.inventory.equipped.weapon,
    armor:base.inventory.equipped.armor,
    accessory:null,
  };
  const m6=createM6SaveExtension(base.character,{stage,questChain,equipment});
  return validateM6SaveForContent({...base,m6},saveContext,content);
}

export function serializeM6SaveV2(
  save:M6SaveV2,
  saveContext:SaveValidationContext,
  content:M6SaveContentContext,
):string{
  return serializeSaveV2(validateM6SaveForContent(save,saveContext,content),saveContext);
}

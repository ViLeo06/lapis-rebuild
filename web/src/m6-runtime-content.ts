import {SWORDSMAN_STAGE_IDS,availableSwordsmanSkillIds,promotionRequirementForStage} from './classes/swordsman-ten-stage.ts';
import {WIZARD_STAGE_IDS,availableWizardSkillIds,wizardPromotionRequirementForStage} from './classes/wizard-ten-stage.ts';
import {classFamilyForCharacter} from './progression/equipment.ts';
import {legacyTrainingEquipmentRules} from './progression/m6-equipment.ts';
import {createM6StageProgression} from './progression/m6-stage-promotion.ts';
import type {M6PromotionRequirement,M6StageProgressionState,M6StageTrack} from './progression/m6-stage-promotion.ts';
import type {M6SaveContentContext} from './progression/m6-save-migration.ts';
import {
  acceptM6Quest,
  applyM6QuestObjectiveEvent,
  commitM6QuestTurnIn,
  createM6QuestChainState,
  prepareM6QuestTurnIn,
} from './world/m6-quest-chain.ts';
import type {M6QuestChainDefinition,M6QuestChainState} from './world/m6-quest-chain.ts';
import type {QuestStage} from './world/quest-runtime.ts';
import {TRAINING_BATTLE_ZONE_ID,TRAINING_QUEST_ID} from './world/world-content.ts';

export const M6_SWORDSMAN_TRACK:M6StageTrack=Object.freeze({
  id:'m6-swordsman-ten-stage',
  family:'swordsman',
  stageIds:SWORDSMAN_STAGE_IDS,
  provenance:'VERIFIED-STATIC-ORIGINAL',
});
export const M6_WIZARD_TRACK:M6StageTrack=Object.freeze({
  id:'m6-wizard-ten-stage',
  family:'wizard',
  stageIds:WIZARD_STAGE_IDS,
  provenance:'VERIFIED-STATIC-ORIGINAL',
});
export const M6_STAGE_TRACKS=Object.freeze([M6_SWORDSMAN_TRACK,M6_WIZARD_TRACK] as const);
export const M6_CHARACTER_IDS=Object.freeze([...SWORDSMAN_STAGE_IDS,...WIZARD_STAGE_IDS].map(String));

export const M6_RUNTIME_QUEST_CHAIN:M6QuestChainDefinition=Object.freeze({
  id:'m6-player-training',
  provenance:'RECONSTRUCTION_POLICY',
  quests:Object.freeze([{
    id:TRAINING_QUEST_ID,
    offerNpcId:'training-guide',
    turnInNpcId:'training-guide',
    prerequisites:{questIds:[],questFlags:[]},
    steps:Object.freeze([{id:'training-win',objective:{kind:'battle' as const,battleZoneId:TRAINING_BATTLE_ZONE_ID,requiredWins:1}}]),
    reward:{gold:7,exp:230,questFlags:['m5.training.complete']},
    completionFlag:'m5.training.complete',
    provenance:'RECONSTRUCTION_POLICY' as const,
  }]),
});

export const M6_RUNTIME_EQUIPMENT_RULES=Object.freeze(legacyTrainingEquipmentRules());
export const M6_SAVE_CONTENT: M6SaveContentContext=Object.freeze({
  stageTracks:M6_STAGE_TRACKS,
  questChain:M6_RUNTIME_QUEST_CHAIN,
  equipmentRules:M6_RUNTIME_EQUIPMENT_RULES,
});

export function m6StageTrackForCharacter(characterId:string|number):M6StageTrack{
  const family=classFamilyForCharacter(String(characterId));
  if(family==='swordsman')return M6_SWORDSMAN_TRACK;
  if(family==='wizard')return M6_WIZARD_TRACK;
  throw new Error(`Unsupported M6 character ${String(characterId)}`);
}

export function createM6StageState(characterId:string|number):M6StageProgressionState{
  const track=m6StageTrackForCharacter(characterId);
  const stageId=Number(characterId);
  return createM6StageProgression(track,stageId);
}

export function m6SkillIdsForCharacter(characterId:string|number):readonly number[]{
  const family=classFamilyForCharacter(String(characterId));
  if(family==='swordsman')return availableSwordsmanSkillIds(characterId);
  if(family==='wizard')return availableWizardSkillIds(characterId);
  return Object.freeze([]);
}

export function m6SkillAvailableForCharacter(characterId:string|number,skillId:number):boolean{
  return m6SkillIdsForCharacter(characterId).includes(skillId);
}

export function m6PromotionRuleForCharacter(characterId:string|number):M6PromotionRequirement|null{
  const family=classFamilyForCharacter(String(characterId));
  if(family==='swordsman'){
    const requirement=promotionRequirementForStage(characterId);
    if(!requirement)return null;
    return{
      id:`swordsman-${requirement.fromStageId}-${requirement.toStageId}`,
      fromStageId:requirement.fromStageId,
      toStageId:requirement.toStageId,
      minimumLevel:requirement.requiredLevel,
      provenance:'RECONSTRUCTION_POLICY',
    };
  }
  if(family==='wizard'){
    const requirement=wizardPromotionRequirementForStage(characterId);
    if(!requirement)return null;
    return{
      id:`wizard-${requirement.fromStageId}-${requirement.toStageId}`,
      fromStageId:requirement.fromStageId,
      toStageId:requirement.toStageId,
      minimumLevel:requirement.requiredLevel,
      provenance:'RECONSTRUCTION_POLICY',
    };
  }
  throw new Error(`Unsupported M6 character ${String(characterId)}`);
}

export function m6QuestChainForLegacyStage(
  stage:QuestStage,
  questFlags:Record<string,true>,
):M6QuestChainState{
  let state=createM6QuestChainState(M6_RUNTIME_QUEST_CHAIN,questFlags);
  if(stage==='not_started')return state;
  const accepted=acceptM6Quest(M6_RUNTIME_QUEST_CHAIN,state,TRAINING_QUEST_ID,'training-guide',questFlags);
  state=accepted.state;
  if(stage==='accepted'||stage==='objective')return state;
  state=applyM6QuestObjectiveEvent(
    M6_RUNTIME_QUEST_CHAIN,
    state,
    TRAINING_QUEST_ID,
    {type:'battle_won',battleZoneId:TRAINING_BATTLE_ZONE_ID},
  ).state;
  if(stage==='ready_to_turn_in')return state;
  const settlement=prepareM6QuestTurnIn(M6_RUNTIME_QUEST_CHAIN,state,TRAINING_QUEST_ID,'training-guide');
  if(!settlement)throw new Error('Unable to mirror completed M6 training quest');
  return commitM6QuestTurnIn(
    M6_RUNTIME_QUEST_CHAIN,
    state,
    settlement,
    {...questFlags,'m5.training.complete':true},
  ).state;
}

import {presentNpc} from './npc-model.ts';
import type {NpcDefinition,QuestMarker} from './npc-model.ts';
import {applyQuestEvent,questMarker} from './quest-runtime.ts';
import type {QuestRuntimeState,QuestStage} from './quest-runtime.ts';
import {canInteract} from './world-model.ts';
import type {WorldInteractionIntent,WorldState} from './world-model.ts';

export type NpcInteractionInputSource='pointer'|'keyboard'|'compatibility';
export type NpcDialoguePhase='offer'|'progress'|'turn-in'|'complete';
export type NpcDialogueChoiceId='accept-quest'|'decline-quest'|'turn-in-quest'|'close';
export type NpcDialogueRejectReason=
  | 'unsupported-provenance'
  | 'entity-mismatch'
  | 'quest-mismatch'
  | 'map-mismatch'
  | 'actor-state-mismatch'
  | 'out-of-range'
  | 'stale-dialogue'
  | 'choice-not-available';

export type NpcDialogueIntent=WorldInteractionIntent&{
  inputSource:NpcInteractionInputSource;
};

export type NpcDialogueChoice={
  id:NpcDialogueChoiceId;
  label:string;
  enabled:true;
  provenance:'RECONSTRUCTION_POLICY';
};

export type NpcDialogueViewModel={
  sessionId:string;
  npcId:string;
  questId:string;
  marker:QuestMarker;
  phase:NpcDialoguePhase;
  speaker:string;
  lines:string[];
  choices:readonly NpcDialogueChoice[];
  provenance:'RECONSTRUCTION_POLICY';
};

export type NpcDialogueSession={
  sessionId:string;
  entityId:string;
  mapId:number;
  questId:string;
  questStage:QuestStage;
  inputSource:NpcInteractionInputSource;
  view:NpcDialogueViewModel;
  provenance:'RECONSTRUCTION_POLICY';
};

export type BeginNpcDialogueResult=
  | {accepted:true;session:NpcDialogueSession;provenance:'RECONSTRUCTION_POLICY'}
  | {accepted:false;reason:NpcDialogueRejectReason;provenance:'RECONSTRUCTION_POLICY'};

export type NpcDialogueChoiceAction='quest-accepted'|'quest-completed'|'declined'|'dismissed';

export type ApplyNpcDialogueChoiceResult=
  | {
      accepted:true;
      quest:QuestRuntimeState;
      questAdvanced:boolean;
      action:NpcDialogueChoiceAction;
      provenance:'RECONSTRUCTION_POLICY';
    }
  | {
      accepted:false;
      quest:QuestRuntimeState;
      questAdvanced:false;
      reason:NpcDialogueRejectReason;
      provenance:'RECONSTRUCTION_POLICY';
    };

const choice=(id:NpcDialogueChoiceId,label:string):NpcDialogueChoice=>({
  id,label,enabled:true,provenance:'RECONSTRUCTION_POLICY',
});

function phaseForStage(stage:QuestStage):NpcDialoguePhase{
  if(stage==='not_started')return 'offer';
  if(stage==='ready_to_turn_in')return 'turn-in';
  if(stage==='complete')return 'complete';
  return 'progress';
}

function choicesForStage(stage:QuestStage):readonly NpcDialogueChoice[]{
  if(stage==='not_started')return Object.freeze([
    choice('accept-quest','接受任务'),
    choice('decline-quest','暂不接受'),
  ]);
  if(stage==='ready_to_turn_in')return Object.freeze([
    choice('turn-in-quest','交付任务'),
    choice('close','稍后'),
  ]);
  return Object.freeze([choice('close','关闭')]);
}

function reject(reason:NpcDialogueRejectReason):BeginNpcDialogueResult{
  return{accepted:false,reason,provenance:'RECONSTRUCTION_POLICY'};
}

export function beginNpcDialogue(
  npc:NpcDefinition,
  quest:QuestRuntimeState,
  world:WorldState,
  intent:NpcDialogueIntent,
):BeginNpcDialogueResult{
  if(intent.provenance!=='RECONSTRUCTION_POLICY')return reject('unsupported-provenance');
  if(intent.entityId!==npc.entity.id)return reject('entity-mismatch');
  if(npc.questId&&npc.questId!==quest.questId)return reject('quest-mismatch');
  if(intent.mapId!==world.mapId||npc.entity.mapId!==world.mapId)return reject('map-mismatch');
  if(intent.actorX!==world.x||intent.actorY!==world.y)return reject('actor-state-mismatch');
  if(!canInteract(npc.entity,world))return reject('out-of-range');

  const marker=questMarker(quest.stage);
  const presentation=presentNpc(npc,marker,true);
  const sessionId=`${npc.entity.id}:${quest.questId}:${quest.stage}:${world.mapId}`;
  const view:NpcDialogueViewModel={
    sessionId,
    npcId:npc.entity.id,
    questId:quest.questId,
    marker,
    phase:phaseForStage(quest.stage),
    speaker:presentation.dialogue.speaker,
    lines:[...presentation.dialogue.lines],
    choices:choicesForStage(quest.stage),
    provenance:'RECONSTRUCTION_POLICY',
  };
  return{
    accepted:true,
    session:{
      sessionId,
      entityId:npc.entity.id,
      mapId:world.mapId,
      questId:quest.questId,
      questStage:quest.stage,
      inputSource:intent.inputSource,
      view,
      provenance:'RECONSTRUCTION_POLICY',
    },
    provenance:'RECONSTRUCTION_POLICY',
  };
}

export function applyNpcDialogueChoice(
  session:NpcDialogueSession,
  quest:QuestRuntimeState,
  choiceId:NpcDialogueChoiceId,
  expectedBattleZoneId:number,
):ApplyNpcDialogueChoiceResult{
  if(session.questId!==quest.questId){
    return{accepted:false,quest:{...quest},questAdvanced:false,reason:'quest-mismatch',provenance:'RECONSTRUCTION_POLICY'};
  }
  if(session.questStage!==quest.stage){
    return{accepted:false,quest:{...quest},questAdvanced:false,reason:'stale-dialogue',provenance:'RECONSTRUCTION_POLICY'};
  }
  if(!session.view.choices.some(entry=>entry.id===choiceId)){
    return{accepted:false,quest:{...quest},questAdvanced:false,reason:'choice-not-available',provenance:'RECONSTRUCTION_POLICY'};
  }

  let next={...quest};
  let action:NpcDialogueChoiceAction='dismissed';
  if(choiceId==='accept-quest'){
    next=applyQuestEvent(quest,{type:'accept'},expectedBattleZoneId);
    action='quest-accepted';
  }else if(choiceId==='turn-in-quest'){
    next=applyQuestEvent(quest,{type:'turn_in'},expectedBattleZoneId);
    action='quest-completed';
  }else if(choiceId==='decline-quest'){
    action='declined';
  }
  return{
    accepted:true,
    quest:next,
    questAdvanced:next.stage!==quest.stage,
    action,
    provenance:'RECONSTRUCTION_POLICY',
  };
}

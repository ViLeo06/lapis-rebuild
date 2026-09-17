import type {QuestMarker} from './npc-model.ts';

export type QuestStage='not_started'|'accepted'|'objective'|'ready_to_turn_in'|'complete';
export type QuestRuntimeState={questId:string;stage:QuestStage};
export type QuestEvent=
  | {type:'accept'}
  | {type:'arrive_objective_map'}
  | {type:'battle_won';battleZoneId:number}
  | {type:'turn_in'};

export type QuestTransition={
  previous:QuestStage;
  next:QuestStage;
  changed:boolean;
  provenance:'RECONSTRUCTION_POLICY';
};

export const initialQuestRuntime=(questId:string):QuestRuntimeState=>({questId,stage:'not_started'});

export function questMarker(stage:QuestStage):QuestMarker{
  if(stage==='not_started')return 'available';
  if(stage==='ready_to_turn_in')return 'turn-in';
  if(stage==='complete')return 'complete';
  return 'active';
}

export function transitionQuest(state:QuestRuntimeState,event:QuestEvent,expectedBattleZoneId:number):QuestTransition{
  let next=state.stage;
  if(state.stage==='not_started'&&event.type==='accept')next='accepted';
  else if(state.stage==='accepted'&&event.type==='arrive_objective_map')next='objective';
  else if(state.stage==='objective'&&event.type==='battle_won'&&event.battleZoneId===expectedBattleZoneId)next='ready_to_turn_in';
  else if(state.stage==='ready_to_turn_in'&&event.type==='turn_in')next='complete';
  return{previous:state.stage,next,changed:next!==state.stage,provenance:'RECONSTRUCTION_POLICY'};
}

export function applyQuestEvent(state:QuestRuntimeState,event:QuestEvent,expectedBattleZoneId:number):QuestRuntimeState{
  const result=transitionQuest(state,event,expectedBattleZoneId);
  return{...state,stage:result.next};
}

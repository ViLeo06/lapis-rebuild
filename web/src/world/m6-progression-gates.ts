import {isM6QuestComplete,validateM6QuestChainState} from './m6-quest-chain.ts';
import type {M6QuestChainState} from './m6-quest-chain.ts';

export type M6WorldGateTarget='scene-transition'|'npc-interaction'|'encounter';
export type M6WorldGate={
  id:string;
  target:M6WorldGateTarget;
  targetId:string;
  requiredQuestIds?:readonly string[];
  requiredQuestFlags?:readonly string[];
  minimumLevel?:number;
  allowedStageIds?:readonly number[];
  provenance:'RECONSTRUCTION_POLICY';
};
export type M6WorldGateContext={
  questChain:M6QuestChainState;
  questFlags:Record<string,true>;
  level:number;
  stageId:number;
};
export type M6WorldGateDecision={
  available:boolean;
  reasons:string[];
  provenance:'RECONSTRUCTION_POLICY';
};

const token=(value:unknown,max=128):value is string=>
  typeof value==='string'&&value.length>0&&value.length<=max&&/^[A-Za-z0-9._:/-]+$/.test(value);
const integerIn=(value:unknown,min:number,max:number):value is number=>
  Number.isInteger(value)&&(value as number)>=min&&(value as number)<=max;
const targets:readonly M6WorldGateTarget[]=['scene-transition','npc-interaction','encounter'];

export function validateM6WorldGate(gate:M6WorldGate):M6WorldGate{
  if(!gate||typeof gate!=='object'||!token(gate.id)||!targets.includes(gate.target)||!token(gate.targetId)||gate.provenance!=='RECONSTRUCTION_POLICY')throw new Error('Invalid M6 world gate');
  const requiredQuestIds=[...(gate.requiredQuestIds??[])],requiredQuestFlags=[...(gate.requiredQuestFlags??[])],allowedStageIds=[...(gate.allowedStageIds??[])];
  if(new Set(requiredQuestIds).size!==requiredQuestIds.length||new Set(requiredQuestFlags).size!==requiredQuestFlags.length||requiredQuestIds.some(id=>!token(id))||requiredQuestFlags.some(flag=>!token(flag)))throw new Error('Invalid M6 world gate quest requirement');
  if(gate.minimumLevel!==undefined&&!integerIn(gate.minimumLevel,1,999))throw new Error('Invalid M6 world gate level');
  if(new Set(allowedStageIds).size!==allowedStageIds.length||allowedStageIds.some(stage=>!integerIn(stage,0,999999)))throw new Error('Invalid M6 world gate stages');
  return{
    ...gate,
    requiredQuestIds,
    requiredQuestFlags,
    allowedStageIds,
  };
}

export function evaluateM6WorldGate(gate:M6WorldGate,context:M6WorldGateContext):M6WorldGateDecision{
  const valid=validateM6WorldGate(gate);
  const quests=validateM6QuestChainState(context.questChain);
  if(!integerIn(context.level,1,999)||!integerIn(context.stageId,0,999999))throw new Error('Invalid M6 world gate context');
  const reasons:string[]=[];
  for(const questId of valid.requiredQuestIds??[])if(!isM6QuestComplete(quests,questId))reasons.push('quest:'+questId);
  for(const flag of valid.requiredQuestFlags??[])if(context.questFlags[flag]!==true)reasons.push('flag:'+flag);
  if(valid.minimumLevel!==undefined&&context.level<valid.minimumLevel)reasons.push('level');
  if(valid.allowedStageIds?.length&&!valid.allowedStageIds.includes(context.stageId))reasons.push('stage');
  return{available:reasons.length===0,reasons,provenance:'RECONSTRUCTION_POLICY'};
}

export function availableM6WorldTargets(
  gates:readonly M6WorldGate[],
  context:M6WorldGateContext,
):readonly M6WorldGate[]{
  return gates.map(validateM6WorldGate).filter(gate=>evaluateM6WorldGate(gate,context).available);
}

import {validateRewardBundle} from '../progression/rewards.ts';
import type {RewardBundle,RewardItem} from '../progression/rewards.ts';

export type M6QuestStatus='locked'|'available'|'active'|'ready_to_turn_in'|'complete';
export type M6QuestObjective=
  |{kind:'battle';battleZoneId:number;requiredWins:number}
  |{kind:'item';itemId:number;requiredQuantity:number}
  |{kind:'npc';npcId:string};
export type M6QuestStepDefinition={id:string;objective:M6QuestObjective};
export type M6QuestReward=Omit<RewardBundle,'receiptId'|'source'>;
export type M6QuestDefinition={
  id:string;
  offerNpcId:string;
  turnInNpcId:string;
  prerequisites:{questIds:readonly string[];questFlags:readonly string[]};
  steps:readonly M6QuestStepDefinition[];
  reward:M6QuestReward;
  completionFlag:string;
  promotionRuleId?:string;
  provenance:'RECONSTRUCTION_POLICY';
};
export type M6QuestChainDefinition={
  id:string;
  quests:readonly M6QuestDefinition[];
  provenance:'RECONSTRUCTION_POLICY';
};
export type M6QuestProgress={
  status:M6QuestStatus;
  stepIndex:number;
  objectiveProgress:number;
};
export type M6QuestChainState={
  chainId:string;
  quests:Record<string,M6QuestProgress>;
};
export type M6QuestObjectiveEvent=
  |{type:'battle_won';battleZoneId:number}
  |{type:'inventory_changed';itemId:number;quantityOwned:number}
  |{type:'npc_interacted';npcId:string};
export type M6QuestSettlement={
  chainId:string;
  questId:string;
  rewardReceiptId:string;
  reward:M6QuestReward;
  completionFlag:string;
  promotionRuleId?:string;
  provenance:'RECONSTRUCTION_POLICY';
};

const token=(value:unknown,max=128):value is string=>
  typeof value==='string'&&value.length>0&&value.length<=max&&/^[A-Za-z0-9._:/-]+$/.test(value);
const integerIn=(value:unknown,min:number,max:number):value is number=>
  Number.isInteger(value)&&(value as number)>=min&&(value as number)<=max;
const statuses:readonly M6QuestStatus[]=['locked','available','active','ready_to_turn_in','complete'];

function cloneProgress(value:M6QuestProgress):M6QuestProgress{return{...value};}
function cloneState(state:M6QuestChainState):M6QuestChainState{
  return{chainId:state.chainId,quests:Object.fromEntries(Object.entries(state.quests).map(([id,value])=>[id,cloneProgress(value)]))};
}

function validateObjective(objective:M6QuestObjective):M6QuestObjective{
  if(!objective||typeof objective!=='object')throw new Error('Invalid M6 quest objective');
  if(objective.kind==='battle'){
    if(!integerIn(objective.battleZoneId,0,65535)||!integerIn(objective.requiredWins,1,999))throw new Error('Invalid M6 battle objective');
    return{...objective};
  }
  if(objective.kind==='item'){
    if(!integerIn(objective.itemId,0,Number.MAX_SAFE_INTEGER)||!integerIn(objective.requiredQuantity,1,9999))throw new Error('Invalid M6 item objective');
    return{...objective};
  }
  if(objective.kind==='npc'){
    if(!token(objective.npcId))throw new Error('Invalid M6 NPC objective');
    return{...objective};
  }
  throw new Error('Unknown M6 quest objective');
}

export function validateM6QuestChainDefinition(definition:M6QuestChainDefinition):M6QuestChainDefinition{
  if(!definition||typeof definition!=='object'||!token(definition.id)||definition.provenance!=='RECONSTRUCTION_POLICY'||!Array.isArray(definition.quests)||definition.quests.length<1||definition.quests.length>128)throw new Error('Invalid M6 quest chain');
  const ids=new Set<string>();
  const quests=definition.quests.map(quest=>{
    if(!quest||typeof quest!=='object'||!token(quest.id)||ids.has(quest.id)||!token(quest.offerNpcId)||!token(quest.turnInNpcId)||!token(quest.completionFlag)||quest.provenance!=='RECONSTRUCTION_POLICY')throw new Error('Invalid M6 quest definition');
    ids.add(quest.id);
    if(!quest.prerequisites||!Array.isArray(quest.prerequisites.questIds)||!Array.isArray(quest.prerequisites.questFlags))throw new Error('Invalid M6 quest prerequisites');
    const questIds=[...quest.prerequisites.questIds],questFlags=[...quest.prerequisites.questFlags];
    if(new Set(questIds).size!==questIds.length||new Set(questFlags).size!==questFlags.length||questIds.some(id=>!token(id))||questFlags.some(flag=>!token(flag)))throw new Error('Invalid M6 quest prerequisite token');
    if(!Array.isArray(quest.steps)||quest.steps.length<1||quest.steps.length>64)throw new Error('Invalid M6 quest steps');
    const stepIds=new Set<string>();
    const steps=quest.steps.map((step:M6QuestStepDefinition)=>{
      if(!step||!token(step.id)||stepIds.has(step.id))throw new Error('Invalid M6 quest step');
      stepIds.add(step.id);
      return{id:step.id,objective:validateObjective(step.objective)};
    });
    validateRewardBundle({receiptId:'validation',source:{kind:'quest',ref:quest.id},...quest.reward});
    if(quest.promotionRuleId!==undefined&&!token(quest.promotionRuleId))throw new Error('Invalid M6 promotion rule reference');
    return{
      ...quest,
      prerequisites:{questIds,questFlags},
      steps,
      reward:{...quest.reward,items:quest.reward.items?.map((item:RewardItem)=>({...item})),questFlags:quest.reward.questFlags?[...quest.reward.questFlags]:undefined},
    };
  });
  for(const quest of quests)for(const prerequisite of quest.prerequisites.questIds)if(!ids.has(prerequisite)||prerequisite===quest.id)throw new Error('Unknown or self M6 quest prerequisite');
  const visiting=new Set<string>(),visited=new Set<string>(),byId=new Map(quests.map(quest=>[quest.id,quest]));
  const visit=(id:string)=>{
    if(visited.has(id))return;
    if(visiting.has(id))throw new Error('Cyclic M6 quest prerequisite');
    visiting.add(id);
    for(const parent of byId.get(id)!.prerequisites.questIds)visit(parent);
    visiting.delete(id);visited.add(id);
  };
  for(const quest of quests)visit(quest.id);
  return{id:definition.id,quests,provenance:'RECONSTRUCTION_POLICY'};
}

function prerequisitesMet(
  definition:M6QuestChainDefinition,
  state:M6QuestChainState,
  quest:M6QuestDefinition,
  questFlags:Record<string,true>,
):boolean{
  void definition;
  return quest.prerequisites.questIds.every(id=>state.quests[id]?.status==='complete')&&quest.prerequisites.questFlags.every(flag=>questFlags[flag]===true);
}

export function refreshM6QuestAvailability(
  definition:M6QuestChainDefinition,
  rawState:M6QuestChainState,
  questFlags:Record<string,true>,
):M6QuestChainState{
  const validDefinition=validateM6QuestChainDefinition(definition);
  const state=validateM6QuestChainStateForDefinition(rawState,validDefinition);
  const next=cloneState(state);
  for(const quest of validDefinition.quests){
    const progress=next.quests[quest.id];
    if(progress.status==='locked'&&prerequisitesMet(validDefinition,next,quest,questFlags))progress.status='available';
  }
  return next;
}

export function createM6QuestChainState(
  definition:M6QuestChainDefinition,
  questFlags:Record<string,true>={},
):M6QuestChainState{
  const valid=validateM6QuestChainDefinition(definition);
  const state:M6QuestChainState={
    chainId:valid.id,
    quests:Object.fromEntries(valid.quests.map(quest=>[quest.id,{status:'locked',stepIndex:0,objectiveProgress:0}])),
  };
  return refreshM6QuestAvailability(valid,state,questFlags);
}

export function acceptM6Quest(
  definition:M6QuestChainDefinition,
  rawState:M6QuestChainState,
  questId:string,
  npcId:string,
  questFlags:Record<string,true>,
):{state:M6QuestChainState;accepted:boolean}{
  const valid=validateM6QuestChainDefinition(definition);
  const state=refreshM6QuestAvailability(valid,rawState,questFlags);
  const quest=valid.quests.find(entry=>entry.id===questId);
  if(!quest||quest.offerNpcId!==npcId||state.quests[questId]?.status!=='available')return{state,accepted:false};
  const next=cloneState(state);
  next.quests[questId]={status:'active',stepIndex:0,objectiveProgress:0};
  return{state:next,accepted:true};
}

function requiredProgress(objective:M6QuestObjective):number{
  if(objective.kind==='battle')return objective.requiredWins;
  if(objective.kind==='item')return objective.requiredQuantity;
  return 1;
}

export function applyM6QuestObjectiveEvent(
  definition:M6QuestChainDefinition,
  rawState:M6QuestChainState,
  questId:string,
  event:M6QuestObjectiveEvent,
):{state:M6QuestChainState;advanced:boolean}{
  const valid=validateM6QuestChainDefinition(definition);
  const state=validateM6QuestChainStateForDefinition(rawState,valid);
  const quest=valid.quests.find(entry=>entry.id===questId);
  const progress=quest?state.quests[questId]:undefined;
  if(!quest||!progress||progress.status!=='active')return{state,advanced:false};
  const step=quest.steps[progress.stepIndex];
  let nextProgress=progress.objectiveProgress;
  let matched=false;
  if(step.objective.kind==='battle'&&event.type==='battle_won'&&event.battleZoneId===step.objective.battleZoneId){
    nextProgress=Math.min(step.objective.requiredWins,nextProgress+1);matched=true;
  }else if(step.objective.kind==='item'&&event.type==='inventory_changed'&&event.itemId===step.objective.itemId){
    nextProgress=Math.min(step.objective.requiredQuantity,Math.max(0,event.quantityOwned));matched=true;
  }else if(step.objective.kind==='npc'&&event.type==='npc_interacted'&&event.npcId===step.objective.npcId){
    nextProgress=1;matched=true;
  }
  if(!matched)return{state,advanced:false};
  const next=cloneState(state);
  const target=next.quests[questId];
  target.objectiveProgress=nextProgress;
  if(nextProgress>=requiredProgress(step.objective)){
    if(target.stepIndex===quest.steps.length-1)target.status='ready_to_turn_in';
    else{target.stepIndex+=1;target.objectiveProgress=0;}
  }
  return{state:next,advanced:true};
}

export function prepareM6QuestTurnIn(
  definition:M6QuestChainDefinition,
  rawState:M6QuestChainState,
  questId:string,
  npcId:string,
):M6QuestSettlement|null{
  const valid=validateM6QuestChainDefinition(definition);
  const state=validateM6QuestChainStateForDefinition(rawState,valid);
  const quest=valid.quests.find(entry=>entry.id===questId);
  if(!quest||quest.turnInNpcId!==npcId||state.quests[questId]?.status!=='ready_to_turn_in')return null;
  return{
    chainId:valid.id,
    questId,
    rewardReceiptId:'quest:'+valid.id+':'+questId+':turn-in',
    reward:{...quest.reward,items:quest.reward.items?.map(item=>({...item})),questFlags:quest.reward.questFlags?[...quest.reward.questFlags]:undefined},
    completionFlag:quest.completionFlag,
    ...(quest.promotionRuleId?{promotionRuleId:quest.promotionRuleId}:{}),
    provenance:'RECONSTRUCTION_POLICY',
  };
}

export function commitM6QuestTurnIn(
  definition:M6QuestChainDefinition,
  rawState:M6QuestChainState,
  settlement:M6QuestSettlement,
  questFlags:Record<string,true>,
):{state:M6QuestChainState;committed:boolean}{
  const valid=validateM6QuestChainDefinition(definition);
  const state=validateM6QuestChainStateForDefinition(rawState,valid);
  if(settlement.chainId!==valid.id)throw new Error('M6 quest settlement chain mismatch');
  const quest=valid.quests.find(entry=>entry.id===settlement.questId);
  if(!quest||settlement.completionFlag!==quest.completionFlag)throw new Error('M6 quest settlement drift');
  const progress=state.quests[quest.id];
  if(progress.status==='complete')return{state,committed:false};
  if(progress.status!=='ready_to_turn_in')throw new Error('M6 quest is not ready to turn in');
  const next=cloneState(state);
  next.quests[quest.id].status='complete';
  return{state:refreshM6QuestAvailability(valid,next,questFlags),committed:true};
}

export function isM6QuestComplete(state:M6QuestChainState,questId:string):boolean{
  return state.quests[questId]?.status==='complete';
}

export function validateM6QuestChainState(raw:unknown):M6QuestChainState{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid M6 quest-chain state');
  const value=raw as Record<string,unknown>;
  const keys=Object.keys(value);
  if(keys.length!==2||keys.some(key=>!['chainId','quests'].includes(key)))throw new Error('Unknown M6 quest-chain state field');
  if(!token(value.chainId))throw new Error('Invalid M6 quest-chain id');
  if(!value.quests||typeof value.quests!=='object'||Array.isArray(value.quests))throw new Error('Invalid M6 quest progress map');
  const entries=Object.entries(value.quests as Record<string,unknown>);
  if(entries.length>128)throw new Error('Too many M6 quest progress entries');
  const quests:Record<string,M6QuestProgress>={};
  for(const [id,rawProgress] of entries){
    if(!token(id)||!rawProgress||typeof rawProgress!=='object'||Array.isArray(rawProgress))throw new Error('Invalid M6 quest progress');
    const progress=rawProgress as Record<string,unknown>;
    const progressKeys=Object.keys(progress);
    if(progressKeys.length!==3||progressKeys.some(key=>!['status','stepIndex','objectiveProgress'].includes(key)))throw new Error('Unknown M6 quest progress field');
    if(!statuses.includes(progress.status as M6QuestStatus)||!integerIn(progress.stepIndex,0,63)||!integerIn(progress.objectiveProgress,0,9999))throw new Error('Invalid M6 quest progress value');
    quests[id]={status:progress.status as M6QuestStatus,stepIndex:progress.stepIndex,objectiveProgress:progress.objectiveProgress};
  }
  return{chainId:value.chainId as string,quests};
}

export function validateM6QuestChainStateForDefinition(
  raw:unknown,
  definition:M6QuestChainDefinition,
):M6QuestChainState{
  const validDefinition=validateM6QuestChainDefinition(definition);
  const state=validateM6QuestChainState(raw);
  if(state.chainId!==validDefinition.id)throw new Error('M6 quest-chain content mismatch');
  const expectedIds=validDefinition.quests.map(quest=>quest.id).sort();
  const actualIds=Object.keys(state.quests).sort();
  if(expectedIds.length!==actualIds.length||expectedIds.some((id,index)=>id!==actualIds[index]))throw new Error('M6 quest progress set mismatch');
  for(const quest of validDefinition.quests){
    const progress=state.quests[quest.id];
    if(progress.stepIndex>=quest.steps.length)throw new Error('M6 quest step outside definition');
    if(['locked','available'].includes(progress.status)&&(progress.stepIndex!==0||progress.objectiveProgress!==0))throw new Error('Invalid inactive M6 quest progress');
    const required=requiredProgress(quest.steps[progress.stepIndex].objective);
    if(progress.objectiveProgress>required)throw new Error('M6 quest objective progress overflow');
    if(progress.status==='ready_to_turn_in'&&(progress.stepIndex!==quest.steps.length-1||progress.objectiveProgress<required))throw new Error('Invalid M6 ready-to-turn-in progress');
  }
  return state;
}

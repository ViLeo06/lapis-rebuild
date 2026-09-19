import {classFamilyForCharacter} from './equipment.ts';
import {quantityOf,validateInventory} from './inventory.ts';
import type {ClassFamily,InventoryState} from './inventory.ts';
import {isM6QuestComplete,validateM6QuestChainState} from '../world/m6-quest-chain.ts';
import type {M6QuestChainState} from '../world/m6-quest-chain.ts';

export type M6StageTrack={
  id:string;
  family:ClassFamily;
  stageIds:readonly number[];
  provenance:'VERIFIED-STATIC-ORIGINAL'|'RECONSTRUCTION_POLICY';
};
export type M6StageProgressionState={
  trackId:string;
  family:ClassFamily;
  stageId:number;
  promotionReceipts:string[];
};
export type M6PromotionRequirement={
  id:string;
  fromStageId:number;
  toStageId:number;
  minimumLevel?:number;
  requiredQuestIds?:readonly string[];
  requiredQuestFlags?:readonly string[];
  requiredItems?:readonly {itemId:number;quantity:number}[];
  provenance:'RECONSTRUCTION_POLICY';
};
export type M6PromotionContext={
  level:number;
  questFlags:Record<string,true>;
  questChain:M6QuestChainState;
  inventory:InventoryState;
};
export type M6PromotionDecision={
  allowed:boolean;
  reasons:string[];
  receiptId:string;
  provenance:'RECONSTRUCTION_POLICY';
};
export type M6PromotionResult={
  state:M6StageProgressionState;
  applied:boolean;
  duplicate:boolean;
  reasons:string[];
  receiptId:string;
  provenance:'RECONSTRUCTION_POLICY';
};

const token=(value:unknown,max=128):value is string=>
  typeof value==='string'&&value.length>0&&value.length<=max&&/^[A-Za-z0-9._:/-]+$/.test(value);
const integerIn=(value:unknown,min:number,max:number):value is number=>
  Number.isInteger(value)&&(value as number)>=min&&(value as number)<=max;

export function validateM6StageTrack(track:M6StageTrack):M6StageTrack{
  if(!track||typeof track!=='object'||!token(track.id)||!['swordsman','wizard'].includes(track.family)||!Array.isArray(track.stageIds)||track.stageIds.length<1||track.stageIds.length>32)throw new Error('Invalid M6 stage track');
  const stageIds=[...track.stageIds];
  if(new Set(stageIds).size!==stageIds.length||stageIds.some(id=>!integerIn(id,0,999999)||classFamilyForCharacter(String(id))!==track.family))throw new Error('Invalid M6 stage track ids');
  if(!['VERIFIED-STATIC-ORIGINAL','RECONSTRUCTION_POLICY'].includes(track.provenance))throw new Error('Invalid M6 stage-track provenance');
  return{...track,stageIds};
}

export function createM6StageProgression(
  track:M6StageTrack,
  stageId:number=track.stageIds[0],
):M6StageProgressionState{
  const valid=validateM6StageTrack(track);
  if(!valid.stageIds.includes(stageId))throw new Error('M6 initial stage is outside track');
  return{trackId:valid.id,family:valid.family,stageId,promotionReceipts:[]};
}

export function validateM6StageProgressionState(
  raw:unknown,
  track?:M6StageTrack,
):M6StageProgressionState{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid M6 stage progression state');
  const value=raw as Record<string,unknown>;
  const keys=Object.keys(value);
  if(keys.length!==4||keys.some(key=>!['trackId','family','stageId','promotionReceipts'].includes(key)))throw new Error('Unknown M6 stage progression field');
  if(!token(value.trackId)||!['swordsman','wizard'].includes(String(value.family))||!integerIn(value.stageId,0,999999))throw new Error('Invalid M6 stage progression identity');
  if(!Array.isArray(value.promotionReceipts)||value.promotionReceipts.length>64||new Set(value.promotionReceipts).size!==value.promotionReceipts.length||!value.promotionReceipts.every(entry=>token(entry)))throw new Error('Invalid M6 promotion receipts');
  const family=value.family as ClassFamily;
  if(classFamilyForCharacter(String(value.stageId))!==family)throw new Error('M6 stage progression family mismatch');
  const state:M6StageProgressionState={trackId:value.trackId as string,family,stageId:value.stageId,promotionReceipts:[...value.promotionReceipts] as string[]};
  if(track){
    const validTrack=validateM6StageTrack(track);
    if(state.trackId!==validTrack.id||state.family!==validTrack.family||!validTrack.stageIds.includes(state.stageId))throw new Error('M6 stage progression track mismatch');
  }
  return state;
}

export function validateM6PromotionRequirement(
  rule:M6PromotionRequirement,
  track:M6StageTrack,
):M6PromotionRequirement{
  const validTrack=validateM6StageTrack(track);
  if(!rule||typeof rule!=='object'||!token(rule.id)||rule.provenance!=='RECONSTRUCTION_POLICY')throw new Error('Invalid M6 promotion requirement');
  const fromIndex=validTrack.stageIds.indexOf(rule.fromStageId),toIndex=validTrack.stageIds.indexOf(rule.toStageId);
  if(fromIndex<0||toIndex!==fromIndex+1)throw new Error('M6 promotion must advance exactly one stage');
  if(rule.minimumLevel!==undefined&&!integerIn(rule.minimumLevel,1,999))throw new Error('Invalid M6 promotion level requirement');
  const requiredQuestIds=[...(rule.requiredQuestIds??[])],requiredQuestFlags=[...(rule.requiredQuestFlags??[])];
  if(new Set(requiredQuestIds).size!==requiredQuestIds.length||new Set(requiredQuestFlags).size!==requiredQuestFlags.length||requiredQuestIds.some(id=>!token(id))||requiredQuestFlags.some(flag=>!token(flag)))throw new Error('Invalid M6 promotion quest requirement');
  const requiredItems=(rule.requiredItems??[]).map(item=>{
    if(!item||!integerIn(item.itemId,0,Number.MAX_SAFE_INTEGER)||!integerIn(item.quantity,1,9999))throw new Error('Invalid M6 promotion item requirement');
    return{...item};
  });
  if(new Set(requiredItems.map(item=>item.itemId)).size!==requiredItems.length)throw new Error('Duplicate M6 promotion item requirement');
  return{...rule,requiredQuestIds,requiredQuestFlags,requiredItems};
}

export function m6PromotionReceiptId(track:M6StageTrack,rule:M6PromotionRequirement):string{
  return'promotion:'+track.id+':'+rule.id;
}

export function evaluateM6Promotion(
  track:M6StageTrack,
  rawState:M6StageProgressionState,
  rawRule:M6PromotionRequirement,
  context:M6PromotionContext,
):M6PromotionDecision{
  const validTrack=validateM6StageTrack(track);
  const state=validateM6StageProgressionState(rawState,validTrack);
  const rule=validateM6PromotionRequirement(rawRule,validTrack);
  if(!integerIn(context.level,1,999))throw new Error('Invalid M6 promotion context level');
  const inventory=validateInventory(context.inventory);
  const questChain=validateM6QuestChainState(context.questChain);
  const reasons:string[]=[];
  if(state.stageId!==rule.fromStageId)reasons.push('wrong-source-stage');
  if(rule.minimumLevel!==undefined&&context.level<rule.minimumLevel)reasons.push('level-requirement');
  for(const questId of rule.requiredQuestIds??[])if(!isM6QuestComplete(questChain,questId))reasons.push('quest:'+questId);
  for(const flag of rule.requiredQuestFlags??[])if(context.questFlags[flag]!==true)reasons.push('flag:'+flag);
  for(const item of rule.requiredItems??[])if(quantityOf(inventory,item.itemId)<item.quantity)reasons.push('item:'+item.itemId);
  return{allowed:reasons.length===0,reasons,receiptId:m6PromotionReceiptId(validTrack,rule),provenance:'RECONSTRUCTION_POLICY'};
}

export function applyM6Promotion(
  track:M6StageTrack,
  rawState:M6StageProgressionState,
  rule:M6PromotionRequirement,
  context:M6PromotionContext,
):M6PromotionResult{
  const validTrack=validateM6StageTrack(track);
  const state=validateM6StageProgressionState(rawState,validTrack);
  const validRule=validateM6PromotionRequirement(rule,validTrack);
  const receiptId=m6PromotionReceiptId(validTrack,validRule);
  if(state.promotionReceipts.includes(receiptId)){
    const currentIndex=validTrack.stageIds.indexOf(state.stageId),targetIndex=validTrack.stageIds.indexOf(validRule.toStageId);
    if(currentIndex<targetIndex)throw new Error('M6 promotion receipt/state mismatch');
    return{state,applied:false,duplicate:true,reasons:[],receiptId,provenance:'RECONSTRUCTION_POLICY'};
  }
  const decision=evaluateM6Promotion(validTrack,state,validRule,context);
  if(!decision.allowed)return{state,applied:false,duplicate:false,reasons:decision.reasons,receiptId,provenance:'RECONSTRUCTION_POLICY'};
  return{
    state:{...state,stageId:validRule.toStageId,promotionReceipts:[...state.promotionReceipts,receiptId]},
    applied:true,
    duplicate:false,
    reasons:[],
    receiptId,
    provenance:'RECONSTRUCTION_POLICY',
  };
}

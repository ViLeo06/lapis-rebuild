import {actionReady,consumeAction} from '../battle.ts';
import type {BattleState} from '../battle.ts';

export const InfiniteTrainingRecoveryPolicy=Object.freeze({
  id:'m7-infinite-training-recovery-v1',
  provenance:'RECONSTRUCTION_POLICY' as const,
  hpAmount:200,
  mpAmount:200,
  readinessCost:6,
  estimatedWaitMs:3000,
  itemCost:0,
  usageLimit:null,
  note:'Offline M7 training convenience action. Readiness cost 6 corresponds to about 3 seconds at the recovered 500ms readiness cadence; this is 2 seconds shorter than the prior M7 policy. It is not claimed as retail behavior.',
});

export type TrainingRecoveryKind='hp'|'mp';
export type TrainingRecoveryResult=Readonly<{
  ok:boolean;
  kind:TrainingRecoveryKind;
  restored:number;
  readinessSpent:number;
  reason:'ok'|'not-active'|'not-ready'|'already-full';
  policyId:string;
  provenance:'RECONSTRUCTION_POLICY';
}>;

export function applyInfiniteTrainingRecovery(state:BattleState,kind:TrainingRecoveryKind):TrainingRecoveryResult{
  const base={kind,policyId:InfiniteTrainingRecoveryPolicy.id,provenance:InfiniteTrainingRecoveryPolicy.provenance} as const;
  if(state.phase!=='active')return{...base,ok:false,restored:0,readinessSpent:0,reason:'not-active'};
  if(!actionReady(state))return{...base,ok:false,restored:0,readinessSpent:0,reason:'not-ready'};
  const current=kind==='hp'?state.hp:state.mp;
  const maximum=kind==='hp'?state.maxHp:state.maxMp;
  if(current>=maximum)return{...base,ok:false,restored:0,readinessSpent:0,reason:'already-full'};
  if(!consumeAction(state,InfiniteTrainingRecoveryPolicy.readinessCost)){
    return{...base,ok:false,restored:0,readinessSpent:0,reason:'not-ready'};
  }
  const amount=kind==='hp'?InfiniteTrainingRecoveryPolicy.hpAmount:InfiniteTrainingRecoveryPolicy.mpAmount;
  const next=Math.min(maximum,current+amount);
  if(kind==='hp')state.hp=next;else state.mp=next;
  return{
    ...base,
    ok:true,
    restored:next-current,
    readinessSpent:InfiniteTrainingRecoveryPolicy.readinessCost,
    reason:'ok',
  };
}

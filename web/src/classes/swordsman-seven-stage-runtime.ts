import {
  m7AdjustIncomingDamage,
  m7EffectiveCommandRange,
  m7EffectiveDefense,
  m7EffectiveMaxHp,
  m7EffectivePhysicalAttack,
  m7ReadinessEfficiencyMultiplier,
  upsertM7Status,
  validateM7StatusEffect,
  advanceM7Statuses,
} from '../combat/m7-status-effects.ts';
import type {M7StatusEffect} from '../combat/m7-status-effects.ts';
import {
  m7SwordsmanSkill,
  m7SwordsmanSkillLevel,
} from './swordsman-seven-stage-skills.ts';
import type {M7SwordsmanSkillKey,M7SkillLevel} from './swordsman-seven-stage-skills.ts';

export type M7EnemyRank = 'normal' | 'elite' | 'boss';

export type M7SwordsmanSkillPlan = Readonly<{
  skillKey:M7SwordsmanSkillKey;
  skillLevel:M7SkillLevel;
  target:'enemy'|'self';
  mpCost:number;
  readinessCost:number;
  hitMultipliers:readonly number[];
  independentHitRolls:boolean;
  targetStatus:Readonly<{chance:number;effect:M7StatusEffect}>|null;
  selfStatus:M7StatusEffect|null;
  provenance:'RECONSTRUCTION_POLICY';
}>;

export type M7SwordsmanCombatState = Readonly<{
  baseMaxHp:number;
  basePhysicalAttack:number;
  baseCommandRange:number;
  currentHp:number;
  currentMp:number;
  readiness:number;
  statuses:readonly M7StatusEffect[];
}>;

export type M7SwordsmanEffectiveStats = Readonly<{
  maxHp:number;
  physicalAttack:number;
  defense:number;
  commandRange:number;
  readinessEfficiencyMultiplier:number;
}>;

export type M7SwordsmanCombatEventType =
  | 'DAMAGE'
  | 'STUN_APPLIED'
  | 'DEF_BUFF'
  | 'BURST_BUFF'
  | 'SACRIFICE_BUFF'
  | 'SACRIFICE_TICK'
  | 'COMMAND_BUFF'
  | 'STATUS_ENDED';

export type M7SwordsmanCombatEvent = Readonly<{
  type:M7SwordsmanCombatEventType;
  skillKey:M7SwordsmanSkillKey;
  skillLevel:M7SkillLevel;
  target:'player'|string;
  amount:number|null;
  ticks:number|null;
  statusId:string|null;
  durationMs:number|null;
  provenance:'RECONSTRUCTION_POLICY';
}>;

export type M7SwordsmanAdvanceResult = Readonly<{
  state:M7SwordsmanCombatState;
  events:readonly M7SwordsmanCombatEvent[];
}>;

export type M7SwordsmanSelfSkillResult = Readonly<{
  state:M7SwordsmanCombatState;
  events:readonly M7SwordsmanCombatEvent[];
}>;

function finiteNonNegative(value:unknown,label:string):number{
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error(`Invalid ${label}`);
  return value;
}

function positive(value:unknown,label:string):number{
  const result=finiteNonNegative(value,label);
  if(result<=0)throw new Error(`Invalid ${label}`);
  return result;
}

function skillLevel(value:number):M7SkillLevel{
  if(!Number.isInteger(value)||value<1||value>6)throw new Error('Invalid swordsman event skill level');
  return value as M7SkillLevel;
}

function event(
  type:M7SwordsmanCombatEventType,
  skillKey:M7SwordsmanSkillKey,
  level:M7SkillLevel,
  target:'player'|string,
  input:Partial<Pick<M7SwordsmanCombatEvent,'amount'|'ticks'|'statusId'|'durationMs'>>={},
):M7SwordsmanCombatEvent{
  return Object.freeze({
    type,skillKey,skillLevel:level,target,
    amount:input.amount??null,
    ticks:input.ticks??null,
    statusId:input.statusId??null,
    durationMs:input.durationMs??null,
    provenance:'RECONSTRUCTION_POLICY',
  });
}

function selfFeedbackType(skillKey:M7SwordsmanSkillKey):M7SwordsmanCombatEventType{
  switch(skillKey){
    case '1301':return 'DEF_BUFF';
    case '1401':return 'BURST_BUFF';
    case '1501':return 'SACRIFICE_BUFF';
    case 'battle-command':return 'COMMAND_BUFF';
    default:throw new Error(`${skillKey} has no self feedback event`);
  }
}

export function validateM7SwordsmanCombatState(raw:unknown):M7SwordsmanCombatState{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid M7 swordsman combat state');
  const value=raw as Record<string,unknown>;
  const fields=new Set(['baseMaxHp','basePhysicalAttack','baseCommandRange','currentHp','currentMp','readiness','statuses']);
  if(Object.keys(value).length!==fields.size||Object.keys(value).some(key=>!fields.has(key)))throw new Error('Unknown M7 swordsman combat state field');
  const baseMaxHp=positive(value.baseMaxHp,'base max HP');
  const basePhysicalAttack=finiteNonNegative(value.basePhysicalAttack,'base physical attack');
  const baseCommandRange=finiteNonNegative(value.baseCommandRange,'base command range');
  const currentHp=finiteNonNegative(value.currentHp,'current HP');
  const currentMp=finiteNonNegative(value.currentMp,'current MP');
  const readiness=finiteNonNegative(value.readiness,'readiness');
  if(!Array.isArray(value.statuses))throw new Error('Invalid status list');
  const statuses=Object.freeze(value.statuses.map(validateM7StatusEffect));
  const maxHp=m7EffectiveMaxHp(baseMaxHp,statuses);
  if(currentHp>maxHp)throw new Error('Current HP exceeds effective max HP');
  return Object.freeze({baseMaxHp,basePhysicalAttack,baseCommandRange,currentHp,currentMp,readiness,statuses});
}

function status(
  id:string,
  kind:M7StatusEffect['kind'],
  skillKey:M7SwordsmanSkillKey,
  level:M7SkillLevel,
  remainingMs:number|null,
  blockedActions:number,
  modifiers:M7StatusEffect['modifiers'],
):M7StatusEffect{
  return validateM7StatusEffect({
    id,kind,sourceSkillKey:skillKey,sourceSkillLevel:level,
    remainingMs,blockedActions,stacking:'refresh',modifiers,provenance:'RECONSTRUCTION_POLICY',
  });
}

export function planM7SwordsmanSkillUse(
  skillKey:M7SwordsmanSkillKey,
  level:M7SkillLevel,
  targetRank:M7EnemyRank='normal',
):M7SwordsmanSkillPlan{
  const skill=m7SwordsmanSkill(skillKey);
  const row=m7SwordsmanSkillLevel(skillKey,level);
  let selfStatus:M7StatusEffect|null=null;
  let targetStatus:M7SwordsmanSkillPlan['targetStatus']=null;

  switch(skillKey){
    case '1101':
      targetStatus=Object.freeze({
        chance:row.stunChance!,
        effect:status('s36-stun-heavy','stun',skillKey,level,null,1,Object.freeze({})),
      });
      break;
    case '1201':
      break;
    case '1301':
      selfStatus=status('s36-strong-defence','defense-modifier',skillKey,level,row.durationMs,0,
        Object.freeze({defenseFlat:row.defenseFlatBonus!}));
      break;
    case '1401':
      selfStatus=status('s36-burst','composite',skillKey,level,row.durationMs,0,Object.freeze({
        attackFlat:row.attackFlatBonus!,
        maxHpFlat:row.maxHpFlatBonus!,
        defenseFlat:-row.defenseFlatPenalty!,
      }));
      break;
    case '1501':
      selfStatus=status('s36-sacrifice','composite',skillKey,level,row.durationMs,0,Object.freeze({
        attackFlat:row.attackFlatBonus!,
        periodicSelfDamage:Object.freeze({
          amount:row.periodicSelfDamage!.amount,
          intervalMs:row.periodicSelfDamage!.intervalMs,
          elapsedMs:0,
          minimumHp:row.periodicSelfDamage!.minimumHp,
        }),
      }));
      break;
    case 'battle-command':
      selfStatus=status('s36-battle-command','composite',skillKey,level,row.durationMs,0,Object.freeze({
        commandRangeFlat:row.commandRangeBonus!,
        readinessEfficiencyMultiplier:1+row.readinessEfficiencyBonus!,
      }));
      break;
    case 'stun-strike':
      targetStatus=Object.freeze({
        chance:targetRank==='boss'?row.bossStunChance!:row.stunChance!,
        effect:status('s36-stun-strike','stun',skillKey,level,null,1,Object.freeze({})),
      });
      break;
  }

  return Object.freeze({
    skillKey,skillLevel:level,target:skill.target,mpCost:row.mpCost,readinessCost:row.readinessCost,
    hitMultipliers:row.hitMultipliers,independentHitRolls:row.independentHitRolls,
    targetStatus,selfStatus,provenance:'RECONSTRUCTION_POLICY',
  });
}

export function m7SwordsmanEffectiveStats(
  state:M7SwordsmanCombatState,
  baseDefense=0,
):M7SwordsmanEffectiveStats{
  const current=validateM7SwordsmanCombatState(state);
  finiteNonNegative(baseDefense,'base defense');
  return Object.freeze({
    maxHp:m7EffectiveMaxHp(current.baseMaxHp,current.statuses),
    physicalAttack:m7EffectivePhysicalAttack(current.basePhysicalAttack,current.statuses),
    defense:m7EffectiveDefense(baseDefense,current.statuses),
    commandRange:m7EffectiveCommandRange(current.baseCommandRange,current.statuses),
    readinessEfficiencyMultiplier:m7ReadinessEfficiencyMultiplier(current.statuses),
  });
}

export function consumeM7SwordsmanSkillResources(
  state:M7SwordsmanCombatState,
  plan:M7SwordsmanSkillPlan,
):M7SwordsmanCombatState{
  const current=validateM7SwordsmanCombatState(state);
  if(current.currentMp<plan.mpCost)throw new Error('Not enough MP');
  if(current.readiness<plan.readinessCost)throw new Error('Not enough readiness');
  return validateM7SwordsmanCombatState({
    ...current,
    currentMp:current.currentMp-plan.mpCost,
    readiness:current.readiness-plan.readinessCost,
  });
}

export function applyM7SwordsmanSelfSkillWithEvents(
  state:M7SwordsmanCombatState,
  skillKey:M7SwordsmanSkillKey,
  level:M7SkillLevel,
):M7SwordsmanSelfSkillResult{
  const plan=planM7SwordsmanSkillUse(skillKey,level);
  if(plan.target!=='self'||!plan.selfStatus)throw new Error(`${skillKey} is not a self skill`);
  let current=consumeM7SwordsmanSkillResources(state,plan);
  const oldMax=m7EffectiveMaxHp(current.baseMaxHp,current.statuses);
  const statuses=upsertM7Status(current.statuses,plan.selfStatus);
  const newMax=m7EffectiveMaxHp(current.baseMaxHp,statuses);
  const gainedMax=Math.max(0,newMax-oldMax);
  current=validateM7SwordsmanCombatState({
    ...current,
    currentHp:Math.min(newMax,current.currentHp+gainedMax),
    statuses,
  });
  return Object.freeze({
    state:current,
    events:Object.freeze([event(selfFeedbackType(skillKey),skillKey,level,'player',{
      statusId:plan.selfStatus.id,durationMs:plan.selfStatus.remainingMs,
    })]),
  });
}

export function applyM7SwordsmanSelfSkill(
  state:M7SwordsmanCombatState,
  skillKey:M7SwordsmanSkillKey,
  level:M7SkillLevel,
):M7SwordsmanCombatState{
  return applyM7SwordsmanSelfSkillWithEvents(state,skillKey,level).state;
}

export function applyM7SwordsmanTargetStatus(
  statuses:readonly M7StatusEffect[],
  plan:M7SwordsmanSkillPlan,
  randomRoll:number,
  targetId='enemy',
):Readonly<{applied:boolean;statuses:readonly M7StatusEffect[];events:readonly M7SwordsmanCombatEvent[]}>
{
  if(!plan.targetStatus)return Object.freeze({applied:false,statuses:Object.freeze(statuses.map(validateM7StatusEffect)),events:Object.freeze([])});
  if(typeof randomRoll!=='number'||!Number.isFinite(randomRoll)||randomRoll<0||randomRoll>=1)throw new Error('Random roll must be [0,1)');
  if(randomRoll>=plan.targetStatus.chance)return Object.freeze({applied:false,statuses:Object.freeze(statuses.map(validateM7StatusEffect)),events:Object.freeze([])});
  return Object.freeze({
    applied:true,
    statuses:upsertM7Status(statuses,plan.targetStatus.effect),
    events:Object.freeze([event('STUN_APPLIED',plan.skillKey,plan.skillLevel,targetId,{statusId:plan.targetStatus.effect.id})]),
  });
}

export function m7SwordsmanDamageEvents(
  plan:M7SwordsmanSkillPlan,
  targetId:string,
  hitDamageAmounts:readonly number[],
):readonly M7SwordsmanCombatEvent[]{
  if(plan.target!=='enemy')throw new Error('Self skill cannot emit damage events');
  if(typeof targetId!=='string'||!targetId.length)throw new Error('Invalid damage target');
  if(hitDamageAmounts.length>plan.hitMultipliers.length)throw new Error('Too many damage hits for skill plan');
  return Object.freeze(hitDamageAmounts.map(amount=>{
    if(typeof amount!=='number'||!Number.isFinite(amount)||amount<0)throw new Error('Invalid damage amount');
    return event('DAMAGE',plan.skillKey,plan.skillLevel,targetId,{amount});
  }));
}

export function advanceM7SwordsmanCombatState(
  state:M7SwordsmanCombatState,
  elapsedMs:number,
):M7SwordsmanAdvanceResult{
  const current=validateM7SwordsmanCombatState(state);
  const beforeById=new Map(current.statuses.map(status=>[status.id,status] as const));
  const advanced=advanceM7Statuses(current.currentHp,current.baseMaxHp,current.statuses,elapsedMs);
  const afterIds=new Set(advanced.statuses.map(status=>status.id));
  const events:M7SwordsmanCombatEvent[]=[];

  for(const raw of advanced.events){
    if(raw.sourceSkillKey==='1501'){
      events.push(event('SACRIFICE_TICK','1501',skillLevel(raw.sourceSkillLevel),'player',{
        amount:raw.hpLost,ticks:raw.ticks,statusId:'s36-sacrifice',
      }));
    }
  }
  for(const [id,ended] of beforeById){
    if(ended.remainingMs!==null&&!afterIds.has(id)){
      const key=ended.sourceSkillKey as M7SwordsmanSkillKey;
      if((['1101','1201','1301','1401','1501','battle-command','stun-strike'] as readonly string[]).includes(key)){
        events.push(event('STATUS_ENDED',key,skillLevel(ended.sourceSkillLevel),ended.kind==='stun'?'enemy':'player',{statusId:id}));
      }
    }
  }

  return Object.freeze({
    state:validateM7SwordsmanCombatState({...current,currentHp:advanced.currentHp,statuses:advanced.statuses}),
    events:Object.freeze(events),
  });
}

export function m7IncomingDamageAfterSwordsmanStatuses(
  state:M7SwordsmanCombatState,
  amount:number,
  kind:'physical'|'magic',
):number{
  const current=validateM7SwordsmanCombatState(state);
  return m7AdjustIncomingDamage(amount,kind,current.statuses);
}

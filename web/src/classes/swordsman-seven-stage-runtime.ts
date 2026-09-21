import {
  m7AdjustIncomingDamage,
  m7EffectiveCommandRange,
  m7EffectiveMaxHp,
  m7EffectivePhysicalAttack,
  m7ReadinessEfficiencyMultiplier,
  upsertM7Status,
  validateM7StatusEffect,
  advanceM7Statuses,
} from '../combat/m7-status-effects.ts';
import type {M7StatusEffect,M7StatusAdvanceEvent} from '../combat/m7-status-effects.ts';
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
  commandRange:number;
  readinessEfficiencyMultiplier:number;
}>;

export type M7SwordsmanAdvanceResult = Readonly<{
  state:M7SwordsmanCombatState;
  events:readonly M7StatusAdvanceEvent[];
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
  skillLevel:M7SkillLevel,
  remainingMs:number|null,
  blockedActions:number,
  modifiers:M7StatusEffect['modifiers'],
):M7StatusEffect{
  return validateM7StatusEffect({
    id,kind,sourceSkillKey:skillKey,sourceSkillLevel:skillLevel,
    remainingMs,blockedActions,stacking:'refresh',modifiers,provenance:'RECONSTRUCTION_POLICY',
  });
}

export function planM7SwordsmanSkillUse(
  skillKey:M7SwordsmanSkillKey,
  skillLevel:M7SkillLevel,
  targetRank:M7EnemyRank='normal',
):M7SwordsmanSkillPlan{
  const skill=m7SwordsmanSkill(skillKey);
  const row=m7SwordsmanSkillLevel(skillKey,skillLevel);
  let selfStatus:M7StatusEffect|null=null;
  let targetStatus:M7SwordsmanSkillPlan['targetStatus']=null;

  switch(skillKey){
    case '1101':
      targetStatus=Object.freeze({
        chance:row.stunChance!,
        effect:status('s31-stun-heavy','stun',skillKey,skillLevel,null,1,Object.freeze({})),
      });
      break;
    case '1201':
      break;
    case '1301':
      selfStatus=status('s31-strong-defence','physical-damage-reduction',skillKey,skillLevel,row.durationMs,0,
        Object.freeze({physicalDamageReduction:row.physicalDamageReduction!}));
      break;
    case '1401':
      selfStatus=status('s31-burst','composite',skillKey,skillLevel,row.durationMs,0,Object.freeze({
        attackMultiplier:1+row.attackBonus!,
        maxHpMultiplier:1+row.maxHpBonus!,
        incomingPhysicalDamageMultiplier:1+row.incomingPhysicalDamagePenalty!,
      }));
      break;
    case '1501':
      selfStatus=status('s31-sacrifice','composite',skillKey,skillLevel,row.durationMs,0,Object.freeze({
        attackMultiplier:1+row.attackBonus!,
        periodicSelfDamage:Object.freeze({
          amount:row.periodicSelfDamage!.amount,
          intervalMs:row.periodicSelfDamage!.intervalMs,
          elapsedMs:0,
          minimumHp:row.periodicSelfDamage!.minimumHp,
        }),
      }));
      break;
    case 'battle-command':
      selfStatus=status('s31-battle-command','composite',skillKey,skillLevel,row.durationMs,0,Object.freeze({
        commandRangeFlat:row.commandRangeBonus!,
        readinessEfficiencyMultiplier:1+row.readinessEfficiencyBonus!,
      }));
      break;
    case 'stun-strike':
      targetStatus=Object.freeze({
        chance:targetRank==='boss'?row.bossStunChance!:row.stunChance!,
        effect:status('s31-stun-strike','stun',skillKey,skillLevel,null,1,Object.freeze({})),
      });
      break;
  }

  return Object.freeze({
    skillKey,skillLevel,target:skill.target,mpCost:row.mpCost,readinessCost:row.readinessCost,
    hitMultipliers:row.hitMultipliers,independentHitRolls:row.independentHitRolls,
    targetStatus,selfStatus,provenance:'RECONSTRUCTION_POLICY',
  });
}

export function m7SwordsmanEffectiveStats(state:M7SwordsmanCombatState):M7SwordsmanEffectiveStats{
  const current=validateM7SwordsmanCombatState(state);
  return Object.freeze({
    maxHp:m7EffectiveMaxHp(current.baseMaxHp,current.statuses),
    physicalAttack:m7EffectivePhysicalAttack(current.basePhysicalAttack,current.statuses),
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

export function applyM7SwordsmanSelfSkill(
  state:M7SwordsmanCombatState,
  skillKey:M7SwordsmanSkillKey,
  skillLevel:M7SkillLevel,
):M7SwordsmanCombatState{
  const plan=planM7SwordsmanSkillUse(skillKey,skillLevel);
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
  return current;
}

export function applyM7SwordsmanTargetStatus(
  statuses:readonly M7StatusEffect[],
  plan:M7SwordsmanSkillPlan,
  randomRoll:number,
):Readonly<{applied:boolean;statuses:readonly M7StatusEffect[]}>
{
  if(!plan.targetStatus)return Object.freeze({applied:false,statuses:Object.freeze(statuses.map(validateM7StatusEffect))});
  if(typeof randomRoll!=='number'||!Number.isFinite(randomRoll)||randomRoll<0||randomRoll>=1)throw new Error('Random roll must be [0,1)');
  if(randomRoll>=plan.targetStatus.chance)return Object.freeze({applied:false,statuses:Object.freeze(statuses.map(validateM7StatusEffect))});
  return Object.freeze({applied:true,statuses:upsertM7Status(statuses,plan.targetStatus.effect)});
}

export function advanceM7SwordsmanCombatState(
  state:M7SwordsmanCombatState,
  elapsedMs:number,
):M7SwordsmanAdvanceResult{
  const current=validateM7SwordsmanCombatState(state);
  const advanced=advanceM7Statuses(current.currentHp,current.baseMaxHp,current.statuses,elapsedMs);
  return Object.freeze({
    state:validateM7SwordsmanCombatState({...current,currentHp:advanced.currentHp,statuses:advanced.statuses}),
    events:advanced.events,
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

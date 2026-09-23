import {
  M7_WIZARD_RUNTIME_POLICY,
  m7WizardSkillLevel,
} from './wizard-seven-stage.ts';
import type {
  M7WizardSkillKey,
  M7WizardSkillLevel,
} from './wizard-seven-stage.ts';

export type M7WizardPoisonStatus=Readonly<{
  remainingMs:number;
  tickIntervalMs:number;
  tickClockMs:number;
  ticksRemaining:number;
  initialDamage:number;
  damagePerTick:number;
}>;

export type M7WizardNatureForceStatus=Readonly<{
  remainingMs:number|null;
  battlePersistent:boolean;
  drainMin:number;
  drainMax:number;
}>;

export type M7WizardAccuracyStatus=Readonly<{
  remainingMs:number;
  physicalHitModifier:number;
  magicHitModifier:number;
  rangeReductionCells:number;
}>;

export type M7WizardCursedSwordStatus=Readonly<{
  remainingMs:number;
  nextPhysicalDamageMultiplier:number;
}>;

export type M7WizardStatusState=Readonly<{
  darkVeil:M7WizardAccuracyStatus|null;
  poison:M7WizardPoisonStatus|null;
  natureForce:M7WizardNatureForceStatus|null;
  healingBlockedMs:number;
  petrifiedMs:number;
  blind:M7WizardAccuracyStatus|null;
  cursedSword:M7WizardCursedSwordStatus|null;
}>;

export type M7WizardTickResult=Readonly<{
  state:M7WizardStatusState;
  poisonDamage:number;
}>;

export type M7WizardPoisonDamageProfile=Readonly<{
  initialDamage:number;
  followupDamage:number;
  tickIntervalMs:number;
  followupTicks:number;
}>;

export type M7WizardHealingResult=Readonly<{
  hp:number;
  applied:number;
  blocked:boolean;
}>;

export type M7WizardManaDrainResult=Readonly<{
  casterMp:number;
  targetMp:number;
  drained:number;
}>;

export type M7WizardCursedDamageResult=Readonly<{
  state:M7WizardStatusState;
  damage:number;
  multiplier:number;
  consumed:boolean;
}>;

function finiteNonNegative(value:number,name:string):number{
  if(!Number.isFinite(value)||value<0)throw new Error('Invalid '+name);
  return value;
}
function clamp01(value:number):number{
  if(!Number.isFinite(value))throw new Error('Invalid normalized roll');
  return Math.max(0,Math.min(0.999999,value));
}
function numberParam(params:Readonly<Record<string,number|boolean>>,key:string):number{
  const value=params[key];
  if(typeof value!=='number'||!Number.isFinite(value))throw new Error('Missing numeric wizard skill parameter '+key);
  return value;
}
function boolParam(params:Readonly<Record<string,number|boolean>>,key:string):boolean{
  const value=params[key];
  if(typeof value!=='boolean')throw new Error('Missing boolean wizard skill parameter '+key);
  return value;
}
function decayAccuracy(status:M7WizardAccuracyStatus|null,deltaMs:number):M7WizardAccuracyStatus|null{
  if(!status)return null;
  const remainingMs=Math.max(0,status.remainingMs-deltaMs);
  return remainingMs>0?Object.freeze({...status,remainingMs}):null;
}

export function m7WizardPoisonDamageProfile(
  level:M7WizardSkillLevel,
  intelligence:number,
):M7WizardPoisonDamageProfile{
  finiteNonNegative(intelligence,'wizard intelligence');
  const params=m7WizardSkillLevel('poison-mist',level);
  const initialDamage=Math.max(1,Math.round(
    numberParam(params,'baseDamage')+intelligence*numberParam(params,'intScale'),
  ));
  const ratio=numberParam(params,'followupDamageRatio');
  if(Math.abs(ratio-M7_WIZARD_RUNTIME_POLICY.poisonFollowupDamageRatio)>1e-9){
    throw new Error('Poison follow-up ratio drift');
  }
  const followupTicks=numberParam(params,'ticks');
  if(followupTicks!==M7_WIZARD_RUNTIME_POLICY.poisonFollowupTicks){
    throw new Error('Poison follow-up tick-count drift');
  }
  return Object.freeze({
    initialDamage,
    followupDamage:Math.max(1,Math.round(initialDamage*ratio)),
    tickIntervalMs:numberParam(params,'tickIntervalMs'),
    followupTicks,
  });
}

export function createM7WizardStatusState():M7WizardStatusState{
  return Object.freeze({
    darkVeil:null,
    poison:null,
    natureForce:null,
    healingBlockedMs:0,
    petrifiedMs:0,
    blind:null,
    cursedSword:null,
  });
}

export function applyM7WizardSkillStatus(
  current:M7WizardStatusState,
  key:M7WizardSkillKey,
  level:M7WizardSkillLevel,
  context:Readonly<{intelligence?:number}>={},
):M7WizardStatusState{
  const params=m7WizardSkillLevel(key,level);
  const durationMs=numberParam(params,'durationMs');
  switch(key){
    case 'dark-veil':
      return Object.freeze({
        ...current,
        darkVeil:Object.freeze({
          remainingMs:durationMs,
          physicalHitModifier:numberParam(params,'physicalHitModifier'),
          magicHitModifier:numberParam(params,'magicHitModifier'),
          rangeReductionCells:0,
        }),
      });
    case 'poison-mist':{
      const profile=m7WizardPoisonDamageProfile(level,context.intelligence??0);
      return Object.freeze({
        ...current,
        poison:Object.freeze({
          remainingMs:durationMs,
          tickIntervalMs:profile.tickIntervalMs,
          tickClockMs:0,
          ticksRemaining:profile.followupTicks,
          initialDamage:profile.initialDamage,
          damagePerTick:profile.followupDamage,
        }),
      });
    }
    case 'nature-force':{
      const battlePersistent=boolParam(params,'battlePersistent');
      return Object.freeze({
        ...current,
        natureForce:Object.freeze({
          remainingMs:battlePersistent?null:durationMs,
          battlePersistent,
          drainMin:numberParam(params,'drainMin'),
          drainMax:numberParam(params,'drainMax'),
        }),
      });
    }
    case 'ashes':
      if(!boolParam(params,'healingBlocked'))throw new Error('Ashes must block healing');
      return Object.freeze({...current,healingBlockedMs:durationMs});
    case 'curse-eye':
      if(!boolParam(params,'petrified')||boolParam(params,'ordinaryAttackTargetable')){
        throw new Error('Curse Eye petrify contract drift');
      }
      return Object.freeze({...current,petrifiedMs:durationMs});
    case 'blindness':
      return Object.freeze({
        ...current,
        blind:Object.freeze({
          remainingMs:durationMs,
          physicalHitModifier:numberParam(params,'physicalHitModifier'),
          magicHitModifier:numberParam(params,'magicHitModifier'),
          rangeReductionCells:numberParam(params,'rangeReductionCells'),
        }),
      });
    case 'cursed-sword':
      return Object.freeze({
        ...current,
        cursedSword:Object.freeze({
          remainingMs:durationMs,
          nextPhysicalDamageMultiplier:numberParam(params,'nextPhysicalDamageMultiplier'),
        }),
      });
  }
}

export function tickM7WizardStatus(
  current:M7WizardStatusState,
  deltaMs:number,
):M7WizardTickResult{
  finiteNonNegative(deltaMs,'wizard status delta');
  let poisonDamage=0;
  let poison:M7WizardPoisonStatus|null=current.poison;
  if(poison){
    const activeMs=Math.min(deltaMs,poison.remainingMs);
    let tickClockMs=poison.tickClockMs+activeMs;
    let ticksRemaining=poison.ticksRemaining;
    while(tickClockMs>=poison.tickIntervalMs&&ticksRemaining>0){
      tickClockMs-=poison.tickIntervalMs;
      ticksRemaining-=1;
      poisonDamage+=poison.damagePerTick;
    }
    const remainingMs=Math.max(0,poison.remainingMs-deltaMs);
    poison=remainingMs>0&&ticksRemaining>0
      ?Object.freeze({...poison,remainingMs,tickClockMs,ticksRemaining})
      :null;
  }
  const natureForce=current.natureForce
    ?current.natureForce.battlePersistent
      ?current.natureForce
      :Math.max(0,(current.natureForce.remainingMs??0)-deltaMs)>0
        ?Object.freeze({...current.natureForce,remainingMs:Math.max(0,(current.natureForce.remainingMs??0)-deltaMs)})
        :null
    :null;
  const cursedSword=current.cursedSword
    ?Math.max(0,current.cursedSword.remainingMs-deltaMs)>0
      ?Object.freeze({...current.cursedSword,remainingMs:Math.max(0,current.cursedSword.remainingMs-deltaMs)})
      :null
    :null;
  return Object.freeze({
    state:Object.freeze({
      darkVeil:decayAccuracy(current.darkVeil,deltaMs),
      poison,
      natureForce,
      healingBlockedMs:Math.max(0,current.healingBlockedMs-deltaMs),
      petrifiedMs:Math.max(0,current.petrifiedMs-deltaMs),
      blind:decayAccuracy(current.blind,deltaMs),
      cursedSword,
    }),
    poisonDamage,
  });
}

export function m7WizardActiveStatusKeys(status:M7WizardStatusState):readonly M7WizardSkillKey[]{
  const active:M7WizardSkillKey[]=[];
  if(status.darkVeil)active.push('dark-veil');
  if(status.poison)active.push('poison-mist');
  if(status.natureForce)active.push('nature-force');
  if(status.healingBlockedMs>0)active.push('ashes');
  if(status.petrifiedMs>0)active.push('curse-eye');
  if(status.blind)active.push('blindness');
  if(status.cursedSword)active.push('cursed-sword');
  return Object.freeze(active);
}

export function m7WizardCanAct(status:M7WizardStatusState):boolean{
  return status.petrifiedMs<=0;
}
export function m7WizardOrdinaryAttackTargetable(status:M7WizardStatusState):boolean{
  return status.petrifiedMs<=0;
}
export function m7WizardAccuracyModifiers(status:M7WizardStatusState):Readonly<{
  physicalHitModifier:number;
  magicHitModifier:number;
}>{
  return Object.freeze({
    physicalHitModifier:(status.darkVeil?.physicalHitModifier??0)+(status.blind?.physicalHitModifier??0),
    magicHitModifier:(status.darkVeil?.magicHitModifier??0)+(status.blind?.magicHitModifier??0),
  });
}
export function m7WizardEffectiveRangeCells(baseRange:number,status:M7WizardStatusState):number{
  finiteNonNegative(baseRange,'base attack range');
  return Math.max(0,baseRange-(status.blind?.rangeReductionCells??0));
}
export function applyM7WizardHealing(
  status:M7WizardStatusState,
  currentHp:number,
  maxHp:number,
  amount:number,
):M7WizardHealingResult{
  finiteNonNegative(currentHp,'current hp');
  finiteNonNegative(maxHp,'maximum hp');
  finiteNonNegative(amount,'healing amount');
  const hp=Math.min(currentHp,maxHp);
  if(status.healingBlockedMs>0)return Object.freeze({hp,applied:0,blocked:true});
  const next=Math.min(maxHp,hp+amount);
  return Object.freeze({hp:next,applied:next-hp,blocked:false});
}
export function applyM7NatureForceStaffHit(
  status:M7WizardStatusState,
  casterMp:number,
  casterMaxMp:number,
  targetMp:number,
  roll=0,
):M7WizardManaDrainResult{
  finiteNonNegative(casterMp,'caster mp');
  finiteNonNegative(casterMaxMp,'caster maximum mp');
  finiteNonNegative(targetMp,'target mp');
  if(!status.natureForce)return Object.freeze({
    casterMp:Math.min(casterMp,casterMaxMp),
    targetMp,
    drained:0,
  });
  const {drainMin,drainMax}=status.natureForce;
  const rolled=drainMin+Math.floor(clamp01(roll)*(drainMax-drainMin+1));
  const room=Math.max(0,casterMaxMp-casterMp);
  const drained=Math.min(targetMp,room,rolled);
  return Object.freeze({
    casterMp:Math.min(casterMaxMp,casterMp+drained),
    targetMp:Math.max(0,targetMp-drained),
    drained,
  });
}
export function consumeM7CursedSwordPhysicalWindow(
  status:M7WizardStatusState,
  baseDamage:number,
):M7WizardCursedDamageResult{
  finiteNonNegative(baseDamage,'physical damage');
  const curse=status.cursedSword;
  if(!curse)return Object.freeze({state:status,damage:baseDamage,multiplier:1,consumed:false});
  return Object.freeze({
    state:Object.freeze({...status,cursedSword:null}),
    damage:baseDamage*curse.nextPhysicalDamageMultiplier,
    multiplier:curse.nextPhysicalDamageMultiplier,
    consumed:true,
  });
}

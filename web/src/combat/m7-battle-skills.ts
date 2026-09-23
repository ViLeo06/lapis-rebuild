import type {BattleEvent,BattleState,Enemy} from '../battle.ts';
import {PROVISIONAL as P} from '../config.ts';
import {pixelCell,tileDistance} from '../tactics.ts';
import {DEFAULT_RECONSTRUCTION_COMBAT_BALANCE} from './reconstruction-combat-balance.ts';
import {
  advanceM7Statuses,
  consumeM7BlockedAction,
  m7EffectiveMaxHp,
  m7EffectivePhysicalAttack,
} from './m7-status-effects.ts';
import {
  applyM7SwordsmanSelfSkill,
  applyM7SwordsmanTargetStatus,
  consumeM7SwordsmanSkillResources,
  planM7SwordsmanSkillUse,
} from '../classes/swordsman-seven-stage-runtime.ts';
import type {M7SwordsmanCombatState} from '../classes/swordsman-seven-stage-runtime.ts';
import type {M7SwordsmanSkillKey} from '../classes/swordsman-seven-stage-skills.ts';
import {
  applyM7WizardHealing,
  applyM7WizardSkillStatus,
  consumeM7CursedSwordPhysicalWindow,
  m7WizardAccuracyModifiers,
  m7WizardCanAct,
  m7WizardEffectiveRangeCells,
  m7WizardOrdinaryAttackTargetable,
  tickM7WizardStatus,
} from '../content/skills/wizard-seven-stage-runtime.ts';
import {m7WizardSkillByKey,m7WizardSkillLevel} from '../content/skills/wizard-seven-stage.ts';
import type {M7WizardSkillKey} from '../content/skills/wizard-seven-stage.ts';
import type {M7RuntimeSkillCommand} from '../training/m7-skill-progression.ts';
import {activeEnemyEncounterGroup} from './m7-encounter-groups.ts';
import {
  affectedM7GridTargets,
  m7PoisonGeometry,
  validateM7CastCell,
} from './m7-grid-targeting.ts';
import type {M7GridCell} from './m7-grid-targeting.ts';

export const M7_WIZARD_INTELLIGENCE_BRIDGE_POLICY=Object.freeze({
  id:'M7WizardIntelligenceBridgePolicy',
  provenance:'RECONSTRUCTION_POLICY' as const,
  source:'current reconstruction combat magicAttack is used as the runtime INT bridge until a dedicated base-attribute system exists',
});

export type M7WizardFeedbackEventKind=
  |'DARK_VEIL_APPLIED'
  |'POISON_INITIAL_DAMAGE'
  |'NATURE_FORCE_APPLIED'
  |'HEALING_BLOCK_APPLIED'
  |'PETRIFY_APPLIED'
  |'BLIND_APPLIED'
  |'CURSE_WINDOW_APPLIED';

export type M7WizardFeedbackEvent=Readonly<{
  kind:M7WizardFeedbackEventKind;
  skillKey:M7WizardSkillKey;
  skillLevel:number;
  targetId:'player'|string;
  targetCell:M7GridCell;
  damageAmount?:number;
  eventTimeMs:number;
  provenance:'RECONSTRUCTION_POLICY'|'RECOVERED_SECONDARY'|'VERIFIED-STATIC-ORIGINAL';
}>;

export type M7BattleFeedbackEvent=BattleEvent&Readonly<{
  effect?:'POISON_INITIAL_DAMAGE'|'POISON_TICK';
  targetCell?:M7GridCell;
  eventTimeMs?:number;
}>;

export type M7SkillUseResult=Readonly<{
  ok:boolean;
  message:string;
  events:readonly BattleEvent[];
  affectedEnemyIds:readonly string[];
  feedbackEvents?:readonly M7WizardFeedbackEvent[];
}>;

export type M7SkillTargetSelection=Readonly<{
  targetId?:string|null;
  targetCell?:M7GridCell|null;
}>;

function randomUnit(state:BattleState):number{
  state.rngState=(Math.imul(state.rngState,1664525)+1013904223)>>>0;
  return state.rngState/0x100000000;
}

function ready(state:BattleState):boolean{
  return state.phase==='active'&&state.action>=state.actionMax&&state.cooldown<=0;
}

function spend(state:BattleState,mpCost:number,readinessCost:number):string|null{
  if(!ready(state))return '行动槽尚未蓄满';
  if(state.mp<mpCost)return 'MP 不足';
  if(!Number.isFinite(readinessCost)||readinessCost<=0)return 'Invalid M7 readiness cost';
  state.mp-=mpCost;
  state.action=Math.max(0,state.action-readinessCost);
  return null;
}

function liveTarget(state:BattleState,targetId:string):Enemy|null{
  return state.enemies.find(enemy=>enemy.id===targetId&&enemy.hp>0)??null;
}

const M7_BATTLE_EVENT_CLOCK_MS=new WeakMap<BattleState,number>();

function m7BattleEventTimeMs(state:BattleState):number{
  return M7_BATTLE_EVENT_CLOCK_MS.get(state)??0;
}

function eventForEnemy(
  state:BattleState,
  enemy:Enemy,
  before:number,
  effect?:M7BattleFeedbackEvent['effect'],
  source:'player'|'poison'='player',
):M7BattleFeedbackEvent|null{
  if(enemy.hp>=before)return null;
  return Object.freeze({
    kind:'hp-loss' as const,
    target:enemy.id,
    source,
    amount:before-enemy.hp,
    resultingHp:enemy.hp,
    provenance:'RECONSTRUCTION_POLICY' as const,
    ...(effect?{effect,targetCell:pixelCell(enemy.x,enemy.y),eventTimeMs:m7BattleEventTimeMs(state)}:{}),
  });
}

function wizardFeedback(
  state:BattleState,
  command:M7RuntimeSkillCommand,
  kind:M7WizardFeedbackEventKind,
  targetId:'player'|string,
  targetCell:M7GridCell,
  damageAmount?:number,
):M7WizardFeedbackEvent{
  return Object.freeze({
    kind,
    skillKey:command.skillKey as M7WizardSkillKey,
    skillLevel:command.skillLevel,
    targetId,
    targetCell:Object.freeze([targetCell[0],targetCell[1]] as const),
    ...(typeof damageAmount==='number'?{damageAmount}:{}),
    eventTimeMs:m7BattleEventTimeMs(state),
    provenance:kind==='POISON_INITIAL_DAMAGE'?'RECONSTRUCTION_POLICY':'RECONSTRUCTION_POLICY',
  });
}

function wizardFeedbackKind(key:M7WizardSkillKey):M7WizardFeedbackEventKind{
  switch(key){
    case 'dark-veil':return 'DARK_VEIL_APPLIED';
    case 'poison-mist':return 'POISON_INITIAL_DAMAGE';
    case 'nature-force':return 'NATURE_FORCE_APPLIED';
    case 'ashes':return 'HEALING_BLOCK_APPLIED';
    case 'curse-eye':return 'PETRIFY_APPLIED';
    case 'blindness':return 'BLIND_APPLIED';
    case 'cursed-sword':return 'CURSE_WINDOW_APPLIED';
  }
}

function swordsmanState(state:BattleState):M7SwordsmanCombatState{
  const stats=state.combatPlayerStats;
  if(!stats)throw new Error('M7 swordsman runtime requires reconstruction combat stats');
  return Object.freeze({
    baseMaxHp:stats.maxHp,
    basePhysicalAttack:stats.attack,
    baseCommandRange:1,
    currentHp:state.hp,
    currentMp:state.mp,
    readiness:state.action,
    statuses:state.playerM7Status.swordsman,
  });
}

function applySwordsmanResult(state:BattleState,next:M7SwordsmanCombatState):void{
  const stats=state.combatPlayerStats;
  if(!stats)throw new Error('M7 swordsman runtime requires reconstruction combat stats');
  state.hp=next.currentHp;
  state.mp=next.currentMp;
  state.action=next.readiness;
  state.playerM7Status=Object.freeze({...state.playerM7Status,swordsman:next.statuses});
  state.maxHp=m7EffectiveMaxHp(stats.maxHp,next.statuses);
  state.hp=Math.min(state.hp,state.maxHp);
}

function useSwordsman(
  state:BattleState,
  targetId:string,
  x:number,
  y:number,
  command:M7RuntimeSkillCommand,
):M7SkillUseResult{
  const key=command.skillKey as M7SwordsmanSkillKey;
  const plan=planM7SwordsmanSkillUse(key,command.skillLevel,state.enemies.find(e=>e.id===targetId)?.combatStats?.rank??'normal');
  if(!ready(state))return Object.freeze({ok:false,message:'行动槽尚未蓄满',events:[],affectedEnemyIds:[]});
  if(state.mp<plan.mpCost)return Object.freeze({ok:false,message:'MP 不足',events:[],affectedEnemyIds:[]});

  if(plan.target==='self'){
    const next=applyM7SwordsmanSelfSkill(swordsmanState(state),key,command.skillLevel);
    applySwordsmanResult(state,next);
    return Object.freeze({ok:true,message:`${command.displayName} Lv.${command.skillLevel} / RECONSTRUCTION_POLICY`,events:[],affectedEnemyIds:[]});
  }

  const enemy=liveTarget(state,targetId);
  if(!enemy)return Object.freeze({ok:false,message:'请选择存活目标',events:[],affectedEnemyIds:[]});
  if(enemy.encounterGroup!==activeEnemyEncounterGroup(state,x,y))return Object.freeze({ok:false,message:'该敌群尚未进入当前交互范围',events:[],affectedEnemyIds:[]});
  if(tileDistance(pixelCell(x,y),pixelCell(enemy.x,enemy.y))>1)return Object.freeze({ok:false,message:'目标超出技能射程（1格）',events:[],affectedEnemyIds:[]});
  if(!state.combatPlayerStats||!enemy.combatStats)return Object.freeze({ok:false,message:'M7 combat stats unavailable',events:[],affectedEnemyIds:[]});

  const paid=consumeM7SwordsmanSkillResources(swordsmanState(state),plan);
  applySwordsmanResult(state,paid);
  const attack=m7EffectivePhysicalAttack(state.combatPlayerStats.attack,state.playerM7Status.swordsman);
  const attacker=Object.freeze({...state.combatPlayerStats,attack});
  const multiplier=plan.hitMultipliers[0]??1;
  const resolution=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.resolveAttack(
    attacker,
    enemy.combatStats,
    {kind:'physical',multiplier,hits:Math.max(1,plan.hitMultipliers.length)},
    ()=>randomUnit(state),
  );
  let damage=resolution.totalDamage;
  const curse=consumeM7CursedSwordPhysicalWindow(enemy.m7Status.wizard,damage);
  damage=curse.damage;
  enemy.m7Status=Object.freeze({...enemy.m7Status,wizard:curse.state});
  const before=enemy.hp;
  enemy.hp=Math.max(0,enemy.hp-damage);

  const targetStatus=applyM7SwordsmanTargetStatus(enemy.m7Status.swordsman,plan,randomUnit(state));
  enemy.m7Status=Object.freeze({...enemy.m7Status,swordsman:targetStatus.statuses});
  const event=eventForEnemy(state,enemy,before);
  return Object.freeze({
    ok:true,
    message:`${command.displayName} Lv.${command.skillLevel} / RECONSTRUCTION_POLICY`,
    events:event?Object.freeze([event]):Object.freeze([]),
    affectedEnemyIds:Object.freeze([enemy.id]),
  });
}

function numeric(params:Readonly<Record<string,number|boolean>>,key:string):number|undefined{
  const value=params[key];
  return typeof value==='number'&&Number.isFinite(value)?value:undefined;
}

function authoredAreaCode(key:M7WizardSkillKey):number|null{
  const raw=m7WizardSkillByKey(key).authoredLv1?.area;
  return typeof raw==='number'&&Number.isInteger(raw)&&raw>=1&&raw<=4?raw:null;
}

function wizardTargets(
  state:BattleState,
  selected:Enemy,
  key:M7WizardSkillKey,
  level:number,
):readonly Enemy[]{
  const params=m7WizardSkillLevel(key,level);
  const configured=numeric(params,'areaCode');
  const areaCode=configured!==undefined?configured:authoredAreaCode(key);
  if(areaCode===null||areaCode<=0)return Object.freeze([selected]);
  return affectedM7GridTargets(
    state.enemies,
    pixelCell(selected.x,selected.y),
    areaCode,
    selected.encounterGroup,
  );
}

function refundWizardSpend(state:BattleState,command:M7RuntimeSkillCommand):void{
  state.mp+=command.mpCost;
  state.action=Math.min(state.actionMax,state.action+command.readinessCost);
}

function useWizard(
  state:BattleState,
  selection:M7SkillTargetSelection,
  x:number,
  y:number,
  command:M7RuntimeSkillCommand,
):M7SkillUseResult{
  const key=command.skillKey as M7WizardSkillKey;
  const params=m7WizardSkillLevel(key,command.skillLevel);
  const costError=spend(state,command.mpCost,command.readinessCost);
  if(costError)return Object.freeze({ok:false,message:costError,events:[],affectedEnemyIds:[]});

  if(command.target==='self'){
    state.playerM7Status=Object.freeze({
      ...state.playerM7Status,
      wizard:applyM7WizardSkillStatus(state.playerM7Status.wizard,key,command.skillLevel),
    });
    return Object.freeze({
      ok:true,
      message:`${command.displayName} Lv.${command.skillLevel} / RECONSTRUCTION_POLICY`,
      events:[],
      affectedEnemyIds:[],
      feedbackEvents:Object.freeze([
        wizardFeedback(state,command,wizardFeedbackKind(key),'player',pixelCell(x,y)),
      ]),
    });
  }

  if(key==='poison-mist'){
    const targetCell=selection.targetCell??null;
    if(!targetCell){
      refundWizardSpend(state,command);
      return Object.freeze({ok:false,message:'请选择施法格',events:[],affectedEnemyIds:[]});
    }
    const activeGroup=activeEnemyEncounterGroup(state,x,y);
    if(activeGroup===null){
      refundWizardSpend(state,command);
      return Object.freeze({ok:false,message:'当前没有可交互敌群',events:[],affectedEnemyIds:[]});
    }
    const geometry=m7PoisonGeometry(command.skillLevel);
    const cast=validateM7CastCell(pixelCell(x,y),targetCell,geometry.castDistance);
    if(!cast.ok){
      refundWizardSpend(state,command);
      return Object.freeze({ok:false,message:`目标格超出技能射程（${geometry.castDistance}格）`,events:[],affectedEnemyIds:[]});
    }
    const intelligence=state.combatPlayerStats?.magicAttack??0;
    const targets=affectedM7GridTargets(state.enemies,targetCell,geometry.areaCode,activeGroup);
    const events:BattleEvent[]=[];
    const feedbackEvents:M7WizardFeedbackEvent[]=[];
    for(const enemy of targets){
      const wizard=applyM7WizardSkillStatus(enemy.m7Status.wizard,key,command.skillLevel,{intelligence});
      enemy.m7Status=Object.freeze({...enemy.m7Status,wizard});
      const initialDamage=wizard.poison?.initialDamage??0;
      const before=enemy.hp;
      enemy.hp=Math.max(0,enemy.hp-initialDamage);
      const event=eventForEnemy(state,enemy,before,'POISON_INITIAL_DAMAGE','poison');
      if(event)events.push(event);
      feedbackEvents.push(wizardFeedback(
        state,command,'POISON_INITIAL_DAMAGE',enemy.id,pixelCell(enemy.x,enemy.y),before-enemy.hp,
      ));
    }
    return Object.freeze({
      ok:true,
      message:`${command.displayName} Lv.${command.skillLevel}：首击 + DOT / VERIFIED-STATIC-ORIGINAL grid geometry`,
      events:Object.freeze(events),
      affectedEnemyIds:Object.freeze(targets.map(enemy=>enemy.id)),
      feedbackEvents:Object.freeze(feedbackEvents),
    });
  }

  const selected=liveTarget(state,selection.targetId??'');
  if(!selected){
    refundWizardSpend(state,command);
    return Object.freeze({ok:false,message:'请选择存活目标',events:[],affectedEnemyIds:[]});
  }
  if(selected.encounterGroup!==activeEnemyEncounterGroup(state,x,y)){
    refundWizardSpend(state,command);
    return Object.freeze({ok:false,message:'该敌群尚未进入当前交互范围',events:[],affectedEnemyIds:[]});
  }
  const range=numeric(params,'rangeCells')??P.battleSpellRangeCells;
  if(tileDistance(pixelCell(x,y),pixelCell(selected.x,selected.y))>range){
    refundWizardSpend(state,command);
    return Object.freeze({ok:false,message:`目标超出技能射程（${range}格）`,events:[],affectedEnemyIds:[]});
  }

  const intelligence=state.combatPlayerStats?.magicAttack??0;
  const targets=wizardTargets(state,selected,key,command.skillLevel);
  const feedbackEvents:M7WizardFeedbackEvent[]=[];
  for(const enemy of targets){
    enemy.m7Status=Object.freeze({
      ...enemy.m7Status,
      wizard:applyM7WizardSkillStatus(enemy.m7Status.wizard,key,command.skillLevel,{intelligence}),
    });
    feedbackEvents.push(wizardFeedback(
      state,command,wizardFeedbackKind(key),enemy.id,pixelCell(enemy.x,enemy.y),
    ));
  }
  return Object.freeze({
    ok:true,
    message:`${command.displayName} Lv.${command.skillLevel} / RECONSTRUCTION_POLICY`,
    events:[],
    affectedEnemyIds:Object.freeze(targets.map(enemy=>enemy.id)),
    feedbackEvents:Object.freeze(feedbackEvents),
  });
}

export function useM7SkillTargeted(
  state:BattleState,
  selection:M7SkillTargetSelection,
  x:number,
  y:number,
  command:M7RuntimeSkillCommand,
):M7SkillUseResult{
  if(state.phase!=='active')return Object.freeze({ok:false,message:'请先进入战斗画面',events:[],affectedEnemyIds:[]});
  return command.family==='swordsman'
    ?useSwordsman(state,selection.targetId??'',x,y,command)
    :useWizard(state,selection,x,y,command);
}

// Compatibility bridge for the current Scene until S34 UI wiring switches poison
// to the explicit targetCell contract. New callers should use useM7SkillTargeted.
export function useM7Skill(
  state:BattleState,
  targetId:string,
  x:number,
  y:number,
  command:M7RuntimeSkillCommand,
):M7SkillUseResult{
  let targetCell:M7GridCell|null=null;
  if(command.family==='wizard'&&command.skillKey==='poison-mist'){
    const selected=liveTarget(state,targetId);
    if(selected)targetCell=pixelCell(selected.x,selected.y);
  }
  return useM7SkillTargeted(state,{targetId,targetCell},x,y,command);
}

export function tickM7BattleStatuses(state:BattleState,deltaMs:number):readonly BattleEvent[]{
  if(!Number.isFinite(deltaMs)||deltaMs<0)return Object.freeze([]);
  M7_BATTLE_EVENT_CLOCK_MS.set(state,m7BattleEventTimeMs(state)+deltaMs);
  const events:BattleEvent[]=[];
  if(state.combatPlayerStats){
    const advanced=advanceM7Statuses(state.hp,state.combatPlayerStats.maxHp,state.playerM7Status.swordsman,deltaMs);
    if(advanced.currentHp<state.hp){
      events.push(Object.freeze({
        kind:'hp-loss',target:'player',source:'player',amount:state.hp-advanced.currentHp,resultingHp:advanced.currentHp,provenance:'RECONSTRUCTION_POLICY',
      }));
    }
    state.hp=advanced.currentHp;
    state.playerM7Status=Object.freeze({
      swordsman:advanced.statuses,
      wizard:tickM7WizardStatus(state.playerM7Status.wizard,deltaMs).state,
    });
    state.maxHp=m7EffectiveMaxHp(state.combatPlayerStats.maxHp,state.playerM7Status.swordsman);
  }

  for(const enemy of state.enemies){
    const sword=advanceM7Statuses(enemy.hp,enemy.maxHp,enemy.m7Status.swordsman,deltaMs);
    enemy.hp=sword.currentHp;
    const wizard=tickM7WizardStatus(enemy.m7Status.wizard,deltaMs);
    if(wizard.poisonDamage>0&&enemy.hp>0){
      const before=enemy.hp;
      enemy.hp=Math.max(0,enemy.hp-wizard.poisonDamage);
      const event=eventForEnemy(state,enemy,before,'POISON_TICK','poison');
      if(event)events.push(event);
    }
    enemy.m7Status=Object.freeze({swordsman:sword.statuses,wizard:wizard.state});
    for(const key of Object.keys(enemy.abilityCooldownMs))enemy.abilityCooldownMs[key]=Math.max(0,enemy.abilityCooldownMs[key]!-deltaMs);
  }

  if(state.playerPoisonTicks>0&&state.playerPoisonDamage>0&&state.hp>0){
    state.playerPoisonClock+=deltaMs;
    while(state.playerPoisonTicks>0&&state.playerPoisonClock>=state.playerPoisonIntervalMs&&state.hp>0){
      state.playerPoisonClock-=state.playerPoisonIntervalMs;
      state.playerPoisonTicks-=1;
      const before=state.hp;
      state.hp=Math.max(0,state.hp-state.playerPoisonDamage);
      if(state.hp<before)events.push(Object.freeze({
        kind:'hp-loss',target:'player',source:'poison',amount:before-state.hp,resultingHp:state.hp,provenance:'RECONSTRUCTION_POLICY',
      }));
    }
  }
  state.playerSlowMs=Math.max(0,state.playerSlowMs-deltaMs);
  return Object.freeze(events);
}

export function consumeM7EnemyActionBlock(enemy:Enemy):boolean{
  if(!m7WizardCanAct(enemy.m7Status.wizard))return true;
  const stun=consumeM7BlockedAction(enemy.m7Status.swordsman);
  enemy.m7Status=Object.freeze({...enemy.m7Status,swordsman:stun.statuses});
  return stun.blocked;
}

export function m7OrdinaryAttackTargetable(enemy:Enemy):boolean{
  return m7WizardOrdinaryAttackTargetable(enemy.m7Status.wizard);
}

export function m7EnemyAccuracyModifier(enemy:Enemy,kind:'physical'|'magic'):number{
  const modifiers=m7WizardAccuracyModifiers(enemy.m7Status.wizard);
  return kind==='physical'?modifiers.physicalHitModifier:modifiers.magicHitModifier;
}

export function m7EnemyEffectiveRange(enemy:Enemy,base:number):number{
  return m7WizardEffectiveRangeCells(base,enemy.m7Status.wizard);
}

export function applyM7EnemyHealing(enemy:Enemy,amount:number):Readonly<{applied:number;blocked:boolean}>{
  const result=applyM7WizardHealing(enemy.m7Status.wizard,enemy.hp,enemy.maxHp,amount);
  enemy.hp=result.hp;
  return Object.freeze({applied:result.applied,blocked:result.blocked});
}

import {PROVISIONAL as P} from './config.ts';
import {RECOVERED_READINESS,SWORDSMAN_BATTLE_PROFILE,magicReadinessCost} from './battle-profile.ts';
import type {Collision} from './model.ts';
import type {Cell} from './coordinates.ts';
import {referenceCellToScreen} from './coordinates.ts';
import {pixelCell,tileDistance,enemyStep} from './tactics.ts';
import {TRAINING_DAMAGE_POLICY} from './damage-policy.ts';
import type {DamagePolicy} from './damage-policy.ts';
import {trainingAiBinding} from './ai-runtime.ts';
import type {AiBinding} from './ai-runtime.ts';
import type {BattleEntry,RuntimeProvenance} from './runtime-boundaries.ts';
import {DEFAULT_RECONSTRUCTION_COMBAT_BALANCE} from './combat/reconstruction-combat-balance.ts';
import type {CombatantStats,EquipmentCombatBonuses,EnemyRank} from './combat/reconstruction-combat-balance.ts';
import {applyM7NatureForceStaffHit,consumeM7CursedSwordPhysicalWindow,createM7WizardStatusState,m7WizardOrdinaryAttackTargetable} from './content/skills/wizard-seven-stage-runtime.ts';
import type {M7WizardStatusState} from './content/skills/wizard-seven-stage-runtime.ts';
import {m7AdjustIncomingDamage} from './combat/m7-status-effects.ts';
import type {M7StatusEffect} from './combat/m7-status-effects.ts';
import {applyM7EnemyHealing,consumeM7EnemyActionBlock,m7EnemyAccuracyModifier,m7EnemyEffectiveRange,tickM7BattleStatuses} from './combat/m7-battle-skills.ts';

export type Skill = {
  skill_id: number;
  name: string;
  mp_cost: number;
  explanation: string;
  magic_pattern_id: number;
  magic_pattern?: { magic_resources?: { magic_resource_id:number; role?:string; start_tick?:number }[] };
};

export type M7ActorStatusState=Readonly<{
  swordsman:readonly M7StatusEffect[];
  wizard:M7WizardStatusState;
}>;

export type ReconstructionEnemyAbility=Readonly<{
  abilityId:string;
  kind:string;
  powerMultiplier?:number;
  chance?:number;
  durationSeconds?:number;
  tickIntervalSeconds?:number;
  ticks?:number;
  healHp?:number;
  cooldownSeconds?:number;
  mpCost?:number;
}>;

export type Enemy = {
  id: string;
  hp: number;
  maxHp: number;
  mp:number;
  maxMp:number;
  x: number;
  y: number;
  encounterGroup:number;
  role: 'melee'|'ranged';
  visualResourceId?:number;
  movementRangeCells?:number;
  attackRangeCells?:number;
  traits:readonly string[];
  abilities:readonly ReconstructionEnemyAbility[];
  abilityCooldownMs:Record<string,number>;
  m7Status:M7ActorStatusState;
  blind: number;
  poison: number;
  action: number;
  aiBinding:AiBinding;
  combatStats?:CombatantStats;
  poisonTickDamage:number;
  poisonTicks:number;
  poisonClock:number;
};

export type BattleEvent={
  kind:'hp-loss';
  target:'player'|string;
  source?:'player'|string;
  amount:number;
  resultingHp:number;
  provenance:RuntimeProvenance;
};

export type ReconstructionEnemySetup=Readonly<{
  id:string;
  level:number;
  rank:EnemyRank;
  role:'melee'|'ranged';
  encounterGroup?:number;
  maxHp:number;
  maxMp:number;
  attack:number;
  defense:number;
  magicAttack:number;
  magicDefense:number;
  movementRangeCells:number;
  attackRangeCells:number;
  visualResourceId?:number;
  traits?:readonly string[];
  abilities?:readonly ReconstructionEnemyAbility[];
}>;

export type ReconstructionBattleSetup={
  playerClassId:string|number;
  level:number;
  equipment?:EquipmentCombatBonuses;
  enemyLevel?:number;
  enemyRank?:EnemyRank;
  enemies?:readonly ReconstructionEnemySetup[];
};

export type BattleState = {
  phase: 'safe'|'active'|'won'|'lost';
  hp:number;
  mp:number;
  maxHp:number;
  maxMp:number;
  reward:number;
  shield:number;
  manaBuff:number;
  cooldown:number;
  action:number;
  actionMax:number;
  actionClock:number;
  moveReadinessCost:number;
  attackReadinessCost:number;
  restReadinessCost:number;
  magicReadinessCost:number;
  enemyClock:number;
  enemies:Enemy[];
  battleZoneId:number|null;
  battleEntryProvenance:RuntimeProvenance;
  damagePolicyId:string;
  damagePolicyProvenance:RuntimeProvenance;
  combatPlayerStats:CombatantStats|null;
  playerM7Status:M7ActorStatusState;
  playerPoisonDamage:number;
  playerPoisonTicks:number;
  playerPoisonClock:number;
  playerPoisonIntervalMs:number;
  playerStunActions:number;
  playerSlowMs:number;
  rngState:number;
};

export function initialState(): BattleState {
  const profile=SWORDSMAN_BATTLE_PROFILE;
  const actionMax=RECOVERED_READINESS.maximum;
  return {
    phase:'safe',
    hp:P.initialHp,
    mp:P.initialMp,
    maxHp:P.initialHp,
    maxMp:P.initialMp,
    reward:0,
    shield:0,
    manaBuff:0,
    cooldown:0,
    action:0,
    actionMax,
    actionClock:0,
    moveReadinessCost:profile.movementReadinessCost,
    attackReadinessCost:profile.attackReadinessCost,
    restReadinessCost:profile.restReadinessCost,
    magicReadinessCost:magicReadinessCost(profile,actionMax),
    enemyClock:0,
    enemies:[],
    battleZoneId:null,
    battleEntryProvenance:'UNVERIFIED',
    damagePolicyId:TRAINING_DAMAGE_POLICY.id,
    damagePolicyProvenance:TRAINING_DAMAGE_POLICY.provenance,
    combatPlayerStats:null,
    playerM7Status:Object.freeze({swordsman:Object.freeze([]),wizard:createM7WizardStatusState()}),
    playerPoisonDamage:0,
    playerPoisonTicks:0,
    playerPoisonClock:0,
    playerPoisonIntervalMs:0,
    playerStunActions:0,
    playerSlowMs:0,
    rngState:0x6d325a91,
  };
}

export function beginBattle(x:number,y:number,entry?:BattleEntry,setup?:ReconstructionBattleSetup): BattleState {
  const s=initialState();
  s.phase='active';
  s.battleZoneId=entry?.battleZoneId??P.battleMapId;
  s.battleEntryProvenance=entry?.provenance??'RECONSTRUCTION_POLICY';
  // Recovered old-client behavior grants control only when current readiness
  // reaches the unit maximum. Starting full keeps the first command immediate.
  s.action=s.actionMax;
  if(setup){
    const balance=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE;
    const player=balance.playerStats(setup.playerClassId,setup.level,setup.equipment);
    const enemyLevel=setup.enemyLevel??setup.level;
    const rank=setup.enemyRank??'normal';
    s.combatPlayerStats=player;
    s.hp=player.maxHp;s.maxHp=player.maxHp;s.mp=player.maxMp;s.maxMp=player.maxMp;
    s.damagePolicyId=balance.id;s.damagePolicyProvenance=balance.provenance;
    if(setup.enemies?.length){
      const groupLocalCounts=new Map<number,number>();
      s.enemies=setup.enemies.map(row=>{
        const encounterGroup=Math.max(0,Math.floor(row.encounterGroup??0));
        const localIndex=groupLocalCounts.get(encounterGroup)??0;
        groupLocalCounts.set(encounterGroup,localIndex+1);
        const groupX=65+encounterGroup*210;
        const groupY=encounterGroup===0?0:(encounterGroup%2===1?1:-1)*(90+encounterGroup*25);
        const localX=(localIndex%3)*58;
        const localY=Math.floor(localIndex/3)*70+(localIndex%2===0?0:30);
        const template=balance.enemyStats({id:row.id,level:row.level,rank:row.rank,role:row.role});
        const combatStats:CombatantStats=Object.freeze({
          ...template,
          id:row.id,
          level:row.level,
          rank:row.rank,
          role:row.role,
          maxHp:row.maxHp,
          maxMp:row.maxMp,
          attack:row.attack,
          defense:row.defense,
          magicAttack:row.magicAttack,
          magicDefense:row.magicDefense,
        });
        return {
          id:row.id,hp:row.maxHp,maxHp:row.maxHp,mp:row.maxMp,maxMp:row.maxMp,x:x+groupX+localX,y:y+groupY+localY,encounterGroup,role:row.role,
          visualResourceId:row.visualResourceId,movementRangeCells:row.movementRangeCells,attackRangeCells:row.attackRangeCells,
          traits:Object.freeze([...(row.traits??[])]),abilities:Object.freeze([...(row.abilities??[])]),abilityCooldownMs:{},
          m7Status:Object.freeze({swordsman:Object.freeze([]),wizard:createM7WizardStatusState()}),
          blind:0,poison:0,action:0,aiBinding:trainingAiBinding(),combatStats,poisonTickDamage:0,poisonTicks:0,poisonClock:0,
        };
      });
    }else{
      const melee=balance.enemyStats({id:'dummy-melee',level:enemyLevel,rank,role:'melee'});
      const ranged=balance.enemyStats({id:'dummy-ranged',level:enemyLevel,rank,role:'ranged'});
      s.enemies=[
        {id:'dummy-melee',hp:melee.maxHp,maxHp:melee.maxHp,mp:melee.maxMp,maxMp:melee.maxMp,x:x+65,y,encounterGroup:0,role:'melee',visualResourceId:4524,traits:Object.freeze(['melee']),abilities:Object.freeze([]),abilityCooldownMs:{},m7Status:Object.freeze({swordsman:Object.freeze([]),wizard:createM7WizardStatusState()}),blind:0,poison:0,action:0,aiBinding:trainingAiBinding(),combatStats:melee,poisonTickDamage:0,poisonTicks:0,poisonClock:0},
        {id:'dummy-ranged',hp:ranged.maxHp,maxHp:ranged.maxHp,mp:ranged.maxMp,maxMp:ranged.maxMp,x:x+155,y:y-30,encounterGroup:0,role:'ranged',visualResourceId:4544,traits:Object.freeze(['ranged']),abilities:Object.freeze([]),abilityCooldownMs:{},m7Status:Object.freeze({swordsman:Object.freeze([]),wizard:createM7WizardStatusState()}),blind:0,poison:0,action:0,aiBinding:trainingAiBinding(),combatStats:ranged,poisonTickDamage:0,poisonTicks:0,poisonClock:0},
      ];
    }
  }else{
    s.enemies=[
      {id:'dummy-melee',hp:P.enemyHp,maxHp:P.enemyHp,mp:0,maxMp:0,x:x+65,y,encounterGroup:0,role:'melee',visualResourceId:4524,traits:Object.freeze(['melee']),abilities:Object.freeze([]),abilityCooldownMs:{},m7Status:Object.freeze({swordsman:Object.freeze([]),wizard:createM7WizardStatusState()}),blind:0,poison:0,action:0,aiBinding:trainingAiBinding(),poisonTickDamage:0,poisonTicks:0,poisonClock:0},
      {id:'dummy-ranged',hp:P.enemyHp,maxHp:P.enemyHp,mp:0,maxMp:0,x:x+155,y:y-30,encounterGroup:0,role:'ranged',visualResourceId:4544,traits:Object.freeze(['ranged']),abilities:Object.freeze([]),abilityCooldownMs:{},m7Status:Object.freeze({swordsman:Object.freeze([]),wizard:createM7WizardStatusState()}),blind:0,poison:0,action:0,aiBinding:trainingAiBinding(),poisonTickDamage:0,poisonTicks:0,poisonClock:0},
    ];
  }
  return s;
}

export function actionReady(s:BattleState): boolean {
  return s.phase==='active' && s.action>=s.actionMax && s.cooldown<=0;
}

// Recovered behavior subtracts an authored cost; it does not zero the whole
// gauge after every command. The default is movement for existing scene calls.
export function consumeAction(s:BattleState,cost=s.moveReadinessCost): boolean {
  if(!actionReady(s)||!Number.isFinite(cost)||cost<=0)return false;
  s.action=Math.max(0,s.action-cost);
  s.cooldown=0;
  return true;
}

function nextBattleRandom(s:BattleState):number{
  s.rngState=(Math.imul(s.rngState,1664525)+1013904223)>>>0;
  return s.rngState/0x100000000;
}

export function activeEnemyEncounterGroup(s:BattleState):number|null{
  let active:number|null=null;
  for(const enemy of s.enemies){
    if(enemy.hp<=0)continue;
    if(active===null||enemy.encounterGroup<active)active=enemy.encounterGroup;
  }
  return active;
}

export function reconcileBattlePhase(s: BattleState) {
  if(s.hp<=0)s.phase='lost';
  else if(s.phase==='active'&&s.enemies.every(e=>e.hp<=0)){
    s.phase='won';
    s.reward+=P.reward;
  }
}

export function useAttack(
  s:BattleState,
  targetId:string,
  x:number,
  y:number,
  skill:Skill|null,
  bonus=0,
  options:Readonly<{staffOrdinaryHit?:boolean}>={},
): {ok:boolean;message:string;event?:BattleEvent} {
  if(s.phase!=='active')return {ok:false,message:'请先进入战斗画面'};
  if(!actionReady(s))return {ok:false,message:'行动槽尚未蓄满'};
  const cost=skill?.mp_cost??0;
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isInteger(cost)||cost<0||!Number.isFinite(bonus)||bonus<0||bonus>100)return {ok:false,message:'Invalid action parameters'};
  if(skill && ![1101,1201,1301,19101,19201,19301].includes(skill.skill_id))return {ok:false,message:'Unsupported training skill'};
  if(s.mp<cost)return {ok:false,message:'MP 不足'};
  const sid=skill?.skill_id;
  const buff=sid===1301||sid===19301;
  const e=s.enemies.find(e=>e.id===targetId&&e.hp>0);
  if(!buff&&!e)return {ok:false,message:'请选择存活目标'};
  if(!buff&&e&&e.encounterGroup!==activeEnemyEncounterGroup(s))return {ok:false,message:'该敌群尚未投入战斗'};
  if(!skill&&e&&!m7WizardOrdinaryAttackTargetable(e.m7Status.wizard))return {ok:false,message:'石化目标不能被普通攻击'};
  const range=sid&&sid>=19000?P.rangedRadiusPx:P.meleeRadiusPx;
  if(!buff&&e&&Math.hypot(e.x-x,e.y-y)>range)return {ok:false,message:'目标超出临时射程'};

  const readinessCost=skill?s.magicReadinessCost:s.attackReadinessCost;
  if(!consumeAction(s,readinessCost))return {ok:false,message:'行动槽尚未蓄满'};
  s.mp-=cost;
  let event:BattleEvent|undefined;
  if(sid===1301)s.shield=P.shieldDurationMs;
  else if(sid===19301)s.manaBuff=P.manaBuffDurationMs;
  else if(e&&s.combatPlayerStats&&e.combatStats){
    const balance=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE;
    const resolution=skill
      ?balance.resolveSkillAttack(s.combatPlayerStats,e.combatStats,skill.skill_id,()=>nextBattleRandom(s))
      :balance.resolveAttack(s.combatPlayerStats,e.combatStats,{kind:'physical',multiplier:1,hits:1},()=>nextBattleRandom(s));
    if(sid===19101)e.blind=P.blindDurationMs;
    if(sid===19201&&resolution.dotTicks>0){
      e.poison=P.poisonDurationMs;e.poisonTickDamage=resolution.dotDamagePerTick;e.poisonTicks=resolution.dotTicks;e.poisonClock=0;
    }
    let totalDamage=resolution.totalDamage;
    if(!skill){
      const curse=consumeM7CursedSwordPhysicalWindow(e.m7Status.wizard,totalDamage);
      totalDamage=curse.damage;
      e.m7Status=Object.freeze({...e.m7Status,wizard:curse.state});
    }
    const before=e.hp;
    e.hp=Math.max(0,e.hp-totalDamage);
    if(before>e.hp)event={kind:'hp-loss',target:e.id,source:'player',amount:before-e.hp,resultingHp:e.hp,provenance:balance.provenance};
    if(!skill&&options.staffOrdinaryHit&&totalDamage>0){
      const drain=applyM7NatureForceStaffHit(s.playerM7Status.wizard,s.mp,s.maxMp,e.mp,nextBattleRandom(s));
      s.mp=drain.casterMp;e.mp=drain.targetMp;
    }
    if(s.manaBuff>0&&totalDamage>0)s.mp=Math.min(s.maxMp,s.mp+P.manaReturn);
  }else if(e){
    if(sid===19101)e.blind=P.blindDurationMs;
    else if(sid===19201){
      e.poison=P.poisonDurationMs;
      const before=e.hp;
      e.hp=Math.max(0,e.hp-P.poisonInitialDamage);
      event={kind:'hp-loss',target:e.id,source:'player',amount:before-e.hp,resultingHp:e.hp,provenance:TRAINING_DAMAGE_POLICY.provenance};
    }else{
      const damage=TRAINING_DAMAGE_POLICY.playerDamage(sid,bonus);
      const before=e.hp;
      e.hp=Math.max(0,e.hp-damage);
      event={kind:'hp-loss',target:e.id,source:'player',amount:before-e.hp,resultingHp:e.hp,provenance:TRAINING_DAMAGE_POLICY.provenance};
      if(s.manaBuff>0)s.mp=Math.min(s.maxMp,s.mp+P.manaReturn);
    }
  }
  reconcileBattlePhase(s);
  return {ok:true,message:`${skill?.name??'普通攻击'} / ${s.damagePolicyProvenance}`,event};
}

export type TacticalContext={collision:Collision;playerBusy:boolean;reserved:readonly Cell[];damagePolicy?:DamagePolicy};
export function updateBattle(s:BattleState,delta:number,x:number,y:number,defense=0,context?:TacticalContext):BattleEvent[] {
  const events:BattleEvent[]=[];
  if(s.phase!=='active'||![delta,x,y,defense].every(Number.isFinite)||delta<0||defense<0)return events;
  const dt=Math.min(250,Math.max(0,delta));
  s.cooldown=Math.max(0,s.cooldown-dt);
  events.push(...tickM7BattleStatuses(s,dt));

  // Original battle messages increment readiness one point at a time. The
  // 500ms cadence is recovered secondary evidence and remains pending an
  // isolated native-client capture.
  s.actionClock+=dt;
  const ticks=Math.floor(s.actionClock/RECOVERED_READINESS.inferredTickMs);
  if(ticks>0){
    s.actionClock-=ticks*RECOVERED_READINESS.inferredTickMs;
    const slowMultiplier=s.playerSlowMs>0?0.5:1;
    s.action=Math.min(s.actionMax,s.action+ticks*RECOVERED_READINESS.incrementPerTick*slowMultiplier);
    if(s.playerStunActions>0&&s.action>=s.actionMax){
      s.playerStunActions-=1;
      s.action=0;
    }
  }

  s.shield=Math.max(0,s.shield-dt);
  s.manaBuff=Math.max(0,s.manaBuff-dt);
  s.enemyClock+=dt;
  for(const e of s.enemies){
    e.blind=Math.max(0,e.blind-dt);
    if(e.poison>0&&e.hp>0){
      if(e.combatStats&&e.poisonTicks>0&&e.poisonTickDamage>0){
        e.poison=Math.max(0,e.poison-dt);e.poisonClock+=dt;
        while(e.poisonClock>=1000&&e.poisonTicks>0&&e.hp>0){
          e.poisonClock-=1000;e.poisonTicks-=1;
          const before=e.hp;e.hp=Math.max(0,e.hp-e.poisonTickDamage);
          if(before>e.hp)events.push({kind:'hp-loss',target:e.id,source:'poison',amount:before-e.hp,resultingHp:e.hp,provenance:'RECONSTRUCTION_POLICY'});
        }
      }else{
        const dose=Math.min(e.poison,dt);
        e.hp=Math.max(0,e.hp-dose*P.poisonDamagePerMs);
        e.poison-=dose;
      }
    }
  }
  // The current dummy enemies remain reconstruction policy. S2's recovered
  // source/precedence metadata is carried on each instance, while historical
  // per-encounter AI payloads remain unavailable.
  const damagePolicy=context?.damagePolicy??TRAINING_DAMAGE_POLICY;
  const activeGroup=activeEnemyEncounterGroup(s);
  for(const [enemyIndex,e] of s.enemies.entries()){
    if(e.hp<=0||activeGroup===null||e.encounterGroup!==activeGroup)continue;
    const traitCadence=e.traits.includes('fast')?0.72:e.traits.includes('tank')?1.12:1;
    const enemyIntervalMs=s.combatPlayerStats
      ?DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.tuning.cadence.enemyActionSeconds*1000*
        traitCadence*(1+enemyIndex*DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.tuning.cadence.staggerPerEnemy)
      :P.enemyIntervalMs*traitCadence;
    e.action=Math.min(s.actionMax,e.action+s.actionMax*dt/enemyIntervalMs);
    if(e.action+1e-8>=s.actionMax){
      e.action=0;
      if(consumeM7EnemyActionBlock(e))continue;

      const readyAbility=(kind:string)=>e.abilities.find(ability=>
        ability.kind===kind&&(e.abilityCooldownMs[ability.abilityId]??0)<=0&&(ability.mpCost??0)<=e.mp
      );
      const heal=readyAbility('self-heal');
      if(heal&&e.hp<e.maxHp*0.7){
        const amount=heal.healHp??Math.max(1,Math.round(e.maxHp*0.15));
        const result=applyM7EnemyHealing(e,amount);
        e.mp=Math.max(0,e.mp-(heal.mpCost??0));
        e.abilityCooldownMs[heal.abilityId]=(heal.cooldownSeconds??10)*1000;
        continue;
      }

      const specialKinds=['command-burst','poison-dot','stun','slow','rapid-strike','enrage'] as const;
      const special=specialKinds.map(kind=>readyAbility(kind)).find((ability):ability is ReconstructionEnemyAbility=>!!ability);
      const base=e.abilities.find(ability=>['magic-bolt','ranged-strike','physical-strike'].includes(ability.kind));
      const ability=special??base;
      const baseRangeCells=e.attackRangeCells??(e.role==='melee'?1:P.enemyRangedCells);
      const rangeCells=m7EnemyEffectiveRange(e,baseRangeCells);
      const range=e.role==='melee'?P.meleeRadiusPx:P.rangedRadiusPx;
      const inRange=context?tileDistance(pixelCell(e.x,e.y),pixelCell(x,y))<=rangeCells:Math.hypot(e.x-x,e.y-y)<=range*Math.max(1,rangeCells);
      if(inRange){
        if(ability?.kind==='poison-dot'){
          const chance=ability.chance??1;
          if(nextBattleRandom(s)<chance){
            const sourceStat=e.combatStats?.magicAttack??e.combatStats?.attack??10;
            s.playerPoisonDamage=Math.max(1,Math.round(sourceStat*(ability.powerMultiplier??0.15)));
            s.playerPoisonTicks=Math.max(s.playerPoisonTicks,ability.ticks??4);
            s.playerPoisonClock=0;
            s.playerPoisonIntervalMs=Math.max(250,(ability.tickIntervalSeconds??5)*1000);
          }
          e.mp=Math.max(0,e.mp-(ability.mpCost??0));
          e.abilityCooldownMs[ability.abilityId]=(ability.cooldownSeconds??10)*1000;
          continue;
        }
        if(ability?.kind==='slow'){
          if(nextBattleRandom(s)<(ability.chance??1))s.playerSlowMs=Math.max(s.playerSlowMs,(ability.durationSeconds??5)*1000);
          e.mp=Math.max(0,e.mp-(ability.mpCost??0));
          e.abilityCooldownMs[ability.abilityId]=(ability.cooldownSeconds??10)*1000;
          continue;
        }

        let damage:number,provenance:RuntimeProvenance;
        if(s.combatPlayerStats&&e.combatStats){
          const defender=s.shield>0?{...s.combatPlayerStats,defense:Math.round(s.combatPlayerStats.defense*1.45),magicDefense:Math.round(s.combatPlayerStats.magicDefense*1.45)}:s.combatPlayerStats;
          const kind=ability?.kind==='magic-bolt'||ability?.kind==='command-burst'?'magic':'physical';
          const hits=ability?.kind==='rapid-strike'?2:1;
          const multiplier=ability?.kind==='enrage'?1.35:(ability?.powerMultiplier??1);
          const accuracyModifier=(e.blind>0?-0.15:0)+m7EnemyAccuracyModifier(e,kind);
          const resolution=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.resolveAttack(
            e.combatStats,defender,{kind,multiplier,hits,accuracyModifier},()=>nextBattleRandom(s)
          );
          damage=m7AdjustIncomingDamage(resolution.totalDamage,kind,s.playerM7Status.swordsman);
          provenance=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.provenance;
        }else{
          damage=damagePolicy.enemyDamage(defense,e.blind>0,s.shield>0);provenance=damagePolicy.provenance;
        }
        const before=s.hp;
        s.hp=Math.max(0,s.hp-damage);
        if(before>s.hp)events.push({kind:'hp-loss',target:'player',source:e.id,amount:before-s.hp,resultingHp:s.hp,provenance});
        if(ability?.kind==='stun'&&nextBattleRandom(s)<(ability.chance??1))s.playerStunActions+=1;
        if(ability&&ability.kind!=='physical-strike'&&ability.kind!=='ranged-strike'&&ability.kind!=='magic-bolt'){
          e.mp=Math.max(0,e.mp-(ability.mpCost??0));
          if(ability.cooldownSeconds)e.abilityCooldownMs[ability.abilityId]=ability.cooldownSeconds*1000;
        }
      }else if(context){
        const occupied=[pixelCell(x,y),...context.reserved,...s.enemies.filter(other=>other!==e&&other.hp>0).map(other=>pixelCell(other.x,other.y))];
        const next=enemyStep(context.collision,pixelCell(e.x,e.y),pixelCell(x,y),occupied);
        if(next){const p=referenceCellToScreen(next);e.x=p[0];e.y=p[1];}
      }
    }
  }
  reconcileBattlePhase(s);
  return events;
}

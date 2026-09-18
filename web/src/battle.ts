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

export type Skill = {
  skill_id: number;
  name: string;
  mp_cost: number;
  explanation: string;
  magic_pattern_id: number;
  magic_pattern?: { magic_resources?: { magic_resource_id:number; role?:string; start_tick?:number }[] };
};

export type Enemy = {
  id: string;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  role: 'melee'|'ranged';
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

export type ReconstructionBattleSetup={
  playerClassId:string|number;
  level:number;
  equipment?:EquipmentCombatBonuses;
  enemyLevel?:number;
  enemyRank?:EnemyRank;
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
    const melee=balance.enemyStats({id:'dummy-melee',level:enemyLevel,rank,role:'melee'});
    const ranged=balance.enemyStats({id:'dummy-ranged',level:enemyLevel,rank,role:'ranged'});
    s.combatPlayerStats=player;
    s.hp=player.maxHp;s.maxHp=player.maxHp;s.mp=player.maxMp;s.maxMp=player.maxMp;
    s.damagePolicyId=balance.id;s.damagePolicyProvenance=balance.provenance;
    s.enemies=[
      {id:'dummy-melee',hp:melee.maxHp,maxHp:melee.maxHp,x:x+65,y,role:'melee',blind:0,poison:0,action:0,aiBinding:trainingAiBinding(),combatStats:melee,poisonTickDamage:0,poisonTicks:0,poisonClock:0},
      {id:'dummy-ranged',hp:ranged.maxHp,maxHp:ranged.maxHp,x:x+155,y:y-30,role:'ranged',blind:0,poison:0,action:0,aiBinding:trainingAiBinding(),combatStats:ranged,poisonTickDamage:0,poisonTicks:0,poisonClock:0},
    ];
  }else{
    s.enemies=[
      {id:'dummy-melee',hp:P.enemyHp,maxHp:P.enemyHp,x:x+65,y,role:'melee',blind:0,poison:0,action:0,aiBinding:trainingAiBinding(),poisonTickDamage:0,poisonTicks:0,poisonClock:0},
      {id:'dummy-ranged',hp:P.enemyHp,maxHp:P.enemyHp,x:x+155,y:y-30,role:'ranged',blind:0,poison:0,action:0,aiBinding:trainingAiBinding(),poisonTickDamage:0,poisonTicks:0,poisonClock:0},
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

function finish(s: BattleState) {
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
    const before=e.hp;
    e.hp=Math.max(0,e.hp-resolution.totalDamage);
    if(before>e.hp)event={kind:'hp-loss',target:e.id,source:'player',amount:before-e.hp,resultingHp:e.hp,provenance:balance.provenance};
    if(s.manaBuff>0&&resolution.totalDamage>0)s.mp=Math.min(s.maxMp,s.mp+P.manaReturn);
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
  finish(s);
  return {ok:true,message:`${skill?.name??'普通攻击'} / ${s.damagePolicyProvenance}`,event};
}

export type TacticalContext={collision:Collision;playerBusy:boolean;reserved:readonly Cell[];damagePolicy?:DamagePolicy};
export function updateBattle(s:BattleState,delta:number,x:number,y:number,defense=0,context?:TacticalContext):BattleEvent[] {
  const events:BattleEvent[]=[];
  if(s.phase!=='active'||![delta,x,y,defense].every(Number.isFinite)||delta<0||defense<0)return events;
  const dt=Math.min(250,Math.max(0,delta));
  s.cooldown=Math.max(0,s.cooldown-dt);

  // Original battle messages increment readiness one point at a time. The
  // 500ms cadence is recovered secondary evidence and remains pending an
  // isolated native-client capture.
  s.actionClock+=dt;
  const ticks=Math.floor(s.actionClock/RECOVERED_READINESS.inferredTickMs);
  if(ticks>0){
    s.actionClock-=ticks*RECOVERED_READINESS.inferredTickMs;
    s.action=Math.min(s.actionMax,s.action+ticks*RECOVERED_READINESS.incrementPerTick);
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
  for(const e of s.enemies){
    if(e.hp<=0)continue;
    e.action=Math.min(s.actionMax,e.action+s.actionMax*dt/P.enemyIntervalMs);
    if(e.action+1e-8>=s.actionMax){
      e.action=0;
      const range=e.role==='melee'?P.meleeRadiusPx:P.rangedRadiusPx;
      const inRange=context?tileDistance(pixelCell(e.x,e.y),pixelCell(x,y))<=(e.role==='melee'?1:P.enemyRangedCells):Math.hypot(e.x-x,e.y-y)<=range;
      if(inRange){
        let damage:number,provenance:RuntimeProvenance;
        if(s.combatPlayerStats&&e.combatStats){
          const defender=s.shield>0?{...s.combatPlayerStats,defense:Math.round(s.combatPlayerStats.defense*1.45),magicDefense:Math.round(s.combatPlayerStats.magicDefense*1.45)}:s.combatPlayerStats;
          const resolution=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.resolveAttack(e.combatStats,defender,{kind:'physical',multiplier:1,hits:1,accuracyModifier:e.blind>0?-0.15:0},()=>nextBattleRandom(s));
          damage=resolution.totalDamage;provenance=DEFAULT_RECONSTRUCTION_COMBAT_BALANCE.provenance;
        }else{
          damage=damagePolicy.enemyDamage(defense,e.blind>0,s.shield>0);provenance=damagePolicy.provenance;
        }
        const before=s.hp;
        s.hp=Math.max(0,s.hp-damage);
        if(before>s.hp)events.push({kind:'hp-loss',target:'player',source:e.id,amount:before-s.hp,resultingHp:s.hp,provenance});
      }else if(context){
        const occupied=[pixelCell(x,y),...context.reserved,...s.enemies.filter(other=>other!==e&&other.hp>0).map(other=>pixelCell(other.x,other.y))];
        const next=enemyStep(context.collision,pixelCell(e.x,e.y),pixelCell(x,y),occupied);
        if(next){const p=referenceCellToScreen(next);e.x=p[0];e.y=p[1];}
      }
    }
  }
  finish(s);
  return events;
}

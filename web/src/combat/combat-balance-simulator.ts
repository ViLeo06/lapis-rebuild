import {
  COMBAT_BALANCE_PROVENANCE,
  DEFAULT_RECONSTRUCTION_COMBAT_BALANCE,
  type CombatReward,
  type CombatantStats,
  type EnemyRank,
  type EnemyRole,
  type EquipmentCombatBonuses,
  type ReconstructionCombatBalance,
} from './reconstruction-combat-balance.ts';

export type CombatSimulationScenario = Readonly<{
  playerClassId: 100 | 109;
  playerLevel?: number;
  playerEquipment?: EquipmentCombatBonuses;
  enemyCount: number;
  enemyLevel?: number;
  enemyRank?: EnemyRank;
  enemyRole?: EnemyRole;
  useSkills?: boolean;
  seed?: number;
}>;

export type CombatSimulationResult = Readonly<{
  victory: boolean;
  durationSeconds: number;
  remainingHp: number;
  remainingMp: number;
  playerActions: number;
  enemyActions: number;
  damageDealt: number;
  damageTaken: number;
  skillUses: number;
  reward: CombatReward | null;
  timedOut: boolean;
  provenance: typeof COMBAT_BALANCE_PROVENANCE;
}>;

export type CombatSimulationBatch = Readonly<{
  trials: number;
  wins: number;
  losses: number;
  winRate: number;
  deathRate: number;
  meanDurationSeconds: number;
  p90DurationSeconds: number;
  meanRemainingHpOnWin: number;
  meanMpSpent: number;
  meanPlayerActions: number;
  meanEnemyActions: number;
  provenance: typeof COMBAT_BALANCE_PROVENANCE;
}>;

type MutableEnemy = {
  stats: CombatantStats;
  hp: number;
  dotDamage: number;
  dotTicks: number;
};

function seededRandom(seed: number): () => number {
  if (!Number.isInteger(seed)) throw new Error('Simulation seed must be an integer');
  let state = (seed >>> 0) || 0x6d2b79f5;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function finiteMean(values: readonly number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum,value)=>sum+value,0)/values.length;
}

function percentile90(values: readonly number[]): number {
  if (!values.length) return 0;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.min(sorted.length-1,Math.max(0,Math.ceil(sorted.length*0.9)-1))]!;
}

function offensiveSkill(
  balance: ReconstructionCombatBalance,
  family: CombatantStats['family'],
  actionIndex: number,
  currentMp: number,
): number | null {
  if (family === 'swordsman') {
    const preferred=actionIndex%2===0?1101:1201;
    const alternate=preferred===1101?1201:1101;
    const preferredSkill=balance.skill(preferred);
    if(currentMp>=preferredSkill.mpCost)return preferred;
    const alternateSkill=balance.skill(alternate);
    return currentMp>=alternateSkill.mpCost?alternate:null;
  }
  if (family === 'wizard') {
    const poison=balance.skill(19201);
    return currentMp>=poison.mpCost?19201:null;
  }
  return null;
}

export function simulateCombat(
  scenario: CombatSimulationScenario,
  balance: ReconstructionCombatBalance = DEFAULT_RECONSTRUCTION_COMBAT_BALANCE,
): CombatSimulationResult {
  if (!Number.isInteger(scenario.enemyCount) || scenario.enemyCount < 1 || scenario.enemyCount > 8) throw new Error('Invalid simulation enemy count');
  const player=balance.playerStats(scenario.playerClassId,scenario.playerLevel??1,scenario.playerEquipment);
  let playerHp=player.maxHp;
  let playerMp=player.maxMp;
  const enemyLevel=scenario.enemyLevel??scenario.playerLevel??1;
  const enemyRank=scenario.enemyRank??'normal';
  const enemyRole=scenario.enemyRole??'melee';
  const enemies:MutableEnemy[]=Array.from({length:scenario.enemyCount},(_,index)=>{
    const stats=balance.enemyStats({id:`sim-enemy-${index+1}`,level:enemyLevel,rank:enemyRank,role:enemyRole});
    return{stats,hp:stats.maxHp,dotDamage:0,dotTicks:0};
  });
  const random=seededRandom(scenario.seed??1);
  const cadence=balance.tuning.cadence;
  let time=0;
  let nextPlayer=cadence.playerActionSeconds;
  const nextEnemy=enemies.map((_,index)=>cadence.enemyActionSeconds*(1+index*cadence.staggerPerEnemy));
  let playerActions=0;
  let enemyActions=0;
  let damageDealt=0;
  let damageTaken=0;
  let skillUses=0;
  const useSkills=scenario.useSkills??true;

  const livingEnemies=()=>enemies.filter(enemy=>enemy.hp>0);
  while(playerHp>0&&livingEnemies().length>0&&time<cadence.simulationTimeoutSeconds){
    const livingTimes=nextEnemy.filter((_,index)=>enemies[index]!.hp>0);
    const nextEvent=Math.min(nextPlayer,...livingTimes);
    if(!Number.isFinite(nextEvent))break;
    time=nextEvent;

    if(nextPlayer===nextEvent&&playerHp>0){
      const target=livingEnemies()[0]!;
      const skillId=useSkills?offensiveSkill(balance,player.family,playerActions,playerMp):null;
      if(skillId!==null){
        const skill=balance.skill(skillId);
        playerMp-=skill.mpCost;
        const resolution=balance.resolveSkillAttack(player,target.stats,skillId,random);
        const applied=Math.min(target.hp,resolution.totalDamage);
        target.hp=Math.max(0,target.hp-resolution.totalDamage);
        damageDealt+=applied;
        if(target.hp>0&&resolution.dotTicks>0&&resolution.dotDamagePerTick>0){
          target.dotTicks=Math.max(target.dotTicks,resolution.dotTicks);
          target.dotDamage=Math.max(target.dotDamage,resolution.dotDamagePerTick);
        }
        skillUses+=1;
      }else{
        const resolution=balance.resolveAttack(player,target.stats,{kind:'physical',multiplier:1,hits:1},random);
        const applied=Math.min(target.hp,resolution.totalDamage);
        target.hp=Math.max(0,target.hp-resolution.totalDamage);
        damageDealt+=applied;
      }
      playerActions+=1;
      nextPlayer+=cadence.playerActionSeconds;
    }

    for(let index=0;index<enemies.length;index+=1){
      const enemy=enemies[index]!;
      if(enemy.hp<=0||nextEnemy[index]!==nextEvent)continue;
      if(enemy.dotTicks>0&&enemy.dotDamage>0){
        const dotApplied=Math.min(enemy.hp,enemy.dotDamage);
        enemy.hp=Math.max(0,enemy.hp-enemy.dotDamage);
        damageDealt+=dotApplied;
        enemy.dotTicks-=1;
        if(enemy.dotTicks===0)enemy.dotDamage=0;
      }
      if(enemy.hp>0&&playerHp>0){
        const kind=enemy.stats.role==='caster'?'magic':'physical';
        const resolution=balance.resolveAttack(enemy.stats,player,{kind,multiplier:1,hits:1},random);
        const applied=Math.min(playerHp,resolution.totalDamage);
        playerHp=Math.max(0,playerHp-resolution.totalDamage);
        damageTaken+=applied;
        enemyActions+=1;
      }
      nextEnemy[index]=nextEvent+cadence.enemyActionSeconds*(1+index*cadence.staggerPerEnemy);
    }
  }

  const victory=playerHp>0&&livingEnemies().length===0;
  const timedOut=!victory&&playerHp>0&&time>=cadence.simulationTimeoutSeconds;
  const reward=victory?balance.rewardForEncounter(enemies.map(enemy=>({level:enemy.stats.level,rank:enemy.stats.rank??'normal'}))):null;
  return Object.freeze({
    victory,
    durationSeconds:Number(Math.min(time,cadence.simulationTimeoutSeconds).toFixed(3)),
    remainingHp:Math.max(0,playerHp),
    remainingMp:Math.max(0,playerMp),
    playerActions,
    enemyActions,
    damageDealt,
    damageTaken,
    skillUses,
    reward,
    timedOut,
    provenance:COMBAT_BALANCE_PROVENANCE,
  });
}

export function simulateCombatBatch(
  scenario: Omit<CombatSimulationScenario,'seed'>,
  trials=400,
  seedBase=1,
  balance: ReconstructionCombatBalance = DEFAULT_RECONSTRUCTION_COMBAT_BALANCE,
): CombatSimulationBatch {
  if(!Number.isInteger(trials)||trials<10||trials>10000)throw new Error('Invalid simulation trial count');
  if(!Number.isInteger(seedBase))throw new Error('Invalid simulation seed base');
  const results=Array.from({length:trials},(_,index)=>simulateCombat({...scenario,seed:seedBase+index},balance));
  const wins=results.filter(result=>result.victory);
  const maxMp=balance.playerStats(scenario.playerClassId,scenario.playerLevel??1,scenario.playerEquipment).maxMp;
  return Object.freeze({
    trials,
    wins:wins.length,
    losses:trials-wins.length,
    winRate:wins.length/trials,
    deathRate:(trials-wins.length)/trials,
    meanDurationSeconds:finiteMean(results.map(result=>result.durationSeconds)),
    p90DurationSeconds:percentile90(results.map(result=>result.durationSeconds)),
    meanRemainingHpOnWin:finiteMean(wins.map(result=>result.remainingHp)),
    meanMpSpent:finiteMean(results.map(result=>maxMp-result.remainingMp)),
    meanPlayerActions:finiteMean(results.map(result=>result.playerActions)),
    meanEnemyActions:finiteMean(results.map(result=>result.enemyActions)),
    provenance:COMBAT_BALANCE_PROVENANCE,
  });
}

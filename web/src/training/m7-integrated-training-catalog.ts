import {
  M7_MONSTER_ARCHETYPE_CATALOG,
  S33_TRAINING_MILESTONE_CANDIDATES,
} from '../content/monsters/monster-archetype-catalog.ts';
import type {MonsterArchetype} from '../content/monsters/monster-archetype-catalog.ts';
import {S17_MONSTER_VISUAL_CATALOG} from '../content/monsters/monster-visual-catalog.ts';
import type {ReconstructionEnemySetup} from '../battle.ts';
import {
  M7_TRAINING_BATTLES,
} from './m7-training-camp.ts';
import type {M7TrainingBattlePreset} from './m7-training-camp.ts';

export type M7IntegratedTrainingEnemy=Readonly<{
  instanceId:string;
  monsterId:string;
  fixedLevel:number;
  encounterGroup:number;
  visualId:string;
  visualFamily:`B${number}`;
  traits:MonsterArchetype['traits'];
  evidenceStatus:'RECONSTRUCTION_POLICY';
}>;

export type M7IntegratedTrainingBattle=Readonly<{
  battleId:number;
  recommendedLevel:number;
  stage:number;
  battleZoneId:number;
  sceneTitle:string;
  difficultyBand:M7TrainingBattlePreset['difficultyBand'];
  purpose:string;
  totalEnemyCount:number;
  groupCount:number;
  maxGroupSize:number;
  enemies:readonly M7IntegratedTrainingEnemy[];
  sceneEvidence:'VERIFIED-STATIC-ORIGINAL';
  rosterBindingEvidence:'RECONSTRUCTION_POLICY';
}>;

export const M7_TRAINING_ENEMY_COUNTS=Object.freeze([
  2,3,4,5,6,7,8,9,10,11,12,14,16,18,20,
] as const);
export const M7_MAX_ACTIVE_ENEMIES_PER_GROUP=5;

function integratePreset(preset:M7TrainingBattlePreset):M7IntegratedTrainingBattle{
  const handoff=S33_TRAINING_MILESTONE_CANDIDATES.find(row=>
    row.battle===preset.id&&row.recommendedLevel===preset.recommendedLevel
  );
  if(!handoff)throw new Error(`Missing S30 training handoff for battle ${preset.id}`);

  const totalEnemyCount=M7_TRAINING_ENEMY_COUNTS[preset.id-1];
  if(!totalEnemyCount)throw new Error(`Missing M7 enemy-count policy for battle ${preset.id}`);
  const bandPool=M7_MONSTER_ARCHETYPE_CATALOG.forBand(handoff.trainingBand)
    .filter(monster=>monster.level<=preset.recommendedLevel||preset.id===15);
  if(!bandPool.length)throw new Error(`Training battle ${preset.id} has no fixed-level band pool`);

  for(const requiredId of handoff.candidateMonsterIds){
    if(!bandPool.some(monster=>monster.monsterId===requiredId)){
      throw new Error(`Required S30 handoff monster ${requiredId} is outside battle ${preset.id} fixed pool`);
    }
  }

  // Bosses are kept singular and placed in the final engagement group. Other
  // fixed-level archetypes in the same S30 band are cycled to create a denser
  // but still evidence-bounded training roster.
  const boss=bandPool.find(monster=>monster.traits.includes('boss'))??null;
  const fillPool=bandPool.filter(monster=>monster!==boss);
  const reusable=fillPool.length?fillPool:bandPool;
  const monsterIds:string[]=[];
  const fillCount=totalEnemyCount-(boss?1:0);
  for(let index=0;index<fillCount;index+=1)monsterIds.push(reusable[index%reusable.length]!.monsterId);
  if(boss)monsterIds.push(boss.monsterId);

  const occurrence=new Map<string,number>();
  const enemies=monsterIds.map((monsterId,index)=>{
    const monster=M7_MONSTER_ARCHETYPE_CATALOG.require(monsterId);
    if(!monster.fixedLevel)throw new Error(`Training monster must be fixed-level: ${monsterId}`);
    const ordinal=(occurrence.get(monsterId)??0)+1;
    occurrence.set(monsterId,ordinal);
    return Object.freeze({
      instanceId:ordinal===1?monster.monsterId:`${monster.monsterId}#${ordinal}`,
      monsterId:monster.monsterId,
      fixedLevel:monster.level,
      encounterGroup:Math.floor(index/M7_MAX_ACTIVE_ENEMIES_PER_GROUP),
      visualId:monster.visualId,
      visualFamily:monster.visualFamily,
      traits:monster.traits,
      evidenceStatus:'RECONSTRUCTION_POLICY' as const,
    });
  });
  if(enemies.length!==totalEnemyCount)throw new Error(`Training battle ${preset.id} roster count drift`);
  const groupCount=Math.ceil(totalEnemyCount/M7_MAX_ACTIVE_ENEMIES_PER_GROUP);
  return Object.freeze({
    battleId:preset.id,
    recommendedLevel:preset.recommendedLevel,
    stage:preset.stage,
    battleZoneId:preset.battleZoneId,
    sceneTitle:preset.sceneTitle,
    difficultyBand:preset.difficultyBand,
    purpose:preset.purpose,
    totalEnemyCount,
    groupCount,
    maxGroupSize:M7_MAX_ACTIVE_ENEMIES_PER_GROUP,
    enemies:Object.freeze(enemies),
    sceneEvidence:preset.sceneEvidence,
    rosterBindingEvidence:'RECONSTRUCTION_POLICY' as const,
  });
}

export const M7_INTEGRATED_TRAINING_BATTLES:readonly M7IntegratedTrainingBattle[]=Object.freeze(
  M7_TRAINING_BATTLES.map(integratePreset),
);

export function integratedTrainingBattleById(id:number):M7IntegratedTrainingBattle{
  const row=M7_INTEGRATED_TRAINING_BATTLES.find(candidate=>candidate.battleId===id);
  if(!row)throw new Error(`Unknown integrated M7 training battle ${id}`);
  return row;
}

export function validateM7IntegratedTrainingBattles():void{
  if(M7_INTEGRATED_TRAINING_BATTLES.length!==15)throw new Error('M7 integration requires exactly 15 training battles');
  if(new Set(M7_INTEGRATED_TRAINING_BATTLES.map(row=>row.battleId)).size!==15)throw new Error('Duplicate integrated battle id');
  if(new Set(M7_INTEGRATED_TRAINING_BATTLES.map(row=>row.battleZoneId)).size<2)throw new Error('Training battles require multiple battle scenes');

  const signatures=new Set<string>();
  for(const row of M7_INTEGRATED_TRAINING_BATTLES){
    const expectedCount=M7_TRAINING_ENEMY_COUNTS[row.battleId-1];
    if(row.totalEnemyCount!==expectedCount||row.enemies.length!==expectedCount)throw new Error(`Training battle ${row.battleId} enemy count drift`);
    if(row.totalEnemyCount>20)throw new Error(`Training battle ${row.battleId} exceeds 20 enemies`);
    if(new Set(row.enemies.map(enemy=>enemy.instanceId)).size!==row.enemies.length)throw new Error(`Duplicate live enemy id in battle ${row.battleId}`);
    const groups=new Map<number,number>();
    for(const enemy of row.enemies)groups.set(enemy.encounterGroup,(groups.get(enemy.encounterGroup)??0)+1);
    if([...groups.values()].some(count=>count>M7_MAX_ACTIVE_ENEMIES_PER_GROUP))throw new Error(`Training battle ${row.battleId} exceeds five enemies per engagement group`);
    if(groups.size!==row.groupCount)throw new Error(`Training battle ${row.battleId} group count drift`);
    const signature=row.enemies.map(enemy=>enemy.instanceId).join('|');
    signatures.add(signature);
    for(const enemy of row.enemies){
      const source=M7_MONSTER_ARCHETYPE_CATALOG.require(enemy.monsterId);
      if(enemy.fixedLevel!==source.level)throw new Error(`Enemy level drift: ${enemy.monsterId}`);
      if(enemy.visualId!==source.visualId||enemy.visualFamily!==source.visualFamily)throw new Error(`Enemy visual drift: ${enemy.monsterId}`);
    }
  }
  if(signatures.size!==15)throw new Error('All 15 training battles must have distinct concrete rosters');

  const ashesTarget=integratedTrainingBattleById(8).enemies
    .map(enemy=>M7_MONSTER_ARCHETYPE_CATALOG.require(enemy.monsterId))
    .find(monster=>monster.recoveryCapability?.blockedByStatus==='healingBlocked');
  if(!ashesTarget)throw new Error('Battle #8 must provide a healingBlocked-compatible recovery target');

  const boss=integratedTrainingBattleById(15).enemies
    .map(enemy=>M7_MONSTER_ARCHETYPE_CATALOG.require(enemy.monsterId))
    .find(monster=>monster.traits.includes('boss'));
  if(!boss)throw new Error('Battle #15 must include a boss archetype');
}

validateM7IntegratedTrainingBattles();


export function reconstructionEnemiesForTrainingBattle(id:number):readonly ReconstructionEnemySetup[]{
  const battle=integratedTrainingBattleById(id);
  return Object.freeze(battle.enemies.map(enemy=>{
    const monster=M7_MONSTER_ARCHETYPE_CATALOG.require(enemy.monsterId);
    const visual=S17_MONSTER_VISUAL_CATALOG.require(monster.visualId);
    const rank=monster.difficultyTier==='boss'?'boss':monster.difficultyTier==='elite'?'elite':'normal';
    const role:ReconstructionEnemySetup['role']=monster.attackRange>1?'ranged':'melee';
    return Object.freeze({
      id:enemy.instanceId,
      level:monster.level,
      encounterGroup:enemy.encounterGroup,
      rank,
      role,
      maxHp:monster.maxHp,
      maxMp:monster.maxMp,
      attack:monster.attack,
      defense:monster.defense,
      magicAttack:monster.magicAttack,
      magicDefense:monster.magicDefense,
      movementRangeCells:monster.movementRange,
      attackRangeCells:monster.attackRange,
      visualResourceId:visual.sourceNumericId,
      traits:monster.traits,
      abilities:Object.freeze(monster.abilities.map(ability=>Object.freeze({
        abilityId:ability.abilityId,
        kind:ability.kind,
        ...(ability.powerMultiplier===undefined?{}:{powerMultiplier:ability.powerMultiplier}),
        ...(ability.chance===undefined?{}:{chance:ability.chance}),
        ...(ability.durationSeconds===undefined?{}:{durationSeconds:ability.durationSeconds}),
        ...(ability.tickIntervalSeconds===undefined?{}:{tickIntervalSeconds:ability.tickIntervalSeconds}),
        ...(ability.ticks===undefined?{}:{ticks:ability.ticks}),
        ...(ability.healHp===undefined?{}:{healHp:ability.healHp}),
        ...(ability.cooldownSeconds===undefined?{}:{cooldownSeconds:ability.cooldownSeconds}),
        ...(ability.mpCost===undefined?{}:{mpCost:ability.mpCost}),
      }))),
    });
  }));
}

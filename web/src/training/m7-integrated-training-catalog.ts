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
  monsterId:string;
  fixedLevel:number;
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
  enemies:readonly M7IntegratedTrainingEnemy[];
  sceneEvidence:'VERIFIED-STATIC-ORIGINAL';
  rosterBindingEvidence:'RECONSTRUCTION_POLICY';
}>;

function integratePreset(preset:M7TrainingBattlePreset):M7IntegratedTrainingBattle{
  const handoff=S33_TRAINING_MILESTONE_CANDIDATES.find(row=>
    row.battle===preset.id&&row.recommendedLevel===preset.recommendedLevel
  );
  if(!handoff)throw new Error(`Missing S30 training handoff for battle ${preset.id}`);
  const enemies=handoff.candidateMonsterIds.map(monsterId=>{
    const monster=M7_MONSTER_ARCHETYPE_CATALOG.require(monsterId);
    if(!monster.fixedLevel)throw new Error(`Training monster must be fixed-level: ${monsterId}`);
    return Object.freeze({
      monsterId:monster.monsterId,
      fixedLevel:monster.level,
      visualId:monster.visualId,
      visualFamily:monster.visualFamily,
      traits:monster.traits,
      evidenceStatus:'RECONSTRUCTION_POLICY' as const,
    });
  });
  if(enemies.length===0)throw new Error(`Training battle ${preset.id} has no concrete enemies`);
  return Object.freeze({
    battleId:preset.id,
    recommendedLevel:preset.recommendedLevel,
    stage:preset.stage,
    battleZoneId:preset.battleZoneId,
    sceneTitle:preset.sceneTitle,
    difficultyBand:preset.difficultyBand,
    purpose:preset.purpose,
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
    const signature=row.enemies.map(enemy=>enemy.monsterId).join('|');
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
      id:monster.monsterId,
      level:monster.level,
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

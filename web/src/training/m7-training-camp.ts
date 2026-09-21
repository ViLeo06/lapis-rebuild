import storyBattleScenes from '../../../manifests/story-battle-scenes.json' with {type:'json'};
import type {EnemyRank,EquipmentCombatBonuses} from '../combat/reconstruction-combat-balance.ts';
import type {ReconstructionBattleSetup} from '../battle.ts';
import {resolveM7Stage} from './m7-level-axis.ts';

export type TrainingMonsterRole='melee'|'ranged'|'tank'|'fast'|'magic'|'dot'|'healer'|'control'|'elite'|'boss';
export type TrainingDifficultyBand='Normal'|'Hard'|'Elite'|'Boss';
export type PlayerDifficultyHint='Easy'|'Normal'|'Hard'|'Very Hard';

export type TrainingMonsterContract=Readonly<{role:TrainingMonsterRole;count:number}>;
export type M7TrainingBattlePreset=Readonly<{
  id:number;
  recommendedLevel:number;
  fixedEnemyLevel:number;
  stage:number;
  battleZoneId:number;
  sceneTitle:string;
  monsterContract:readonly TrainingMonsterContract[];
  difficultyBand:TrainingDifficultyBand;
  purpose:string;
  sceneEvidence:'VERIFIED-STATIC-ORIGINAL';
  trainingBindingEvidence:'RECONSTRUCTION_POLICY';
  monsterBindingEvidence:'RECONSTRUCTION_POLICY';
}>;

const sceneByZone=new Map(
  (storyBattleScenes.zones as Array<{zone_id:number;title:string}>).map(row=>[row.zone_id,row.title] as const),
);

function scene(zoneId:number):string{
  const title=sceneByZone.get(zoneId);
  if(!title)throw new Error('Missing fixed-hash story battle scene '+zoneId);
  return title;
}
const monsters=(...rows:Array<[TrainingMonsterRole,number]>):readonly TrainingMonsterContract[]=>
  Object.freeze(rows.map(([role,count])=>Object.freeze({role,count})));

const raw:readonly Omit<M7TrainingBattlePreset,'stage'|'sceneTitle'|'sceneEvidence'|'trainingBindingEvidence'|'monsterBindingEvidence'>[]=[
  {id:1,recommendedLevel:2,fixedEnemyLevel:2,battleZoneId:1,monsterContract:monsters(['melee',1]),difficultyBand:'Normal',purpose:'新手移动、选敌与普通攻击教学'},
  {id:2,recommendedLevel:5,fixedEnemyLevel:5,battleZoneId:3,monsterContract:monsters(['melee',1],['fast',1]),difficultyBand:'Normal',purpose:'Stage 1 毕业：基础输出与目标切换'},
  {id:3,recommendedLevel:6,fixedEnemyLevel:6,battleZoneId:9,monsterContract:monsters(['melee',1],['ranged',1]),difficultyBand:'Normal',purpose:'Stage 2 入门：近远程混编'},
  {id:4,recommendedLevel:10,fixedEnemyLevel:10,battleZoneId:11,monsterContract:monsters(['fast',1],['ranged',1]),difficultyBand:'Normal',purpose:'Stage 2 中期：站位与 readiness 节奏'},
  {id:5,recommendedLevel:15,fixedEnemyLevel:15,battleZoneId:13,monsterContract:monsters(['tank',1],['ranged',1]),difficultyBand:'Hard',purpose:'Stage 2 毕业：集火与耐久目标'},
  {id:6,recommendedLevel:16,fixedEnemyLevel:16,battleZoneId:15,monsterContract:monsters(['tank',1],['melee',1]),difficultyBand:'Normal',purpose:'Stage 3 入门：防御技能与持续接战'},
  {id:7,recommendedLevel:25,fixedEnemyLevel:25,battleZoneId:21,monsterContract:monsters(['dot',1],['ranged',1]),difficultyBand:'Hard',purpose:'Stage 3 毕业：DOT 压力与行动管理'},
  {id:8,recommendedLevel:26,fixedEnemyLevel:26,battleZoneId:23,monsterContract:monsters(['healer',1],['tank',1]),difficultyBand:'Hard',purpose:'Stage 4 入门：回血目标与禁疗验收'},
  {id:9,recommendedLevel:35,fixedEnemyLevel:35,battleZoneId:31,monsterContract:monsters(['control',1],['fast',1]),difficultyBand:'Hard',purpose:'Stage 4 毕业：控制与快速目标'},
  {id:10,recommendedLevel:36,fixedEnemyLevel:36,battleZoneId:41,monsterContract:monsters(['magic',1],['tank',1]),difficultyBand:'Hard',purpose:'Stage 5 入门：魔法/物理混合压力'},
  {id:11,recommendedLevel:45,fixedEnemyLevel:45,battleZoneId:51,monsterContract:monsters(['dot',1],['magic',1],['ranged',1]),difficultyBand:'Hard',purpose:'Stage 5 毕业：持续伤害与多目标优先级'},
  {id:12,recommendedLevel:46,fixedEnemyLevel:46,battleZoneId:61,monsterContract:monsters(['healer',1],['control',1],['tank',1]),difficultyBand:'Hard',purpose:'Stage 6 入门：恢复、控制与范围/命令测试'},
  {id:13,recommendedLevel:55,fixedEnemyLevel:57,battleZoneId:71,monsterContract:monsters(['elite',1],['magic',1]),difficultyBand:'Elite',purpose:'Stage 6 毕业：越级精英压力'},
  {id:14,recommendedLevel:56,fixedEnemyLevel:58,battleZoneId:81,monsterContract:monsters(['elite',1],['healer',1],['ranged',1]),difficultyBand:'Elite',purpose:'Stage 7 标准战：控制、禁疗与集火'},
  {id:15,recommendedLevel:65,fixedEnemyLevel:70,battleZoneId:91,monsterContract:monsters(['boss',1],['elite',1],['control',1]),difficultyBand:'Boss',purpose:'Stage 7 Boss：Buff/Debuff、恢复与综合战术'},
];

export const M7_TRAINING_BATTLES:readonly M7TrainingBattlePreset[]=Object.freeze(raw.map(row=>{
  const stage=resolveM7Stage(row.recommendedLevel).stage;
  return Object.freeze({
    ...row,
    stage,
    sceneTitle:scene(row.battleZoneId),
    sceneEvidence:'VERIFIED-STATIC-ORIGINAL' as const,
    trainingBindingEvidence:'RECONSTRUCTION_POLICY' as const,
    monsterBindingEvidence:'RECONSTRUCTION_POLICY' as const,
  });
}));

if(M7_TRAINING_BATTLES.length!==15||new Set(M7_TRAINING_BATTLES.map(row=>row.id)).size!==15){
  throw new Error('M7 training camp must contain exactly 15 unique battles');
}

export function trainingBattleById(id:number):M7TrainingBattlePreset{
  const preset=M7_TRAINING_BATTLES.find(row=>row.id===id);
  if(!preset)throw new Error('Unknown M7 training battle '+id);
  return preset;
}

export function resolvePlayerDifficultyHint(playerLevel:number,recommendedLevel:number):PlayerDifficultyHint{
  if(!Number.isInteger(playerLevel)||playerLevel<1||playerLevel>99)throw new Error('Invalid player level');
  if(!Number.isInteger(recommendedLevel)||recommendedLevel<1||recommendedLevel>99)throw new Error('Invalid recommended level');
  const delta=playerLevel-recommendedLevel;
  if(delta>=6)return 'Easy';
  if(delta>=-2)return 'Normal';
  if(delta>=-7)return 'Hard';
  return 'Very Hard';
}

export function trainingEnemyRank(preset:M7TrainingBattlePreset):EnemyRank{
  if(preset.difficultyBand==='Boss')return 'boss';
  if(preset.difficultyBand==='Elite')return 'elite';
  return 'normal';
}

export function reconstructionSetupForTrainingBattle(
  preset:M7TrainingBattlePreset,
  playerClassId:string|number,
  playerLevel:number,
  equipment?:EquipmentCombatBonuses,
):ReconstructionBattleSetup{
  if(!Number.isInteger(playerLevel)||playerLevel<1||playerLevel>99)throw new Error('Invalid player level');
  return{
    playerClassId,
    level:playerLevel,
    ...(equipment?{equipment}:{}),
    enemyLevel:preset.fixedEnemyLevel,
    enemyRank:trainingEnemyRank(preset),
  };
}

export function monsterContractSummary(preset:M7TrainingBattlePreset):string{
  return preset.monsterContract.map(row=>row.role+'×'+row.count).join(' / ');
}

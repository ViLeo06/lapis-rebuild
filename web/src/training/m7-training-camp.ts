import {m71TrainingExpReward} from '../progression/m7-1-training-rewards.ts';
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
  candidateMonsterIds:readonly string[];
  difficultyBand:TrainingDifficultyBand;
  purpose:string;
  expReward:number;
  expRewardEvidence:'RECONSTRUCTION_POLICY';
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

const raw:readonly Omit<M7TrainingBattlePreset,'stage'|'sceneTitle'|'expReward'|'expRewardEvidence'|'sceneEvidence'|'trainingBindingEvidence'|'monsterBindingEvidence'>[]=[
  {id:1,recommendedLevel:2,fixedEnemyLevel:2,battleZoneId:1,monsterContract:monsters(['melee',1]),candidateMonsterIds:Object.freeze(['m7-green-sword-trainee-l2']),difficultyBand:'Normal',purpose:'新手移动、选敌与普通攻击教学'},
  {id:2,recommendedLevel:5,fixedEnemyLevel:5,battleZoneId:3,monsterContract:monsters(['fast',1]),candidateMonsterIds:Object.freeze(['m7-blue-polearm-skirmisher-l5']),difficultyBand:'Normal',purpose:'Stage 1 毕业：快速高压目标'},
  {id:3,recommendedLevel:6,fixedEnemyLevel:6,battleZoneId:9,monsterContract:monsters(['tank',1]),candidateMonsterIds:Object.freeze(['m7-green-armored-guard-l6']),difficultyBand:'Normal',purpose:'Stage 2 入门：高防目标'},
  {id:4,recommendedLevel:10,fixedEnemyLevel:10,battleZoneId:11,monsterContract:monsters(['ranged',1],['tank',1]),candidateMonsterIds:Object.freeze(['m7-cyan-spectral-ranged-l10','m7-green-armored-guard-l6']),difficultyBand:'Normal',purpose:'Stage 2 中期：近远程目标优先级'},
  {id:5,recommendedLevel:15,fixedEnemyLevel:15,battleZoneId:13,monsterContract:monsters(['dot',1],['ranged',1]),candidateMonsterIds:Object.freeze(['m7-blue-polearm-venom-l15','m7-cyan-spectral-ranged-l10']),difficultyBand:'Hard',purpose:'Stage 2 毕业：DOT 与远程压力'},
  {id:6,recommendedLevel:16,fixedEnemyLevel:16,battleZoneId:15,monsterContract:monsters(['magic',1]),candidateMonsterIds:Object.freeze(['m7-cyan-spectral-hexer-l16']),difficultyBand:'Normal',purpose:'Stage 3 入门：魔法压力'},
  {id:7,recommendedLevel:25,fixedEnemyLevel:25,battleZoneId:21,monsterContract:monsters(['melee',1],['control',1]),candidateMonsterIds:Object.freeze(['m7-green-sword-duelist-l22','m7-green-armored-controller-l25']),difficultyBand:'Hard',purpose:'Stage 3 毕业：爆发与控制组合'},
  {id:8,recommendedLevel:26,fixedEnemyLevel:26,battleZoneId:23,monsterContract:monsters(['healer',1]),candidateMonsterIds:Object.freeze(['m7-green-armored-renewer-l26']),difficultyBand:'Hard',purpose:'Stage 4 入门：回血目标与灰烬禁疗验收'},
  {id:9,recommendedLevel:35,fixedEnemyLevel:35,battleZoneId:31,monsterContract:monsters(['control',1],['fast',1]),candidateMonsterIds:Object.freeze(['m7-cyan-spectral-binder-l32','m7-blue-polearm-raider-l35']),difficultyBand:'Hard',purpose:'Stage 4 毕业：控制与快速压力'},
  {id:10,recommendedLevel:36,fixedEnemyLevel:36,battleZoneId:41,monsterContract:monsters(['tank',1]),candidateMonsterIds:Object.freeze(['m7-green-armored-bulwark-l36']),difficultyBand:'Hard',purpose:'Stage 5 入门：高防持续目标'},
  {id:11,recommendedLevel:45,fixedEnemyLevel:45,battleZoneId:51,monsterContract:monsters(['dot',1],['melee',1]),candidateMonsterIds:Object.freeze(['m7-cyan-spectral-venom-caster-l42','m7-green-sword-berserker-l45']),difficultyBand:'Hard',purpose:'Stage 5 毕业：DOT 与爆发管理'},
  {id:12,recommendedLevel:46,fixedEnemyLevel:46,battleZoneId:61,monsterContract:monsters(['magic',1],['control',1]),candidateMonsterIds:Object.freeze(['m7-cyan-spectral-support-l46']),difficultyBand:'Hard',purpose:'Stage 6 入门：魔法与控制支援目标'},
  {id:13,recommendedLevel:55,fixedEnemyLevel:55,battleZoneId:71,monsterContract:monsters(['elite',1],['magic',1]),candidateMonsterIds:Object.freeze(['m7-green-armored-elite-l55','m7-cyan-spectral-support-l46']),difficultyBand:'Elite',purpose:'Stage 6 毕业：精英坦克与支援'},
  {id:14,recommendedLevel:56,fixedEnemyLevel:56,battleZoneId:81,monsterContract:monsters(['fast',1]),candidateMonsterIds:Object.freeze(['m7-blue-polearm-vanguard-l56']),difficultyBand:'Elite',purpose:'Stage 7 标准战：快速近战压力'},
  {id:15,recommendedLevel:65,fixedEnemyLevel:65,battleZoneId:91,monsterContract:monsters(['boss',1],['elite',1]),candidateMonsterIds:Object.freeze(['m7-spectral-overseer-boss-l65','m7-cyan-spectral-elite-l60']),difficultyBand:'Boss',purpose:'Stage 7 Boss：Buff/Debuff、恢复与综合战术'},
];

export const M7_TRAINING_BATTLES:readonly M7TrainingBattlePreset[]=Object.freeze(raw.map(row=>{
  const stage=resolveM7Stage(row.recommendedLevel).stage;
  return Object.freeze({
    ...row,
    stage,
    sceneTitle:scene(row.battleZoneId),
    expReward:m71TrainingExpReward(row.recommendedLevel,row.difficultyBand),
    expRewardEvidence:'RECONSTRUCTION_POLICY' as const,
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
  if(delta>=7)return 'Easy';
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

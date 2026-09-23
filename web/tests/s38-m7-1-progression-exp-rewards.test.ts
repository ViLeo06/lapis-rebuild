import test from 'node:test';
import assert from 'node:assert/strict';
import matrix from '../../manifests/m6-dual-class-ten-stage-matrix.json' with {type:'json'};
import {createInventory} from '../src/progression/inventory.ts';
import {
  M71_EXPERIENCE_POLICY,
  M71_LEVELABL_EXPERIENCE_VALUES,
  m71AuthoredExperienceValue,
  m71TotalExpForLevel,
} from '../src/progression/m7-1-experience-policy.ts';
import {
  M71_TRAINING_EXP_POLICY,
  m71TrainingExpForOutcome,
  m71TrainingExpReward,
} from '../src/progression/m7-1-training-rewards.ts';
import {
  RECONSTRUCTION_PROGRESSION_POLICY,
  applyExperience,
  initialM71Progression,
  migrateProgressionToM71,
  totalExpForLevel,
} from '../src/progression/progression.ts';
import {applyBattleReward} from '../src/progression/rewards.ts';
import type {RewardState} from '../src/progression/rewards.ts';
import {CURRENT_SAVE_VERSION,SAVE_KIND,validateSaveV2} from '../src/progression/save-schema.ts';
import type {SaveV2,SaveValidationContext} from '../src/progression/save-schema.ts';
import {M6_CHARACTER_IDS,M6_SAVE_CONTENT} from '../src/m6-runtime-content.ts';
import {migrateSaveToM7,serializeM7SaveV2} from '../src/progression/m7-save-migration.ts';
import {M7_TRAINING_BATTLES} from '../src/training/m7-training-camp.ts';
import {createM7IntegratedSkillState,reconcileM7IntegratedSkillState} from '../src/training/m7-skill-progression.ts';

const context:SaveValidationContext={pack:'pack',characters:M6_CHARACTER_IDS,mapBounds:{0:{width:100,height:100}}};

function legacyBase(character:string,level:number):SaveV2{
  return validateSaveV2({
    kind:SAVE_KIND,
    version:CURRENT_SAVE_VERSION,
    pack:'pack',
    character,
    mapId:0,
    x:10,
    y:10,
    gold:0,
    inventory:createInventory(),
    quest:{guide:'complete'},
    questFlags:{},
    progression:{level,exp:totalExpForLevel(level),policyId:RECONSTRUCTION_PROGRESSION_POLICY.id},
    rewardReceipts:[],
    savedAt:'2026-09-23T12:00:00Z',
  },context);
}

test('S38 fixed-hash levelabl EXP authority is identical for swordsman and wizard through Lv65',()=>{
  const values=(family:'swordsman'|'wizard')=>
    matrix.families[family].stages.slice(0,7).flatMap(stage=>stage.progression.exp_values).slice(0,65);
  assert.equal(M71_LEVELABL_EXPERIENCE_VALUES.length,65);
  assert.deepEqual(values('swordsman'),M71_LEVELABL_EXPERIENCE_VALUES);
  assert.deepEqual(values('wizard'),M71_LEVELABL_EXPERIENCE_VALUES);
  assert.equal(m71AuthoredExperienceValue(1),500);
  assert.equal(m71AuthoredExperienceValue(5),6300);
  assert.equal(m71AuthoredExperienceValue(65),16939705);
});

test('S38 authored per-level reconstruction crosses every required M7.1 boundary exactly',()=>{
  for(const toLevel of [2,6,16,26,36,46,56,65]){
    const fromLevel=toLevel-1;
    const state={level:fromLevel,exp:m71TotalExpForLevel(fromLevel),policyId:M71_EXPERIENCE_POLICY.id};
    const result=applyExperience(state,m71AuthoredExperienceValue(fromLevel));
    assert.equal(result.state.level,toLevel,fromLevel+' -> '+toLevel);
    assert.deepEqual(result.levelUps.map(event=>event.toLevel),[toLevel]);
  }
});

test('S38 one reward may cross multiple levels while preserving ordered level-up events',()=>{
  const amount=m71TotalExpForLevel(6);
  const result=applyExperience(initialM71Progression(),amount);
  assert.equal(result.state.level,6);
  assert.deepEqual(result.levelUps.map(event=>event.toLevel),[2,3,4,5,6]);
});

test('S38 legacy progression migrates by level and fractional progress without changing the attained level',()=>{
  const legacyLevel=10;
  const oldStart=totalExpForLevel(legacyLevel);
  const oldNeed=totalExpForLevel(legacyLevel+1)-oldStart;
  const legacy={level:legacyLevel,exp:oldStart+Math.floor(oldNeed/2),policyId:RECONSTRUCTION_PROGRESSION_POLICY.id};
  const migrated=migrateProgressionToM71(legacy);
  assert.equal(migrated.policyId,M71_EXPERIENCE_POLICY.id);
  assert.equal(migrated.level,legacyLevel);
  const expected=m71TotalExpForLevel(legacyLevel)+Math.floor(m71AuthoredExperienceValue(legacyLevel)/2);
  assert.equal(migrated.exp,expected);
});

test('S38 all 15 training battles reuse the S33 registry and expose deterministic EXP rewards',()=>{
  assert.equal(M7_TRAINING_BATTLES.length,15);
  assert.deepEqual(M7_TRAINING_BATTLES.map(row=>row.expReward),[
    350,2205,2977,5050,19815,19265,184541,230675,574544,626253,1360155,1482569,3935533,4289731,13551764,
  ]);
  for(const row of M7_TRAINING_BATTLES){
    assert.equal(row.expReward,m71TrainingExpReward(row.recommendedLevel,row.difficultyBand));
    assert.equal(row.expRewardEvidence,'RECONSTRUCTION_POLICY');
    const battles=Math.ceil(m71AuthoredExperienceValue(row.recommendedLevel)/row.expReward);
    assert.ok(battles>=2&&battles<=4,'battle '+row.id+' cadence='+battles);
  }
  assert.deepEqual(M71_TRAINING_EXP_POLICY.ratioPercent,{Normal:35,Hard:45,Elite:55,Boss:80});
});

test('S38 retreat and failure award zero training EXP',()=>{
  const row=M7_TRAINING_BATTLES[7]!;
  assert.equal(m71TrainingExpForOutcome(row.recommendedLevel,row.difficultyBand,'retreat'),0);
  assert.equal(m71TrainingExpForOutcome(row.recommendedLevel,row.difficultyBand,'failure'),0);
  assert.equal(m71TrainingExpForOutcome(row.recommendedLevel,row.difficultyBand,'victory'),row.expReward);
});

test('S38 reward pipeline emits one Skill Point event per M7.1 level crossed and remains idempotent',()=>{
  const state:RewardState={gold:0,inventory:createInventory(),progression:initialM71Progression(),questFlags:{},rewardReceipts:[]};
  const applied=applyBattleReward(state,'m7:training:1','battle:m7:training:1:win',{exp:m71TotalExpForLevel(6)});
  assert.equal(applied.state.progression.level,6);
  assert.deepEqual(applied.events.filter(event=>event.type==='skill_point').map(event=>event.level),[2,3,4,5,6]);
  const duplicate=applyBattleReward(applied.state,'m7:training:1','battle:m7:training:1:win',{exp:999999});
  assert.equal(duplicate.applied,false);
  assert.deepEqual(duplicate.events,[]);
});

test('S38 existing integrated skill persistence gains one unspent point on ordinary level-ups for both professions',()=>{
  const sword=createM7IntegratedSkillState('100',2);
  const swordNext=reconcileM7IntegratedSkillState(sword,'100',2,3);
  assert.equal(swordNext.family,'swordsman');
  if(sword.family!=='swordsman'||swordNext.family!=='swordsman')throw new Error('Expected swordsman state');
  assert.equal(swordNext.swordsman.unspentSkillPoints,sword.swordsman.unspentSkillPoints+1);

  const wizard=createM7IntegratedSkillState('109',2);
  const wizardNext=reconcileM7IntegratedSkillState(wizard,'109',2,3);
  assert.equal(wizardNext.family,'wizard');
  if(wizard.family!=='wizard'||wizardNext.family!=='wizard')throw new Error('Expected wizard state');
  assert.equal(wizardNext.wizard.unspentPoints,wizard.wizard.unspentPoints+1);
});

test('S38 SaveV2 migration adopts M7.1 EXP for Lv1..65 and preserves progression plus skill points on reload',()=>{
  for(const character of ['100','109']){
    const migrated=migrateSaveToM7(legacyBase(character,6),context,M6_SAVE_CONTENT);
    assert.equal(migrated.progression.level,6);
    assert.equal(migrated.progression.policyId,M71_EXPERIENCE_POLICY.id);
    const before=migrated.m7.skills.family==='swordsman'
      ?migrated.m7.skills.swordsman.unspentSkillPoints
      :migrated.m7.skills.wizard.unspentPoints;
    const loaded=migrateSaveToM7(JSON.parse(serializeM7SaveV2(migrated,context,M6_SAVE_CONTENT)),context,M6_SAVE_CONTENT);
    const after=loaded.m7.skills.family==='swordsman'
      ?loaded.m7.skills.swordsman.unspentSkillPoints
      :loaded.m7.skills.wizard.unspentPoints;
    assert.deepEqual(loaded.progression,migrated.progression);
    assert.equal(after,before);
    assert.equal(loaded.m7.family,migrated.m7.family);
  }
});

test('S38 M6 levels above the M7.1 Lv65 gameplay axis retain their legacy progression policy',()=>{
  const save=migrateSaveToM7(legacyBase('190',90),context,M6_SAVE_CONTENT);
  assert.equal(save.progression.level,90);
  assert.equal(save.progression.policyId,RECONSTRUCTION_PROGRESSION_POLICY.id);
});

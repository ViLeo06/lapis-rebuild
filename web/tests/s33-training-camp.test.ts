import test from 'node:test';
import assert from 'node:assert/strict';
import {M7_TRAINING_BATTLES,reconstructionSetupForTrainingBattle,resolvePlayerDifficultyHint} from '../src/training/m7-training-camp.ts';
import {renderM7TrainingCamp} from '../src/ui/m7-training-camp.ts';

test('S33 defines exactly 15 fixed-level battles on the approved M7 cadence',()=>{
  assert.equal(M7_TRAINING_BATTLES.length,15);
  assert.deepEqual(M7_TRAINING_BATTLES.map(row=>row.recommendedLevel),[2,5,6,10,15,16,25,26,35,36,45,46,55,56,65]);
  assert.deepEqual(M7_TRAINING_BATTLES.map(row=>row.stage),[1,1,2,2,2,3,3,4,4,5,5,6,6,7,7]);
  assert.ok(new Set(M7_TRAINING_BATTLES.map(row=>row.battleZoneId)).size>=12);
  assert.ok(M7_TRAINING_BATTLES.every(row=>row.sceneEvidence==='VERIFIED-STATIC-ORIGINAL'));
  assert.ok(M7_TRAINING_BATTLES.every(row=>row.trainingBindingEvidence==='RECONSTRUCTION_POLICY'));
});

test('S33 monster-role contract covers M7 tactical needs without inventing S30 monster ids',()=>{
  const roles=new Set(M7_TRAINING_BATTLES.flatMap(row=>row.monsterContract.map(monster=>monster.role)));
  for(const role of ['melee','ranged','tank','fast','magic','dot','healer','control','elite','boss'])assert.ok(roles.has(role),role);
  assert.ok(M7_TRAINING_BATTLES.some(row=>row.monsterContract.some(monster=>monster.role==='healer')));
  const signatures=M7_TRAINING_BATTLES.map(row=>row.candidateMonsterIds.join('|'));
  assert.equal(new Set(signatures).size,15);
  assert.deepEqual(M7_TRAINING_BATTLES[7]!.candidateMonsterIds,['m7-green-armored-renewer-l26']);
  assert.deepEqual(M7_TRAINING_BATTLES[14]!.candidateMonsterIds,['m7-spectral-overseer-boss-l65','m7-cyan-spectral-elite-l60']);
});

test('S33 reconstruction battle setup keeps enemy level fixed when player level changes',()=>{
  const preset=M7_TRAINING_BATTLES[14]!;
  const low=reconstructionSetupForTrainingBattle(preset,'160',20);
  const atLevel=reconstructionSetupForTrainingBattle(preset,'160',65);
  assert.equal(low.enemyLevel,65);
  assert.equal(atLevel.enemyLevel,65);
  assert.equal(low.level,20);
  assert.equal(atLevel.level,65);
});

test('difficulty hint is dynamic presentation only',()=>{
  const preset=M7_TRAINING_BATTLES[8]!;
  assert.equal(resolvePlayerDifficultyHint(50,preset.recommendedLevel),'Easy');
  assert.equal(resolvePlayerDifficultyHint(35,preset.recommendedLevel),'Normal');
  assert.equal(resolvePlayerDifficultyHint(30,preset.recommendedLevel),'Hard');
  assert.equal(resolvePlayerDifficultyHint(20,preset.recommendedLevel),'Very Hard');
  assert.equal(preset.fixedEnemyLevel,35);
});

test('training camp renderer exposes all 15 touchable Start actions',()=>{
  const html=renderM7TrainingCamp(26,8);
  assert.equal((html.match(/data-action="training-start"/g)??[]).length,15);
  assert.match(html,/Battle #8 · Lv26/);
  assert.match(html,/healer/);
  assert.match(html,/敌人等级固定/);
});

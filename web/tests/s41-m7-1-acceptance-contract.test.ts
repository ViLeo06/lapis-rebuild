import assert from 'node:assert/strict';
import test from 'node:test';
import {M71_ACCEPTANCE_CONTRACT as contract} from '../src/integration/m7-1-acceptance-contract.ts';

test('S41 M7.1 contract locks worker authority and branch boundary',()=>{
  assert.equal(contract.baseline,'6094aae3c4ff0a04af5dd4376f2b59b8b342d430');
  assert.equal(contract.integrationBranch,'codex/m7-1-gameplay-skill-integration');
  assert.deepEqual(Object.values(contract.authorities),['S35','S36','S37','S38','S39','S40','S41']);
});

test('S41 M7.1 contract locks 14 skills and 84 skill-level states',()=>{
  assert.equal(contract.skillCounts.swordsmanFamilies,7);
  assert.equal(contract.skillCounts.wizardFamilies,7);
  assert.equal(contract.skillCounts.levelsPerSkill,6);
  assert.equal(contract.skillCounts.totalStates,84);
  assert.equal(contract.skillCounts.swordsmanStates+contract.skillCounts.wizardStates,84);
});

test('S41 M7.1 contract locks automatic range-state behavior',()=>{
  assert.equal(contract.range.independentToggle,false);
  assert.equal(contract.range.normalAction,'movement-range');
  assert.equal(contract.range.skillSelected,'cast-distance+aoe');
  assert.equal(contract.range.cancelSkill,'movement-range');
});

test('S41 M7.1 contract locks poison geometry and damage cadence semantics',()=>{
  assert.deepEqual([...contract.poison.castDistance],[4,4,5,5,6,6]);
  assert.deepEqual([...contract.poison.areaCode],[1,1,2,2,2,3]);
  assert.deepEqual([...contract.poison.diamondCells],[5,5,13,13,13,25]);
  assert.equal(contract.poison.emptyCenterAllowed,true);
  assert.equal(contract.poison.immediateDamage,true);
  assert.equal(contract.poison.dotRatioAfterInitial,0.5);
  assert.deepEqual([...contract.poison.eventFields],['targetId','targetCell','damageAmount','eventTime']);
});

test('S41 M7.1 contract locks camera, minimap and non-teleport movement rules',()=>{
  assert.equal(contract.camera.defaultMode,'FOLLOW_PLAYER');
  assert.equal(contract.camera.manualMode,'MANUAL_VIEW');
  assert.equal(contract.camera.resumeFollowOn,'PLAYER_MOVEMENT_COMMAND');
  assert.equal(contract.camera.attackResumesFollow,false);
  assert.equal(contract.camera.skillResumesFollow,false);
  assert.equal(contract.minimap.battlePlacement,'bottom-right');
  assert.equal(contract.minimap.worldPlacement,'top-left');
  assert.equal(contract.monsterMovement.teleportAllowed,false);
  assert.equal(contract.monsterMovement.movementAnimationSlot,'_01');
});

test('S41 M7.1 contract locks progression, training and HUD acceptance',()=>{
  assert.equal(contract.progression.maxLevel,65);
  assert.equal(contract.progression.retreatExp,0);
  assert.equal(contract.progression.failureExp,0);
  assert.equal(contract.progression.skillPointPerLevel,1);
  assert.equal(contract.training.battleCount,15);
  assert.equal(contract.training.registryAuthority,'S33');
  assert.equal(contract.training.settingsPrimaryEntry,false);
  assert.deepEqual([...contract.battleHud.requiredFields],['HP','MP','EXP','ATK','DEF']);
});

test('S41 M7.1 final gate preserves the named regression set',()=>{
  const expected=[
    'direct-enemy-click-basic-attack',
    'grouped-encounter',
    'all-living-enemies-visible',
    'max-five-interactive-proximity-cluster',
    'poison-empty-center-targeting',
    'confirmed-retreat',
    'mobile-interaction',
    'savev2-migration',
    'developer-presets',
    'recovery-actions',
    'original-battle-zones',
    'fifteen-fixed-training-rosters',
  ];
  assert.deepEqual([...contract.regressions],expected);
  assert.equal(contract.finalGateEnv,'S41_M7_1_FINAL');
});

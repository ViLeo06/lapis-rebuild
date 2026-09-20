import {test} from 'node:test';
import assert from 'node:assert/strict';

import {
  RECONSTRUCTION_SWORDSMAN_PROGRESSION_POLICY,
  SWORDSMAN_STAGE_IDS,
  SWORDSMAN_STAGES,
  applySwordsmanExperience,
  availableSwordsmanSkillIds,
  canPromoteSwordsman,
  createInitialSwordsmanState,
  isSwordsmanEquipmentEligible,
  promoteSwordsman,
  promotionRequirementForStage,
  swordsmanEligibleEquipmentIds,
  swordsmanSkillAvailable,
  swordsmanSkillMpCost,
  swordsmanStageById,
} from '../src/classes/swordsman-ten-stage.ts';
import type {SwordsmanProgressionState, SwordsmanStageId} from '../src/classes/swordsman-ten-stage.ts';
import {
  applySwordsmanStateToSaveV2,
  restoreSwordsmanStateFromSaveV2,
  withSwordsmanSaveStages,
} from '../src/classes/swordsman-save.ts';
import {
  playableClassById,
  skillAvailableForClass,
} from '../src/content/classes/class-catalog.ts';
import {equipItem} from '../src/progression/equipment.ts';
import {createInventory} from '../src/progression/inventory.ts';
import {totalExpForLevel} from '../src/progression/progression.ts';
import {
  CURRENT_SAVE_VERSION,
  SAVE_KIND,
  serializeSaveV2,
} from '../src/progression/save-schema.ts';
import type {SaveV2, SaveValidationContext} from '../src/progression/save-schema.ts';
import {deserializeSave} from '../src/progression/save-migration.ts';

const expectedNames = [
  '见习剑士', '剑士', '高级剑士', '剑术师范', '皇家剑士',
  '狂战士', '大剑师', '英雄', '战神', '传说战神',
];
const expectedHp = [125, 137, 150, 162, 175, 187, 200, 212, 225, 237];
const expectedMp = [100, 105, 110, 115, 120, 125, 130, 135, 140, 145];
const expectedHit = [160, 160, 170, 170, 180, 180, 190, 190, 200, 200];
const expectedEntrySkills = [1101, 1201, 1301, 1401, 1501, 0, 0, 0, 0, 0];

function starterInventory() {
  let inventory = createInventory([
    {itemId: 3, source: {kind: 'starter', ref: 's26-test'}},
    {itemId: 25, source: {kind: 'starter', ref: 's26-test'}},
  ]);
  inventory = equipItem(inventory, '100', 'weapon', 3);
  inventory = equipItem(inventory, '100', 'armor', 25);
  return inventory;
}

function advanceToStage(
  state: SwordsmanProgressionState,
  targetStageId: SwordsmanStageId,
): SwordsmanProgressionState {
  let current = state;
  while (current.stageId !== targetStageId) {
    const requirement = promotionRequirementForStage(current.stageId);
    if (!requirement) throw new Error('Target stage is unreachable');
    const targetExp = totalExpForLevel(requirement.requiredLevel);
    if (current.progression.exp < targetExp) {
      current = applySwordsmanExperience(
        current,
        targetExp - current.progression.exp,
      ).state;
    }
    current = promoteSwordsman(current).state;
  }
  return current;
}

test('S26 exposes exactly the ten canonical swordsman stages in order', () => {
  assert.deepEqual(SWORDSMAN_STAGE_IDS, [100,110,120,130,140,150,160,170,180,190]);
  assert.equal(SWORDSMAN_STAGES.length, 10);
  assert.deepEqual(SWORDSMAN_STAGES.map(stage => stage.displayName), expectedNames);
  assert.deepEqual(SWORDSMAN_STAGES.map(stage => stage.authored.hp), expectedHp);
  assert.deepEqual(SWORDSMAN_STAGES.map(stage => stage.authored.mp), expectedMp);
  assert.deepEqual(SWORDSMAN_STAGES.map(stage => stage.authored.hit), expectedHit);
  assert.deepEqual(SWORDSMAN_STAGES.map(stage => stage.authored.stageEntrySkillId), expectedEntrySkills);
  assert.ok(SWORDSMAN_STAGES.every(stage => stage.authored.move === 5));
  assert.ok(SWORDSMAN_STAGES.every(stage => stage.authored.range === 1));
  assert.ok(SWORDSMAN_STAGES.every(stage => stage.provenance.classRow.level === 'VERIFIED-STATIC-ORIGINAL'));
});

test('all stages bind the verified original B-family ANI/SPR action resources without inventing _05 semantics', () => {
  for (const stage of SWORDSMAN_STAGES) {
    assert.equal(stage.visual.family, `B${stage.stageId}`);
    assert.equal(stage.visual.bodyPrefix, 'Body_');
    assert.equal(stage.visual.provenance.level, 'VERIFIED-STATIC-ORIGINAL');
    assert.deepEqual(stage.visual.actionSlots.map(action => action.slot), ['00','01','02','03','05']);
    for (const action of stage.visual.actionSlots) {
      assert.equal(action.aniPath, `Char/B${stage.stageId}_${action.slot}.ani`);
      assert.equal(action.sprPath, `Char/B${stage.stageId}_${action.slot}.spr`);
    }
    assert.equal(stage.visual.actionSlots.find(action => action.slot === '03')?.semantic, 'hit-reaction');
    assert.equal(stage.visual.actionSlots.find(action => action.slot === '03')?.semanticEvidence.level, 'VERIFIED-STATIC-ORIGINAL');
    assert.equal(stage.visual.actionSlots.find(action => action.slot === '05')?.semantic, 'unknown-special');
    assert.equal(stage.visual.actionSlots.find(action => action.slot === '05')?.semanticEvidence.level, 'UNVERIFIED');
  }
});

test('promotion is centralized reconstruction policy and legally advances 100 through 190', () => {
  let state = createInitialSwordsmanState(starterInventory());
  assert.equal(state.stageId, 100);
  assert.throws(() => promoteSwordsman(state));
  const promoted: number[] = [state.stageId];

  while (state.stageId !== 190) {
    const requirement = promotionRequirementForStage(state.stageId)!;
    assert.equal(requirement.provenance, 'RECONSTRUCTION_POLICY');
    assert.equal(canPromoteSwordsman(state), false);
    const neededExp = totalExpForLevel(requirement.requiredLevel) - state.progression.exp;
    state = applySwordsmanExperience(state, neededExp).state;
    assert.equal(canPromoteSwordsman(state), true);
    const result = promoteSwordsman(state);
    assert.equal(result.event.fromStageId, state.stageId);
    assert.equal(result.event.provenance, 'RECONSTRUCTION_POLICY');
    state = result.state;
    promoted.push(state.stageId);
  }

  assert.deepEqual(promoted, [...SWORDSMAN_STAGE_IDS]);
  assert.equal(state.progression.level, 90);
  assert.equal(canPromoteSwordsman(state), false);
  assert.equal(promotionRequirementForStage(190), null);
  assert.throws(() => promoteSwordsman(state));
  assert.equal(RECONSTRUCTION_SWORDSMAN_PROGRESSION_POLICY.id, 'm6-swordsman-ten-stage-v1');
});

test('representative M5.1 skills remain available while authored later-stage entry references stay separate', () => {
  for(const stageId of SWORDSMAN_STAGE_IDS) assert.deepEqual(availableSwordsmanSkillIds(stageId), [1101,1201,1301]);
  assert.equal(swordsmanSkillAvailable(100, 1201), true);
  assert.equal(swordsmanSkillAvailable(110, 1201), true);
  assert.equal(swordsmanSkillAvailable(120, 1301), true);
  assert.equal(swordsmanSkillAvailable(130, 1401), false);
  assert.equal(swordsmanStageById(130).authored.stageEntrySkillId, 1401);
  assert.equal(swordsmanStageById(140).authored.stageEntrySkillId, 1501);
  assert.equal(swordsmanSkillMpCost(1101), 25);
  assert.equal(swordsmanSkillMpCost(1201), 23);
  assert.equal(swordsmanSkillMpCost(1301), 20);
  assert.throws(() => swordsmanSkillMpCost(1401));
});

test('current family equipment policy is legal at every swordsman stage and rejects wizard gear', () => {
  for (const stageId of SWORDSMAN_STAGE_IDS) {
    assert.deepEqual(swordsmanEligibleEquipmentIds(stageId), [1,3,25]);
    for (const itemId of [1,3,25]) assert.equal(isSwordsmanEquipmentEligible(stageId, itemId), true);
    for (const itemId of [10,12,31]) assert.equal(isSwordsmanEquipmentEligible(stageId, itemId), false);
  }
  assert.equal(swordsmanStageById(100).provenance.classRow.level, 'VERIFIED-STATIC-ORIGINAL');
});

test('authored stage stats are sane and monotonic where the current client table is monotonic', () => {
  for (let index = 1; index < SWORDSMAN_STAGES.length; index += 1) {
    const previous = SWORDSMAN_STAGES[index - 1]!;
    const current = SWORDSMAN_STAGES[index]!;
    assert.ok(current.authored.hp >= previous.authored.hp);
    assert.ok(current.authored.mp >= previous.authored.mp);
    assert.ok(current.authored.hit >= previous.authored.hit);
    assert.ok(current.authored.magicHit >= previous.authored.magicHit);
  }
});

test('SaveV2 round-trip preserves stage, progression, equipment and derived skill availability', () => {
  const baseContext: SaveValidationContext = {
    pack: 'pack',
    characters: ['100','109'],
    mapBounds: {0: {width: 100, height: 100}},
  };
  const state = advanceToStage(createInitialSwordsmanState(starterInventory()), 190);
  const template: SaveV2 = {
    kind: SAVE_KIND,
    version: CURRENT_SAVE_VERSION,
    pack: 'pack',
    character: '100',
    mapId: 0,
    x: 32,
    y: 32,
    gold: 15,
    inventory: starterInventory(),
    quest: {guide: 'complete'},
    questFlags: {'m4.guide.complete': true},
    progression: createInitialSwordsmanState().progression,
    rewardReceipts: ['battle:training:0:win'],
    savedAt: '2026-09-20T00:00:00Z',
  };

  const save = applySwordsmanStateToSaveV2(template, state, baseContext);
  assert.equal(save.version, 2);
  assert.equal(save.character, '190');

  const expandedContext = withSwordsmanSaveStages(baseContext);
  const loaded = deserializeSave(serializeSaveV2(save, expandedContext), expandedContext);
  const restored = restoreSwordsmanStateFromSaveV2(loaded, baseContext);

  assert.equal(restored.stageId, 190);
  assert.deepEqual(restored.progression, state.progression);
  assert.deepEqual(restored.inventory.equipped, {weapon: 3, armor: 25});
  assert.deepEqual(
    availableSwordsmanSkillIds(restored.stageId),
    availableSwordsmanSkillIds(state.stageId),
  );
});

test('M5.1 base swordsman contract remains intact across the M6 stage adapter', () => {
  const legacy = playableClassById(100);
  assert.equal(legacy.displayName, '见习剑士');
  assert.deepEqual(legacy.availableSkillIds, [1101,1201,1301]);
  assert.equal(skillAvailableForClass(100, 1201), true);
  assert.deepEqual(availableSwordsmanSkillIds(100), [1101,1201,1301]);
  assert.throws(() => swordsmanStageById(109));
});

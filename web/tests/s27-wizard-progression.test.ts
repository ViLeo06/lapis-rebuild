import {test} from 'node:test';
import assert from 'node:assert/strict';

import {
  RECONSTRUCTION_WIZARD_PROGRESSION_POLICY,
  WIZARD_STAGE_IDS,
  WIZARD_STAGES,
  applyWizardExperience,
  availableWizardSkillIds,
  canPromoteWizard,
  createInitialWizardState,
  isWizardEquipmentEligible,
  promoteWizard,
  wizardEligibleEquipmentIds,
  wizardMagicReadinessCost,
  wizardPromotionRequirementForStage,
  wizardSkillAvailable,
  wizardSkillMpCost,
  wizardStageById,
} from '../src/classes/wizard-ten-stage.ts';
import type {WizardProgressionState,WizardStageId} from '../src/classes/wizard-ten-stage.ts';
import {
  applyWizardStateToSaveV2,
  restoreWizardStateFromSaveV2,
  withWizardSaveStages,
} from '../src/classes/wizard-save.ts';
import {playableClassById,skillAvailableForClass} from '../src/content/classes/class-catalog.ts';
import {equipItem} from '../src/progression/equipment.ts';
import {createInventory} from '../src/progression/inventory.ts';
import {totalExpForLevel} from '../src/progression/progression.ts';
import {CURRENT_SAVE_VERSION,SAVE_KIND,serializeSaveV2} from '../src/progression/save-schema.ts';
import type {SaveV2,SaveValidationContext} from '../src/progression/save-schema.ts';
import {deserializeSave} from '../src/progression/save-migration.ts';

const expectedNames=['见习巫师','巫师','高级巫师','黑暗巫师','咒术师','祭司','大祭司','亡灵法师','地狱法师','黑暗女神'];
const expectedHp=[100,110,120,130,140,150,160,170,180,190];
const expectedMp=[130,136,143,149,156,162,169,175,182,188];
const expectedHit=[160,160,170,170,180,180,190,190,200,200];
const expectedEntrySkills=[19101,19201,19301,19401,19501,0,0,0,0,0];

function starterInventory(){
  let inventory=createInventory([
    {itemId:12,source:{kind:'starter',ref:'s27-test'}},
    {itemId:31,source:{kind:'starter',ref:'s27-test'}},
  ]);
  inventory=equipItem(inventory,'109','weapon',12);
  inventory=equipItem(inventory,'109','armor',31);
  return inventory;
}

function advanceToStage(state:WizardProgressionState,targetStageId:WizardStageId):WizardProgressionState{
  let current=state;
  while(current.stageId!==targetStageId){
    const requirement=wizardPromotionRequirementForStage(current.stageId);
    if(!requirement)throw new Error('Target wizard stage is unreachable');
    const targetExp=totalExpForLevel(requirement.requiredLevel);
    if(current.progression.exp<targetExp){
      current=applyWizardExperience(current,targetExp-current.progression.exp).state;
    }
    current=promoteWizard(current).state;
  }
  return current;
}

test('S27 exposes exactly the ten canonical wizard stages in order',()=>{
  assert.deepEqual(WIZARD_STAGE_IDS,[109,119,129,139,149,159,169,179,189,199]);
  assert.equal(WIZARD_STAGES.length,10);
  assert.deepEqual(WIZARD_STAGES.map(stage=>stage.displayName),expectedNames);
  assert.deepEqual(WIZARD_STAGES.map(stage=>stage.authored.hp),expectedHp);
  assert.deepEqual(WIZARD_STAGES.map(stage=>stage.authored.mp),expectedMp);
  assert.deepEqual(WIZARD_STAGES.map(stage=>stage.authored.hit),expectedHit);
  assert.deepEqual(WIZARD_STAGES.map(stage=>stage.authored.stageEntrySkillId),expectedEntrySkills);
  assert.ok(WIZARD_STAGES.every(stage=>stage.authored.move===4));
  assert.ok(WIZARD_STAGES.every(stage=>stage.authored.range===1));
  assert.ok(WIZARD_STAGES.every(stage=>stage.provenance.authoredMp.level==='VERIFIED-STATIC-ORIGINAL'));
});

test('all wizard stages bind original B-family resources without inventing _05 semantics',()=>{
  for(const stage of WIZARD_STAGES){
    assert.equal(stage.visual.family,`B${stage.stageId}`);
    assert.equal(stage.visual.provenance.level,'VERIFIED-STATIC-ORIGINAL');
    assert.deepEqual(stage.visual.actionSlots.map(action=>action.slot),['00','01','02','03','05']);
    for(const action of stage.visual.actionSlots){
      assert.equal(action.aniPath,`Char/B${stage.stageId}_${action.slot}.ani`);
      assert.equal(action.sprPath,`Char/B${stage.stageId}_${action.slot}.spr`);
    }
    assert.equal(stage.visual.actionSlots.find(action=>action.slot==='03')?.semantic,'hit-reaction');
    assert.equal(stage.visual.actionSlots.find(action=>action.slot==='05')?.semanticEvidence.level,'UNVERIFIED');
  }
});

test('wizard promotion remains centralized reconstruction policy and reaches 199',()=>{
  let state=createInitialWizardState(starterInventory());
  assert.equal(state.stageId,109);
  assert.throws(()=>promoteWizard(state));
  const promoted:number[]=[state.stageId];
  while(state.stageId!==199){
    const requirement=wizardPromotionRequirementForStage(state.stageId)!;
    assert.equal(requirement.provenance,'RECONSTRUCTION_POLICY');
    const needed=totalExpForLevel(requirement.requiredLevel)-state.progression.exp;
    state=applyWizardExperience(state,needed).state;
    assert.equal(canPromoteWizard(state),true);
    state=promoteWizard(state).state;
    promoted.push(state.stageId);
  }
  assert.deepEqual(promoted,[...WIZARD_STAGE_IDS]);
  assert.equal(state.progression.level,90);
  assert.equal(canPromoteWizard(state),false);
  assert.equal(wizardPromotionRequirementForStage(199),null);
  assert.equal(RECONSTRUCTION_WIZARD_PROGRESSION_POLICY.id,'m6-wizard-ten-stage-v1');
});

test('modeled wizard Magic availability is staged while authored 19401/19501 refs remain evidence only',()=>{
  assert.deepEqual(availableWizardSkillIds(109),[19101]);
  assert.deepEqual(availableWizardSkillIds(119),[19101,19201]);
  assert.deepEqual(availableWizardSkillIds(129),[19101,19201,19301]);
  assert.deepEqual(availableWizardSkillIds(199),[19101,19201,19301]);
  assert.equal(wizardSkillAvailable(109,19201),false);
  assert.equal(wizardSkillAvailable(119,19201),true);
  assert.equal(wizardSkillAvailable(129,19301),true);
  assert.equal(wizardSkillAvailable(139,19401),false);
  assert.equal(wizardStageById(139).authored.stageEntrySkillId,19401);
  assert.equal(wizardStageById(149).authored.stageEntrySkillId,19501);
  assert.equal(wizardSkillMpCost(19101),20);
  assert.equal(wizardSkillMpCost(19201),20);
  assert.equal(wizardSkillMpCost(19301),20);
  assert.throws(()=>wizardSkillMpCost(19401));
});

test('wizard readiness uses the recovered profile contract at every stage',()=>{
  for(const stageId of WIZARD_STAGE_IDS)assert.equal(wizardMagicReadinessCost(stageId,20),10);
});

test('current family equipment policy works across wizard stages and rejects swordsman gear',()=>{
  for(const stageId of WIZARD_STAGE_IDS){
    assert.deepEqual(wizardEligibleEquipmentIds(stageId),[10,12,31]);
    for(const itemId of [10,12,31])assert.equal(isWizardEquipmentEligible(stageId,itemId),true);
    for(const itemId of [1,3,25])assert.equal(isWizardEquipmentEligible(stageId,itemId),false);
  }
});

test('authored wizard HP/MP/hit anchors stay monotonic across the current table',()=>{
  for(let index=1;index<WIZARD_STAGES.length;index+=1){
    const previous=WIZARD_STAGES[index-1]!;
    const current=WIZARD_STAGES[index]!;
    assert.ok(current.authored.hp>=previous.authored.hp);
    assert.ok(current.authored.mp>=previous.authored.mp);
    assert.ok(current.authored.hit>=previous.authored.hit);
    assert.ok(current.authored.magicHit>=previous.authored.magicHit);
  }
});

test('SaveV2 round-trip preserves wizard stage, progression and equipment',()=>{
  const baseContext:SaveValidationContext={pack:'pack',characters:['100','109'],mapBounds:{0:{width:100,height:100}}};
  const state=advanceToStage(createInitialWizardState(starterInventory()),199);
  const template:SaveV2={
    kind:SAVE_KIND,version:CURRENT_SAVE_VERSION,pack:'pack',character:'109',mapId:0,x:32,y:32,gold:15,
    inventory:starterInventory(),quest:{guide:'complete'},questFlags:{'m4.guide.complete':true},
    progression:createInitialWizardState().progression,rewardReceipts:['battle:training:0:win'],savedAt:'2026-09-20T00:00:00Z',
  };
  const save=applyWizardStateToSaveV2(template,state,baseContext);
  assert.equal(save.character,'199');
  const expanded=withWizardSaveStages(baseContext);
  const loaded=deserializeSave(serializeSaveV2(save,expanded),expanded);
  const restored=restoreWizardStateFromSaveV2(loaded,baseContext);
  assert.equal(restored.stageId,199);
  assert.deepEqual(restored.progression,state.progression);
  assert.deepEqual(restored.inventory.equipped,{weapon:12,armor:31});
  assert.deepEqual(availableWizardSkillIds(restored.stageId),availableWizardSkillIds(state.stageId));
});

test('M5.1 base wizard remains compatible while S27 adds staged skill availability',()=>{
  const legacy=playableClassById(109);
  assert.equal(legacy.displayName,'见习巫师');
  assert.deepEqual(legacy.availableSkillIds,[19101,19201,19301]);
  assert.equal(skillAvailableForClass(109,19201),true);
  assert.deepEqual(availableWizardSkillIds(109),[19101]);
  assert.throws(()=>wizardStageById(100));
});

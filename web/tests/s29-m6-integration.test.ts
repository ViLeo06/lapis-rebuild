import {test} from 'node:test';
import assert from 'node:assert/strict';

import {serializableClassSnapshot} from '../src/content/classes/class-catalog.ts';
import {createInventory} from '../src/progression/inventory.ts';
import {applyM6Promotion} from '../src/progression/m6-stage-promotion.ts';
import {
  M6_CHARACTER_IDS,
  createM6StageState,
  m6PromotionRuleForCharacter,
  m6QuestChainForLegacyStage,
  m6SkillIdsForCharacter,
  m6StageTrackForCharacter,
} from '../src/m6-runtime-content.ts';

test('S29 production class catalog exposes all twenty canonical M6 stages',()=>{
  const ids=serializableClassSnapshot().map(entry=>entry.classId).sort((a,b)=>a-b);
  assert.equal(ids.length,20);
  assert.deepEqual(ids,[...M6_CHARACTER_IDS].map(Number).sort((a,b)=>a-b));
});

function runTrack(initial:string,expected:readonly number[]){
  let state=createM6StageState(initial);
  const inventory=createInventory();
  const questChain=m6QuestChainForLegacyStage('not_started',{});
  const visited=[state.stageId];
  while(true){
    const rule=m6PromotionRuleForCharacter(state.stageId);
    if(!rule)break;
    const early=applyM6Promotion(m6StageTrackForCharacter(state.stageId),state,rule,{
      level:(rule.minimumLevel??1)-1,questFlags:{},questChain,inventory,
    });
    assert.equal(early.applied,false);
    assert.ok(early.reasons.includes('level-requirement'));
    const promoted=applyM6Promotion(m6StageTrackForCharacter(state.stageId),state,rule,{
      level:rule.minimumLevel??1,questFlags:{},questChain,inventory,
    });
    assert.equal(promoted.applied,true);
    state=promoted.state;
    visited.push(state.stageId);
  }
  assert.deepEqual(visited,expected);
  assert.equal(state.promotionReceipts.length,9);
  assert.equal(m6PromotionRuleForCharacter(state.stageId),null);
}

test('S29 promotion authority walks swordsman 100 through 190 without direct stage mutation',()=>{
  runTrack('100',[100,110,120,130,140,150,160,170,180,190]);
});

test('S29 promotion authority walks wizard 109 through 199 without direct stage mutation',()=>{
  runTrack('109',[109,119,129,139,149,159,169,179,189,199]);
});

test('S29 staged player skill views remain bounded by implemented runtime effects',()=>{
  assert.deepEqual(m6SkillIdsForCharacter(100),[1101]);
  assert.deepEqual(m6SkillIdsForCharacter(110),[1101,1201]);
  assert.deepEqual(m6SkillIdsForCharacter(120),[1101,1201,1301]);
  assert.deepEqual(m6SkillIdsForCharacter(109),[19101]);
  assert.deepEqual(m6SkillIdsForCharacter(119),[19101,19201]);
  assert.deepEqual(m6SkillIdsForCharacter(129),[19101,19201,19301]);
  assert.deepEqual(m6SkillIdsForCharacter(199),[19101,19201,19301]);
});

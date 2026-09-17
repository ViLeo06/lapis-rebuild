import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createM4RewardState,parseM4Quest,questHud} from '../src/m4-runtime-integration.ts';
import {applyBattleReward,applyQuestReward} from '../src/progression/rewards.ts';
import {TRAINING_QUEST_ID} from '../src/world/world-content.ts';

test('M4 starter state uses versioned progression and quantity inventory',()=>{
  const state=createM4RewardState(7);
  assert.equal(state.gold,7);
  assert.equal(state.progression.level,1);
  assert.equal(state.progression.policyId,'m4-linear-100x-level-v1');
  assert.ok(state.inventory.items.length>0);
  assert.ok(state.inventory.items.every(item=>item.quantity===1));
});

test('M4 quest save parsing accepts current state and safely handles legacy guide',()=>{
  assert.deepEqual(parseM4Quest({questId:TRAINING_QUEST_ID,stage:'objective'}),{questId:TRAINING_QUEST_ID,stage:'objective'});
  assert.deepEqual(parseM4Quest({guide:'complete'}),{questId:TRAINING_QUEST_ID,stage:'complete'});
  assert.deepEqual(parseM4Quest({guide:'city_visit'}),{questId:TRAINING_QUEST_ID,stage:'not_started'});
});

test('M4 HUD wording follows the world quest state machine',()=>{
  assert.match(questHud('not_started').questDetail??'',/训练引导员/);
  assert.match(questHud('objective').questDetail??'',/战斗/);
  assert.match(questHud('ready_to_turn_in').questDetail??'',/返回/);
  assert.match(questHud('complete').questDetail??'',/完成/);
});

test('M4 battle and quest settlement share S12 idempotent rewards',()=>{
  const starter=createM4RewardState();
  const battle=applyBattleReward(starter,'s9-training-battle','battle:s9-training-run:win',{gold:10,exp:100});
  assert.equal(battle.state.gold,10);
  assert.equal(battle.state.progression.level,2);
  const duplicate=applyBattleReward(battle.state,'s9-training-battle','battle:s9-training-run:win',{gold:10,exp:100});
  assert.equal(duplicate.applied,false);
  const quest=applyQuestReward(duplicate.state,TRAINING_QUEST_ID,'quest:s9-training-run:turn-in',{gold:5,exp:200,questFlags:['m4.training.complete']});
  assert.equal(quest.state.gold,15);
  assert.equal(quest.state.progression.level,3);
  assert.equal(quest.state.questFlags['m4.training.complete'],true);
});

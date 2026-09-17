import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInventory, grantItem, quantityOf} from '../src/progression/inventory.ts';
import {equipItem, reconcileEquipmentForCharacter} from '../src/progression/equipment.ts';
import {applyExperience, initialProgression} from '../src/progression/progression.ts';
import {applyBattleReward, applyQuestReward} from '../src/progression/rewards.ts';
import type {RewardState} from '../src/progression/rewards.ts';
import {SAVE_KIND, serializeSaveV2, validateSaveV2} from '../src/progression/save-schema.ts';
import type {SaveValidationContext, SaveV2} from '../src/progression/save-schema.ts';
import {deserializeSave, migrateSave} from '../src/progression/save-migration.ts';

const context: SaveValidationContext={pack:'pack',characters:['100','109'],mapBounds:{0:{width:100,height:100},1:{width:200,height:200}}};
const starter=()=>createInventory([{itemId:1,source:{kind:'starter',ref:'test'}},{itemId:25,source:{kind:'starter',ref:'test'}},{itemId:10,source:{kind:'starter',ref:'test'}},{itemId:31,source:{kind:'starter',ref:'test'}}]);
const rewardState=():RewardState=>({gold:0,inventory:starter(),progression:initialProgression(),questFlags:{},rewardReceipts:[]});

test('inventory tracks quantity metadata and acquisition source',()=>{
  const a=grantItem(starter(),1,2,{kind:'battle',ref:'battle:demo'});
  assert.equal(quantityOf(a,1),3);
  const item=a.items.find(entry=>entry.itemId===1)!;
  assert.equal(item.metadataRef,'itemtbl:1');
  assert.deepEqual(item.acquisitionSources.at(-1),{kind:'battle',ref:'battle:demo',quantity:2});
});

test('equipment rejects cross-class items and class switch unequips incompatible gear',()=>{
  const sword=equipItem(starter(),'100','weapon',1);
  assert.throws(()=>equipItem(sword,'100','weapon',10));
  const switched=reconcileEquipmentForCharacter(sword,'109');
  assert.equal(switched.inventory.equipped.weapon,null);
  assert.deepEqual(switched.unequipped,[1]);
  assert.equal(quantityOf(switched.inventory,1),1);
});

test('reconstruction progression emits deterministic level-up events',()=>{
  const result=applyExperience(initialProgression(),310);
  assert.deepEqual(result.state,{level:3,exp:310,policyId:'m4-linear-100x-level-v1'});
  assert.deepEqual(result.levelUps.map(event=>event.toLevel),[2,3]);
  assert.ok(result.levelUps.every(event=>event.provenance==='RECONSTRUCTION_POLICY'));
});

test('battle and quest rewards share one idempotent pipeline',()=>{
  const battle=applyBattleReward(rewardState(),'training:0','battle:training:0:win',{gold:10,items:[{itemId:3,quantity:1}],exp:100});
  assert.equal(battle.applied,true);
  assert.equal(battle.state.gold,10);
  assert.equal(quantityOf(battle.state.inventory,3),1);
  assert.equal(battle.state.progression.level,2);
  const duplicate=applyBattleReward(battle.state,'training:0','battle:training:0:win',{gold:10});
  assert.equal(duplicate.applied,false);
  assert.equal(duplicate.state.gold,10);
  const quest=applyQuestReward(duplicate.state,'m4:guide','quest:m4:guide:turn-in',{gold:5,questFlags:['m4.guide.complete'],items:[{itemId:12,quantity:1}],exp:200});
  assert.equal(quest.state.gold,15);
  assert.equal(quest.state.questFlags['m4.guide.complete'],true);
  assert.equal(quantityOf(quest.state.inventory,12),1);
  assert.equal(quest.state.progression.level,3);
});

function v2():SaveV2{return {kind:SAVE_KIND,version:2,pack:'pack',character:'100',mapId:1,x:64,y:64,gold:15,inventory:equipItem(starter(),'100','weapon',1),quest:{guide:'complete'},questFlags:{'m4.guide.complete':true},progression:applyExperience(initialProgression(),100).state,rewardReceipts:['battle:training:0:win'],savedAt:'2026-09-17T00:00:00Z'};}

test('versioned save round-trips without losing progression state',()=>{
  const serialized=serializeSaveV2(v2(),context);
  const loaded=deserializeSave(serialized,context);
  assert.deepEqual(loaded,validateSaveV2(v2(),context));
  assert.notEqual(loaded.inventory,v2().inventory);
});

test('S7 v1 save migrates inventory quest map and safe progression defaults',()=>{
  const legacy={version:1,pack:'pack',character:'100',mapId:1,x:32,y:32,gold:10,inventory:{owned:[1,3,25],weapon:3,armor:25},quest:{guide:'complete'},savedAt:'2026-09-15T00:00:00Z'};
  const migrated=migrateSave(legacy,context);
  assert.equal(migrated.version,2);
  assert.equal(migrated.inventory.equipped.weapon,3);
  assert.equal(migrated.inventory.equipped.armor,25);
  assert.deepEqual(migrated.progression,initialProgression());
  assert.deepEqual(migrated.quest,{guide:'complete'});
  assert.equal((legacy as any).kind,undefined);
});

test('older v1 save without optional inventory or map receives explicit migration defaults',()=>{
  const legacy={version:1,pack:'pack',character:'109',x:0,y:0,gold:0,savedAt:'2026-09-15T00:00:00Z'};
  const migrated=migrateSave(legacy,context);
  assert.equal(migrated.mapId,0);
  assert.equal(migrated.inventory.items.length,6);
  assert.deepEqual(migrated.quest,{guide:'not_started'});
});

test('corrupted foreign or future saves fail closed',()=>{
  for(const raw of [
    {...v2(),pack:'foreign'},
    {...v2(),version:3},
    {...v2(),x:999},
    {...v2(),progression:{level:99,exp:0,policyId:'m4-linear-100x-level-v1'}},
    {...v2(),inventory:{...v2().inventory,equipped:{weapon:10,armor:null}}},
  ]) assert.throws(()=>migrateSave(raw,context));
  assert.throws(()=>deserializeSave('{bad json',context));
});

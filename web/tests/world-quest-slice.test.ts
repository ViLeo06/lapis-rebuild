import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ReconstructionWorldAuthority} from '../src/world/world-authority.ts';
import {applyWarp} from '../src/world/warp-policy.ts';
import {OUTER_CITY_OBJECTIVE,START_STATE,TRAINING_BATTLE_ZONE_ID,TRAINING_GUIDE,TRAINING_RETURN} from '../src/world/world-content.ts';

const intent=(entityId:string,mapId:number,actorX:number,actorY:number)=>({entityId,mapId,actorX,actorY,provenance:'RECONSTRUCTION_POLICY' as const});

test('S9 playable slice reaches complete through NPC -> warp -> encounter -> battle -> return -> turn in',()=>{
  const authority=new ReconstructionWorldAuthority();
  let state=authority.initial(START_STATE);
  assert.equal(state.quest.stage,'not_started');

  const accepted=authority.interact(state,intent(TRAINING_GUIDE.entity.id,state.world.mapId,state.world.x,state.world.y));
  state=accepted.state;
  assert.equal(accepted.result.accepted,true);
  assert.equal(state.quest.stage,'accepted');
  assert.ok(accepted.result.dialogue);
  assert.ok(accepted.result.warp);

  state={...state,world:applyWarp(state.world,accepted.result.warp!)};
  assert.equal(state.world.mapId,OUTER_CITY_OBJECTIVE.mapId);

  const objective=authority.interact(state,intent(OUTER_CITY_OBJECTIVE.id,state.world.mapId,state.world.x,state.world.y));
  state=objective.state;
  assert.equal(state.quest.stage,'objective');
  assert.equal(objective.result.accepted,true);
  assert.equal(objective.result.encounter?.battleZoneId,TRAINING_BATTLE_ZONE_ID);
  assert.deepEqual(objective.result.encounter?.returnState,TRAINING_RETURN);

  const battle=authority.resolveBattle(state,{battleZoneId:TRAINING_BATTLE_ZONE_ID,outcome:'won'});
  state=battle.state;
  assert.equal(battle.questAdvanced,true);
  assert.equal(state.quest.stage,'ready_to_turn_in');
  assert.deepEqual(state.world,TRAINING_RETURN);

  const complete=authority.interact(state,intent(TRAINING_GUIDE.entity.id,state.world.mapId,state.world.x,state.world.y));
  state=complete.state;
  assert.equal(complete.result.accepted,true);
  assert.equal(state.quest.stage,'complete');
});

test('wrong map, out of range, defeat and wrong battle zone do not advance quest',()=>{
  const authority=new ReconstructionWorldAuthority();
  const start=authority.initial(START_STATE);
  const wrongMap=authority.interact(start,intent(TRAINING_GUIDE.entity.id,99,start.world.x,start.world.y));
  assert.equal(wrongMap.result.accepted,false);
  assert.equal(wrongMap.state.quest.stage,'not_started');

  const far={...start,world:{...start.world,x:100,y:100}};
  const farNpc=authority.interact(far,intent(TRAINING_GUIDE.entity.id,far.world.mapId,far.world.x,far.world.y));
  assert.equal(farNpc.result.accepted,false);
  assert.equal(farNpc.state.quest.stage,'not_started');

  const accepted=authority.interact(start,intent(TRAINING_GUIDE.entity.id,start.world.mapId,start.world.x,start.world.y));
  const warped={...accepted.state,world:applyWarp(accepted.state.world,accepted.result.warp!)};
  const objective=authority.interact(warped,intent(OUTER_CITY_OBJECTIVE.id,warped.world.mapId,warped.world.x,warped.world.y));

  const lost=authority.resolveBattle(objective.state,{battleZoneId:TRAINING_BATTLE_ZONE_ID,outcome:'lost'});
  assert.equal(lost.state.quest.stage,'objective');
  assert.equal(lost.questAdvanced,false);

  const wrongZone=authority.resolveBattle(objective.state,{battleZoneId:999,outcome:'won'});
  assert.equal(wrongZone.state.quest.stage,'objective');
  assert.equal(wrongZone.questAdvanced,false);
});

test('all S9 world decisions remain explicitly reconstruction policy',()=>{
  const authority=new ReconstructionWorldAuthority();
  const state=authority.initial(START_STATE);
  const result=authority.interact(state,intent(TRAINING_GUIDE.entity.id,state.world.mapId,state.world.x,state.world.y));
  assert.equal(authority.provenance,'RECONSTRUCTION_POLICY');
  assert.equal(TRAINING_GUIDE.provenance,'RECONSTRUCTION_POLICY');
  assert.equal(OUTER_CITY_OBJECTIVE.provenance,'RECONSTRUCTION_POLICY');
  assert.equal(result.result.provenance,'RECONSTRUCTION_POLICY');
  assert.equal(result.result.warp?.provenance,'RECONSTRUCTION_POLICY');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTrainingHousePolicy} from '../src/world/s18-world-policy.ts';
import {SceneTransitionController} from '../src/world/scene-transition.ts';
import {containsPosition} from '../src/world/spatial-trigger.ts';

const guide={
  entity:{id:'guide',kind:'npc' as const,mapId:1,x:4,y:4,displayName:'Guide',interactionRadius:1,provenance:'RECONSTRUCTION_POLICY' as const},
  shortDialogue:{none:['hi']},provenance:'RECONSTRUCTION_POLICY' as const,
};
const policy=createTrainingHousePolicy({
  id:'s18-harness',
  field:{mapId:1,name:'field',entranceZone:{shape:'rect',min:[8,8],max:[9,9]},returnSpawn:[7,8],returnDirection:6},
  interior:{mapId:2,name:'interior',exitZone:{shape:'cells',cells:[[2,2],[2,3]]},entrySpawn:[2,2],entryDirection:2},
  npcs:[guide],
});

test('training-house graph is bidirectional and all gameplay bindings are reconstruction policy',()=>{
  assert.equal(policy.provenance,'RECONSTRUCTION_POLICY');
  assert.equal(policy.graph.scenes.length,2);assert.equal(policy.graph.transitions.length,2);
  const [enter,exit]=policy.graph.transitions;
  assert.equal(enter.reverseEdgeId,exit.id);assert.equal(exit.reverseEdgeId,enter.id);
  assert.ok(policy.graph.scenes.every(scene=>scene.provenance==='RECONSTRUCTION_POLICY'));
  assert.ok(policy.graph.transitions.every(edge=>edge.provenance==='RECONSTRUCTION_POLICY'));
  assert.ok(policy.triggers.every(trigger=>trigger.provenance==='RECONSTRUCTION_POLICY'));
});

test('walking into entrance auto-requests transition and spawn-in-exit does not immediately bounce back',()=>{
  const controller=new SceneTransitionController(policy.graph,policy.triggers);
  controller.start({mapId:1,cell:[7,7]});
  assert.equal(controller.update({mapId:1,cell:[8,8]}).transition?.edgeId,'s18-harness:enter');
  const request=controller.update({mapId:1,cell:[8,8]}).transition;
  assert.equal(request,null,'pending request prevents duplicate transition');
  const fresh=new SceneTransitionController(policy.graph,policy.triggers);fresh.start({mapId:1,cell:[7,7]});
  const enter=fresh.update({mapId:1,cell:[8,8]}).transition!;
  const arrival=fresh.commit(enter);
  assert.deepEqual(arrival.cell,[2,2]);assert.equal(arrival.mapId,2);assert.equal(arrival.direction,2);
  assert.equal(fresh.update({mapId:2,cell:[2,2]}).transition,null,'arrival exit trigger is suppressed until actor leaves');
  assert.equal(fresh.update({mapId:2,cell:[4,4]}).transition,null);
  const back=fresh.update({mapId:2,cell:[2,3]}).transition;
  assert.equal(back?.edgeId,'s18-harness:exit');
});

test('NPC interaction zone is discoverable but never auto-switches scene',()=>{
  const controller=new SceneTransitionController(policy.graph,policy.triggers);
  controller.start({mapId:1,cell:[1,1]});
  const sample=controller.update({mapId:1,cell:[4,5]});
  assert.equal(sample.transition,null);assert.equal(sample.interactions.length,1);assert.equal(sample.interactions[0].entityId,'guide');
});

test('rejecting an auto transition suppresses retrigger until leaving the doorway',()=>{
  const controller=new SceneTransitionController(policy.graph,policy.triggers);
  controller.start({mapId:1,cell:[7,7]});
  const first=controller.update({mapId:1,cell:[8,8]}).transition;assert.ok(first);
  controller.rejectPending();
  assert.equal(controller.update({mapId:1,cell:[8,9]}).transition,null);
  controller.update({mapId:1,cell:[7,7]});
  assert.ok(controller.update({mapId:1,cell:[9,9]}).transition);
});

test('zone math is cell-based and deterministic',()=>{
  assert.equal(containsPosition({shape:'manhattan',center:[10,10],radius:2},[11,11]),true);
  assert.equal(containsPosition({shape:'manhattan',center:[10,10],radius:2},[12,11]),false);
  assert.equal(containsPosition({shape:'rect',min:[3,4],max:[5,6]},[5,6]),true);
});

test('graph/controller reject missing edge triggers and stale commits',()=>{
  assert.throws(()=>new SceneTransitionController(policy.graph,policy.triggers.filter(trigger=>trigger.id!=='s18-harness:door-exit')));
  const controller=new SceneTransitionController(policy.graph,policy.triggers);controller.start({mapId:1,cell:[7,7]});
  const request=controller.update({mapId:1,cell:[8,8]}).transition!;
  controller.commit(request);
  assert.throws(()=>controller.commit(request),/Stale/);
  const bypass=new SceneTransitionController(policy.graph,policy.triggers);bypass.start({mapId:1,cell:[7,7]});
  assert.throws(()=>bypass.update({mapId:2,cell:[2,2]}),/without transition commit/);
});

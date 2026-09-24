import test from 'node:test';
import assert from 'node:assert/strict';
import {M7_TRAINING_BATTLES} from '../src/training/m7-training-camp.ts';
import {
  createM7TrainingManager,
  M7_TRAINING_MANAGER_ENTITY_ID,
  M7_TRAINING_MANAGER_VISUAL_RESOURCE_ID,
  resolveM7TrainingManagerInteraction,
  trainingManagerBattleById,
} from '../src/world/m7-training-manager.ts';
import type {M7TrainingManagerInputSource} from '../src/world/m7-training-manager.ts';
import {renderM7TrainingManagerDialog} from '../src/ui/m7-training-camp.ts';
import {renderFieldHud} from '../src/ui/field-hud.ts';
import {createM5PlayableWorld} from '../src/world/m5-playable-world.ts';
import {canInteract} from '../src/world/world-model.ts';

const manager=createM7TrainingManager(1,[12,10]);
const world={mapId:1,x:11,y:10};

function interact(inputSource:M7TrainingManagerInputSource,actor=world){
  return resolveM7TrainingManagerInteraction(manager,actor,{
    entityId:M7_TRAINING_MANAGER_ENTITY_ID,
    mapId:actor.mapId,
    actorX:actor.x,
    actorY:actor.y,
    inputSource,
    provenance:'RECONSTRUCTION_POLICY',
  });
}

test('S39 mouse, touch, and keyboard use one training-manager interaction authority',()=>{
  for(const source of ['pointer','touch','keyboard'] as const){
    const result=interact(source);
    assert.equal(result.accepted,true,source);
    if(!result.accepted)assert.fail(result.message);
    assert.equal(result.action,'open-training-list');
    assert.equal(result.inputSource,source);
    assert.equal(result.battles,M7_TRAINING_BATTLES,'must reuse the S33 registry by reference');
    assert.equal(result.battles.length,15);
  }
});

test('S39 manager rejects stale, wrong, and out-of-range intents with player feedback',()=>{
  const far=interact('pointer',{mapId:1,x:0,y:0});
  assert.equal(far.accepted,false);
  if(far.accepted)assert.fail('far interaction unexpectedly accepted');
  assert.equal(far.reason,'out-of-range');
  assert.match(far.message,/太远/);

  const stale=resolveM7TrainingManagerInteraction(manager,world,{
    entityId:M7_TRAINING_MANAGER_ENTITY_ID,
    mapId:1,
    actorX:10,
    actorY:10,
    inputSource:'keyboard',
    provenance:'RECONSTRUCTION_POLICY',
  });
  assert.equal(stale.accepted,false);
  if(stale.accepted)assert.fail('stale interaction unexpectedly accepted');
  assert.equal(stale.reason,'actor-state-mismatch');

  const wrong=resolveM7TrainingManagerInteraction(manager,world,{
    entityId:'training-guide',
    mapId:1,
    actorX:world.x,
    actorY:world.y,
    inputSource:'touch',
    provenance:'RECONSTRUCTION_POLICY',
  });
  assert.equal(wrong.accepted,false);
  if(wrong.accepted)assert.fail('wrong entity unexpectedly accepted');
  assert.equal(wrong.reason,'entity-mismatch');
});

test('S39 selected battle delegates to the S33 authority without a second registry',()=>{
  const first=trainingManagerBattleById(1);
  const last=trainingManagerBattleById(15);
  assert.equal(first,M7_TRAINING_BATTLES[0]);
  assert.equal(last,M7_TRAINING_BATTLES[14]);
  assert.deepEqual(
    {zone:last.battleZoneId,level:last.recommendedLevel,difficulty:last.difficultyBand},
    {zone:91,level:65,difficulty:'Boss'},
  );
});

test('S39 B4023 keeps original asset evidence separate from reconstructed NPC identity',()=>{
  assert.equal(manager.visualResourceId,M7_TRAINING_MANAGER_VISUAL_RESOURCE_ID);
  assert.equal(manager.visualResourceId,4023);
  assert.equal(manager.provenance.asset,'VERIFIED-STATIC-ORIGINAL');
  assert.equal(manager.provenance.roleBinding,'RECONSTRUCTION_POLICY');
  assert.equal(manager.visualBinding.provenance.evidence,'RECONSTRUCTION_POLICY');
});

test('S39 manager dialog renders all 15 S33 battles and one close action',()=>{
  const html=renderM7TrainingManagerDialog(26,8);
  assert.equal((html.match(/data-action="training-start"/g)??[]).length,15);
  assert.equal((html.match(/data-action="training-manager-close"/g)??[]).length,1);
  for(let id=1;id<=15;id+=1)assert.match(html,new RegExp('data-training-battle-id="'+id+'"'));
  assert.match(html,/训练管理员 · 15 场训练/);
  assert.match(html,/RECONSTRUCTION_POLICY/);
});

test('S39 field HUD exposes fullscreen directly outside the System menu',()=>{
  const html=renderFieldHud(
    {name:'Tester',className:'剑士',portraitLabel:'剑',level:12,hp:100,hpMax:125,mp:40,mpMax:80,gold:0},
    {mapId:1,mapName:'布日古斯_外城'},
  );
  assert.equal((html.match(/data-ui="field-fullscreen"/g)??[]).length,1);
  assert.match(html,/data-ui="field-fullscreen" data-action="fullscreen"/);
});


test('M7.1 primary training manager is immediately interactable at the real field spawn contract',()=>{
  const collision=(width:number,height:number)=>({
    width,height,
    grid:Array.from({length:width*height},(_,index)=>{
      const x=Math.floor(index/height),y=index%height;
      return (x+y)%2===0&&x>1&&x<width-2&&y>1&&y<height-2?1:0;
    }),
  });
  const map=(id:number,width:number,height:number)=>({
    manifest:{id,name:'test-'+id,png:'',collision:'',inspector:'',render:{width:width*32,height:height*16},evidence:'SYNTHETIC'},
    collision:collision(width,height),
    inspector:{width:1,height:1,cells:[]},
  });
  const pack:any={
    maps:{'0':map(0,47,47),'1':map(1,69,79),'7':map(7,69,79)},
    animations:{'1001':{},'4023':{},'4524':{},'4544':{}},
  };
  const world=createM5PlayableWorld(pack);
  assert.deepEqual(world.content.start,{mapId:1,x:22,y:24});
  assert.deepEqual(world.trainingManager.entity.x,20);
  assert.deepEqual(world.trainingManager.entity.y,24);
  assert.equal(canInteract(world.trainingManager.entity,world.content.start),true);
  assert.equal(world.visuals.find(row=>row.id==='training-manager')?.label,'训练管理员 · 15关');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleCameraPolicy,battleEntryZoom} from '../src/view/battle-camera.ts';
import {battleMinimapLayout,buildBattleMinimapModel,minimapContains,minimapToWorld} from '../src/view/battle-minimap.ts';

const viewport={width:800,height:600};
const world={x:0,y:0,width:2400,height:1600};

test('S34D desktop edge scroll moves smoothly and clamps at world bounds',()=>{
  const policy=new BattleCameraPolicy();
  const moved=policy.step(
    {scrollX:0,scrollY:0,zoom:1},
    {x:400,y:300},
    viewport,
    world,
    1000,
    {x:799,y:300,inside:true,coarse:false},
  );
  assert.equal(moved.source,'edge');
  assert.ok(moved.scroll.x>0);
  assert.ok(moved.scroll.x<400);

  const edge=policy.step(
    {scrollX:1600,scrollY:1000,zoom:1},
    {x:2000,y:1300},
    viewport,
    world,
    1000,
    {x:799,y:599,inside:true,coarse:false},
  );
  assert.deepEqual(edge.scroll,{x:1600,y:1000});
});

test('S34D coarse-pointer mobile path disables hover scrolling and retains player edge follow',()=>{
  const policy=new BattleCameraPolicy();
  const result=policy.step(
    {scrollX:0,scrollY:0,zoom:1},
    {x:760,y:300},
    viewport,
    world,
    16.6667,
    {x:799,y:300,inside:true,coarse:true},
    true,
    false,
  );
  assert.equal(result.source,'player');
  assert.ok(result.scroll.x>0);
});

test('S34D player settle converges toward center without a camera snap',()=>{
  const policy=new BattleCameraPolicy();
  const first=policy.step({scrollX:0,scrollY:0,zoom:1},{x:700,y:300},viewport,world,16.6667,undefined,true,true);
  assert.equal(first.source,'player');
  assert.ok(first.scroll.x>0&&first.scroll.x<300);

  let camera={scrollX:first.scroll.x,scrollY:first.scroll.y,zoom:1};
  for(let i=0;i<120;i++){
    const next=policy.step(camera,{x:700,y:300},viewport,world,16.6667,undefined,true,true);
    camera={scrollX:next.scroll.x,scrollY:next.scroll.y,zoom:1};
  }
  assert.ok(Math.abs(camera.scrollX-300)<0.1);
});

test('S34D minimap contains player, all living enemies, active emphasis, and no dead marker',()=>{
  const model=buildBattleMinimapModel(
    viewport,
    world,
    {scrollX:200,scrollY:100,zoom:1},
    {x:400,y:300},
    [
      {id:'active',x:100,y:100,hp:1,encounterGroup:0},
      {id:'remote',x:2200,y:1400,hp:1,encounterGroup:1},
      {id:'dead',x:500,y:500,hp:0,encounterGroup:0},
    ],
    0,
  );
  assert.ok(Number.isFinite(model.player.x)&&Number.isFinite(model.player.y));
  assert.deepEqual(model.enemies.map(enemy=>enemy.id),['active','remote']);
  assert.equal(model.enemies[0]?.active,true);
  assert.equal(model.enemies[1]?.active,false);
  assert.ok(model.viewport.width>0&&model.viewport.height>0);
});

test('S34D minimap click/tap mapping produces a camera target without any player mutation primitive',()=>{
  const layout=battleMinimapLayout(viewport,world);
  const point={x:layout.inner.x+layout.inner.width*.75,y:layout.inner.y+layout.inner.height*.25};
  assert.equal(minimapContains(layout,point),true);
  const target=minimapToWorld(layout,world,point);
  assert.ok(Math.abs(target.x-1800)<1e-9);
  assert.ok(Math.abs(target.y-400)<1e-9);
});


test('S34D minimap edge target converges to the clamped camera destination',()=>{
  const policy=new BattleCameraPolicy();
  const camera={scrollX:400,scrollY:200,zoom:1};
  const target={x:2400,y:1600};
  const desired=policy.targetScroll(camera,target,viewport,world);
  assert.deepEqual(desired,{x:1600,y:1000});
  let current=camera;
  for(let i=0;i<120;i++){
    const next=policy.centerStep(current,target,viewport,world,16.6667);
    current={scrollX:next.x,scrollY:next.y,zoom:1};
  }
  assert.ok(Math.hypot(current.scrollX-desired.x,current.scrollY-desired.y)<0.1);
});


test('S34D battle entry never zooms out to fit the encounter and covers undersized maps',()=>{
  assert.equal(battleEntryZoom(viewport,world),1);
  assert.equal(battleEntryZoom({width:1280,height:720},{x:0,y:0,width:1024,height:640}),1.25);
});


test('S34D minimap can target a remote enemy group on a large battlefield',()=>{
  const policy=new BattleCameraPolicy();
  const camera={scrollX:0,scrollY:0,zoom:1};
  const model=buildBattleMinimapModel(
    viewport,
    world,
    camera,
    {x:400,y:300},
    [{id:'remote-group',x:2200,y:1400,hp:10,encounterGroup:3}],
    0,
  );
  const remote=model.enemies[0]!;
  const target=minimapToWorld(model.layout,world,remote);
  const desired=policy.targetScroll(camera,target,viewport,world);
  assert.ok(desired.x>1000);
  assert.ok(desired.y>500);
  const first=policy.centerStep(camera,target,viewport,world,16.6667);
  assert.ok(first.x>camera.scrollX);
  assert.ok(first.y>camera.scrollY);
});

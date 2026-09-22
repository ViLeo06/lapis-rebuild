import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';

const scene=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
const runtime=(page:Page)=>page.evaluate(()=>window.lapisM4!.snapshot());

async function ready(page:Page){
  await page.goto('/?m4=1');
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
  await page.waitForFunction(()=>document.body.classList.contains('m4-active'));
}

async function openMenu(page:Page){
  if(await page.locator('[data-ui="game-menu"]').isVisible().catch(()=>false))return;
  const button=page.locator('[data-action="menu"]:visible,[data-action="battle-menu"]:visible').first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('[data-ui="game-menu"]')).toBeVisible();
}

async function startTraining(page:Page,id=15){
  await openMenu(page);
  await page.locator(`[data-training-battle-id="${id}"] [data-action="training-start"]`).click();
  await expect.poll(async()=>(await runtime(page)).m7Training.activeBattleId).toBe(id);
  await expect.poll(async()=>(await scene(page)).inBattleView).toBe(true);
  await expect.poll(async()=>Boolean((await scene(page)).minimap?.visible)).toBe(true);
}

async function canvasPoint(page:Page,x:number,y:number){
  const state=await scene(page);
  const viewport=state.viewport;
  if(!viewport)throw new Error('Missing viewport snapshot');
  const box=await page.locator('canvas').boundingBox();
  if(!box)throw new Error('Missing canvas');
  return{
    x:box.x+x*(box.width/viewport.viewport.width),
    y:box.y+y*(box.height/viewport.viewport.height),
  };
}

function cameraCenter(state:Awaited<ReturnType<typeof scene>>){
  if(!state.viewport)throw new Error('Missing viewport snapshot');
  return{
    x:state.camera.x+state.viewport.viewport.width/(2*state.camera.zoom),
    y:state.camera.y+state.viewport.viewport.height/(2*state.camera.zoom),
  };
}

test('S34D battle keeps normal scale, edge scrolls, and clamps inside a larger battlefield',async({page})=>{
  await ready(page);
  await startTraining(page,15);
  const entered=await scene(page);
  const viewport=entered.viewport;
  if(!viewport)throw new Error('Missing viewport snapshot');
  expect(entered.camera.zoom).toBeCloseTo(1,6);
  const visibleW=viewport.viewport.width/entered.camera.zoom;
  const visibleH=viewport.viewport.height/entered.camera.zoom;
  expect(visibleW<viewport.world.width||visibleH<viewport.world.height).toBe(true);

  const box=await page.locator('canvas').boundingBox();
  if(!box)throw new Error('Missing canvas');
  const maxX=viewport.world.x+viewport.world.width-visibleW;
  const panRight=maxX-entered.camera.x>24;
  const beforeX=entered.camera.x;
  await page.mouse.move(panRight?box.x+box.width-2:box.x+2,box.y+box.height*.42);
  await expect.poll(async()=>{
    const x=(await scene(page)).camera.x;
    return panRight?x>beforeX+4:x<beforeX-4;
  },{timeout:4000}).toBe(true);
  await page.mouse.move(2,2);

  const moved=await scene(page);
  const movedViewport=moved.viewport!;
  const movedVisibleW=movedViewport.viewport.width/moved.camera.zoom;
  const movedVisibleH=movedViewport.viewport.height/moved.camera.zoom;
  expect(moved.camera.x).toBeGreaterThanOrEqual(movedViewport.world.x-.01);
  expect(moved.camera.y).toBeGreaterThanOrEqual(movedViewport.world.y-.01);
  expect(moved.camera.x).toBeLessThanOrEqual(movedViewport.world.x+movedViewport.world.width-movedVisibleW+.01);
  expect(moved.camera.y).toBeLessThanOrEqual(movedViewport.world.y+movedViewport.world.height-movedVisibleH+.01);
});

test('S34D minimap shows all living enemies and consumes clicks as camera-only input',async({page})=>{
  await ready(page);
  await startTraining(page,15);
  const before=await scene(page);
  expect(before.enemies).toHaveLength(20);
  expect(before.minimap?.policy).toBe('RECONSTRUCTION_POLICY');
  expect(before.minimap?.enemies).toHaveLength(before.enemies.filter(enemy=>enemy.hp>0).length);
  expect(before.minimap?.viewport.width??0).toBeGreaterThan(0);
  expect(before.minimap?.viewport.height??0).toBeGreaterThan(0);

  const center=cameraCenter(before);
  const farthest=before.enemies.filter(enemy=>enemy.hp>0).reduce((best,enemy)=>{
    const distance=Math.hypot(enemy.x-center.x,enemy.y-center.y);
    return !best||distance>best.distance?{enemy,distance}:best;
  },null as null|{enemy:(typeof before.enemies)[number];distance:number});
  if(!farthest||!before.minimap)throw new Error('Missing far enemy/minimap');
  const marker=before.minimap.enemies.find(enemy=>enemy.id===farthest.enemy.id);
  if(!marker)throw new Error('Missing far enemy minimap marker');

  const click=await canvasPoint(page,marker.x,marker.y);
  const anchor={...before.anchor};
  const routeLength=before.routeLength;
  const selected=before.target;
  const enemyHp=before.enemies.map(enemy=>[enemy.id,enemy.hp] as const);
  const beforeDistance=farthest.distance;
  await page.mouse.click(click.x,click.y);

  await expect.poll(async()=>{
    const now=await scene(page);
    const c=cameraCenter(now);
    return Math.hypot(farthest.enemy.x-c.x,farthest.enemy.y-c.y);
  },{timeout:5000}).toBeLessThan(beforeDistance-4);

  const after=await scene(page);
  expect(after.anchor.x).toBeCloseTo(anchor.x,6);
  expect(after.anchor.y).toBeCloseTo(anchor.y,6);
  expect(after.routeLength).toBe(routeLength);
  expect(after.target).toBe(selected);
  expect(after.enemies.map(enemy=>[enemy.id,enemy.hp] as const)).toEqual(enemyHp);

  await page.evaluate(({id})=>window.lapisM4!.acceptanceSetEnemyHp!(id,0),{id:farthest.enemy.id});
  await expect.poll(async()=>{
    const minimap=(await scene(page)).minimap;
    return minimap?.enemies.some(enemy=>enemy.id===farthest.enemy.id)??true;
  }).toBe(false);
});

test.describe('S34D mobile battle camera/minimap',()=>{
  test.use({viewport:{width:412,height:915},hasTouch:true});

  test('tap minimap pans camera without teleporting player or leaking into battle input',async({page})=>{
    await ready(page);
    await startTraining(page,15);
    const before=await scene(page);
    if(!before.minimap)throw new Error('Missing mobile minimap');
    const anchor={...before.anchor};
    const selected=before.target;
    const routeLength=before.routeLength;
    const target={
      x:before.minimap.layout.inner.x+before.minimap.layout.inner.width*.9,
      y:before.minimap.layout.inner.y+before.minimap.layout.inner.height*.1,
    };
    const tap=await canvasPoint(page,target.x,target.y);
    const centerBefore=cameraCenter(before);
    await page.touchscreen.tap(tap.x,tap.y);
    await expect.poll(async()=>{
      const now=await scene(page);
      const centerNow=cameraCenter(now);
      return Math.hypot(centerNow.x-centerBefore.x,centerNow.y-centerBefore.y);
    },{timeout:5000}).toBeGreaterThan(4);

    const after=await scene(page);
    expect(after.anchor.x).toBeCloseTo(anchor.x,6);
    expect(after.anchor.y).toBeCloseTo(anchor.y,6);
    expect(after.routeLength).toBe(routeLength);
    expect(after.target).toBe(selected);
    expect(after.minimap?.visible).toBe(true);
  });
});

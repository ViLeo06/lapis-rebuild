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

function minimapPanProbe(state:Awaited<ReturnType<typeof scene>>,preferEnemy=true){
  const viewport=state.viewport,minimap=state.minimap;
  if(!viewport||!minimap)throw new Error('Missing viewport/minimap snapshot');
  const visibleW=viewport.viewport.width/state.camera.zoom;
  const visibleH=viewport.viewport.height/state.camera.zoom;
  const minX=viewport.world.x,minY=viewport.world.y;
  const maxX=viewport.world.x+viewport.world.width-visibleW;
  const maxY=viewport.world.y+viewport.world.height-visibleH;
  const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
  const candidate=(x:number,y:number)=>{
    const nx=clamp((x-minimap.layout.inner.x)/minimap.layout.inner.width,0,1);
    const ny=clamp((y-minimap.layout.inner.y)/minimap.layout.inner.height,0,1);
    const worldX=viewport.world.x+nx*viewport.world.width;
    const worldY=viewport.world.y+ny*viewport.world.height;
    const desired={
      x:clamp(worldX-visibleW/2,minX,maxX),
      y:clamp(worldY-visibleH/2,minY,maxY),
    };
    return{x,y,desired,delta:Math.hypot(desired.x-state.camera.x,desired.y-state.camera.y)};
  };
  const choices=(preferEnemy?minimap.enemies.map(marker=>candidate(marker.x,marker.y)):[]);
  choices.push(
    candidate(minimap.layout.inner.x,minimap.layout.inner.y),
    candidate(minimap.layout.inner.x+minimap.layout.inner.width,minimap.layout.inner.y),
    candidate(minimap.layout.inner.x,minimap.layout.inner.y+minimap.layout.inner.height),
    candidate(minimap.layout.inner.x+minimap.layout.inner.width,minimap.layout.inner.y+minimap.layout.inner.height),
  );
  const best=choices.reduce((a,b)=>b.delta>a.delta?b:a);
  if(best.delta<=1)throw new Error('Battle camera has no legal minimap pan target');
  return best;
}

test('S34D battle keeps normal scale, edge scrolls, and clamps inside a larger battlefield',async({page})=>{
  await ready(page);
  await startTraining(page,15);
  const entered=await scene(page);
  const viewport=entered.viewport;
  if(!viewport)throw new Error('Missing viewport snapshot');
  expect(entered.camera.zoom).toBeGreaterThanOrEqual(1);
  const visibleW=viewport.viewport.width/entered.camera.zoom;
  const visibleH=viewport.viewport.height/entered.camera.zoom;
  expect(visibleW).toBeLessThanOrEqual(viewport.world.width+.01);
  expect(visibleH).toBeLessThanOrEqual(viewport.world.height+.01);

  const minX=viewport.world.x,minY=viewport.world.y;
  const maxX=viewport.world.x+viewport.world.width-visibleW;
  const maxY=viewport.world.y+viewport.world.height-visibleH;
  const candidates=[
    {axis:'x' as const,sign:1,room:maxX-entered.camera.x,x:viewport.viewport.width-2,y:viewport.viewport.height*.42},
    {axis:'x' as const,sign:-1,room:entered.camera.x-minX,x:2,y:viewport.viewport.height*.42},
    {axis:'y' as const,sign:-1,room:entered.camera.y-minY,x:viewport.viewport.width*.5,y:2},
    {axis:'y' as const,sign:1,room:maxY-entered.camera.y,x:viewport.viewport.width*.5,y:viewport.viewport.height-2},
  ];
  const pan=candidates.find(candidate=>candidate.room>4);
  if(!pan)throw new Error('Synthetic battle map has no scrollable camera axis');
  const beforeAxis=pan.axis==='x'?entered.camera.x:entered.camera.y;
  const client=await canvasPoint(page,pan.x,pan.y);
  await page.locator('canvas').dispatchEvent('pointermove',{
    clientX:client.x,clientY:client.y,pointerType:'mouse',buttons:0,
  });
  const threshold=Math.min(4,pan.room*.25);
  await expect.poll(async()=>{
    const camera=(await scene(page)).camera;
    const current=pan.axis==='x'?camera.x:camera.y;
    return pan.sign*(current-beforeAxis)>threshold;
  },{timeout:4000}).toBe(true);
  await page.locator('canvas').dispatchEvent('pointerout',{pointerType:'mouse'});

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

  if(!before.minimap)throw new Error('Missing minimap');
  const probe=minimapPanProbe(before,true);
  const click=await canvasPoint(page,probe.x,probe.y);
  const anchor={...before.anchor};
  const routeLength=before.routeLength;
  const selected=before.target;
  const enemyHp=before.enemies.map(enemy=>[enemy.id,enemy.hp] as const);
  await page.mouse.click(click.x,click.y);

  await expect.poll(async()=>{
    const now=await scene(page);
    return Math.hypot(now.camera.x-probe.desired.x,now.camera.y-probe.desired.y);
  },{timeout:5000}).toBeLessThan(probe.delta-1);

  const after=await scene(page);
  expect(after.anchor.x).toBeCloseTo(anchor.x,6);
  expect(after.anchor.y).toBeCloseTo(anchor.y,6);
  expect(after.routeLength).toBe(routeLength);
  expect(after.target).toBe(selected);
  expect(after.enemies.map(enemy=>[enemy.id,enemy.hp] as const)).toEqual(enemyHp);

});

test('S34D dead enemy marker disappears after a normal production attack kill',async({page})=>{
  await ready(page);
  await startTraining(page,1);
  const before=await scene(page);
  const deadId=before.target;
  if(!deadId)throw new Error('Missing selected living enemy');
  expect(before.minimap?.enemies.some(enemy=>enemy.id===deadId)).toBe(true);
  await page.evaluate(({id})=>window.lapisM4!.acceptanceSetEnemyHp!(id,1),{id:deadId});
  const attack=page.locator('[data-action="attack"]:visible').first();
  for(let attempt=0;attempt<4;attempt++){
    await expect(attack).toBeEnabled({timeout:6000});
    await attack.click();
    const hp=(await scene(page)).enemies.find(row=>row.id===deadId)?.hp??0;
    if(hp<=0)break;
  }
  await expect.poll(async()=>{
    const enemy=(await scene(page)).enemies.find(row=>row.id===deadId);
    return enemy?.hp??0;
  }).toBeLessThanOrEqual(0);
  await expect.poll(async()=>{
    const minimap=(await scene(page)).minimap;
    return minimap?.enemies.some(enemy=>enemy.id===deadId)??true;
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
    const probe=minimapPanProbe(before,false);
    const tap=await canvasPoint(page,probe.x,probe.y);
    await page.touchscreen.tap(tap.x,tap.y);
    await expect.poll(async()=>{
      const now=await scene(page);
      return Math.hypot(now.camera.x-probe.desired.x,now.camera.y-probe.desired.y);
    },{timeout:5000}).toBeLessThan(probe.delta-1);

    const after=await scene(page);
    expect(after.anchor.x).toBeCloseTo(anchor.x,6);
    expect(after.anchor.y).toBeCloseTo(anchor.y,6);
    expect(after.routeLength).toBe(routeLength);
    expect(after.target).toBe(selected);
    expect(after.minimap?.visible).toBe(true);
  });
});
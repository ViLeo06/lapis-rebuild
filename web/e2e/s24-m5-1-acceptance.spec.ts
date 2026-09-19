import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const scene=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
const runtime=(page:Page)=>page.evaluate(()=>window.lapisM4!.snapshot());

async function ready(page:Page,url='/?m4=1'){
  await page.goto(url);
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
  await page.waitForFunction(()=>document.body.classList.contains('m4-active'));
}

async function assertDiagnosticsOff(page:Page){
  await expect(page.locator('[data-ui="debug-panel"]')).toHaveCount(0);
  expect(await page.evaluate(()=>document.body.classList.contains('m4-dev-enabled'))).toBe(false);
}

async function clickAction(page:Page,action:string){
  const button=page.locator(`[data-action="${action}"]`).first();
  await expect(button).toBeVisible();
  await button.click();
}

async function clickWorldCell(page:Page,cell:readonly[number,number]){
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');
  const state=await scene(page);
  const worldX=(cell[0]+1)*32,worldY=(cell[1]+1)*16;
  await page.mouse.click(
    box.x+(worldX-state.camera.x)*state.camera.zoom,
    box.y+(worldY-state.camera.y)*state.camera.zoom,
  );
}

async function guidePointerPoint(page:Page){
  const state=await scene(page);
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');

  // Prefer S22's live rendered hitbox when available. The fallback exists only
  // so the preflight can run on the plan baseline before S22 is integrated.
  const pointerTarget=state.worldPointerTargets?.find(row=>row.id==='training-guide'&&row.visible);
  let worldX:number,worldY:number;
  if(pointerTarget){
    worldX=(pointerTarget.bounds.left+pointerTarget.bounds.right)/2;
    worldY=(pointerTarget.bounds.top+pointerTarget.bounds.bottom)/2;
  }else{
    const guide=state.worldVisuals.find(row=>row.id==='training-guide'&&row.visible);
    if(!guide)throw new Error('Visible training guide visual is missing');
    worldX=(guide.cell[0]+1)*32;
    worldY=(guide.cell[1]+1)*16-24;
  }
  return {
    x:box.x+(worldX-state.camera.x)*state.camera.zoom,
    y:box.y+(worldY-state.camera.y)*state.camera.zoom,
  };
}

async function hoverGuide(page:Page){
  const point=await guidePointerPoint(page);
  await page.mouse.move(point.x,point.y);
  return page.locator('canvas').evaluate(node=>getComputedStyle(node).cursor);
}

async function clickGuide(page:Page){
  const before=await scene(page);
  const point=await guidePointerPoint(page);
  await page.mouse.click(point.x,point.y);
  return {before,after:await scene(page)};
}

async function equipSwordsman(page:Page){
  await clickAction(page,'menu');
  await clickAction(page,'inventory');
  await expect(page.locator('#equip-weapon')).toBeVisible();
  await page.locator('#equip-weapon').selectOption('3');
  await page.locator('#equip-armor').selectOption('25');
  await clickAction(page,'inventory');
  await clickAction(page,'menu-close');
  await assertDiagnosticsOff(page);
  await expect.poll(async()=>{
    const state=await scene(page);
    return `${state.inventory.weapon}/${state.inventory.armor}`;
  }).toBe('3/25');
}

async function selectTarget(page:Page,id:string){
  await page.locator('#battle-pause').click();
  const state=await scene(page);
  const enemy=state.enemies.find(row=>row.id===id&&row.hp>0);
  if(!enemy)throw new Error(`Missing enemy ${id}`);
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');
  await page.mouse.click(
    box.x+(enemy.x-state.camera.x)*state.camera.zoom,
    box.y+(enemy.y-state.camera.y)*state.camera.zoom,
  );
  await expect.poll(async()=>(await scene(page)).target,{timeout:5000}).toBe(id);
  await page.locator('#battle-pause').click();
}

function overlap(a:DOMRect,b:DOMRect){
  return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))
    *Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
}

test('S24 preflight: required desktop viewports stay inside the player shell with diagnostics off',async({page})=>{
  mkdirSync('test-results',{recursive:true});
  const geometries:Record<string,unknown>={};

  for(const size of [{width:1366,height:768},{width:1920,height:1080}]){
    await page.setViewportSize(size);
    await ready(page);
    await assertDiagnosticsOff(page);
    await expect(page.locator('[data-ui="field-hud"]')).toBeVisible();

    const geometry=await page.evaluate(()=>{
      const rect=(selector:string)=>{
        const node=document.querySelector<HTMLElement>(selector);
        if(!node)return null;
        const r=node.getBoundingClientRect();
        return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      };
      return {
        viewport:{width:innerWidth,height:innerHeight},
        scrollWidth:document.documentElement.scrollWidth,
        player:rect('.player-plate'),
        map:rect('.map-plate'),
        quest:rect('.quest-tracker'),
        menu:rect('.menu-button'),
      };
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(size.width);

    const regions=[geometry.player,geometry.map,geometry.quest,geometry.menu].filter(Boolean) as Array<{left:number;top:number;right:number;bottom:number;width:number;height:number}>;
    for(const region of regions){
      expect(region.left).toBeGreaterThanOrEqual(-1);
      expect(region.top).toBeGreaterThanOrEqual(-1);
      expect(region.right).toBeLessThanOrEqual(size.width+1);
      expect(region.bottom).toBeLessThanOrEqual(size.height+1);
    }
    for(let i=0;i<regions.length;i++)for(let j=i+1;j<regions.length;j++){
      const a=new DOMRect(regions[i].left,regions[i].top,regions[i].width,regions[i].height);
      const b=new DOMRect(regions[j].left,regions[j].top,regions[j].width,regions[j].height);
      expect(overlap(a,b)).toBe(0);
    }

    geometries[`${size.width}x${size.height}`]=geometry;
    await page.screenshot({path:`test-results/s24-preflight-${size.width}x${size.height}.png`,fullPage:true});
  }

  writeFileSync('test-results/s24-hud-geometry.json',JSON.stringify(geometries,null,2));
});

test('S24 preflight: standalone player shell opens offline without diagnostics or network',async({page})=>{
  test.skip(!process.env.LAPIS_OFFLINE_PREVIEW,'No standalone HTML supplied');
  const external:string[]=[];
  page.on('request',request=>{if(/^https?:/.test(request.url()))external.push(request.url());});
  const url=pathToFileURL(process.env.LAPIS_OFFLINE_PREVIEW!);
  url.searchParams.set('m4','1');
  await page.goto(url.href);
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
  await page.waitForFunction(()=>document.body.classList.contains('m4-active'));
  await assertDiagnosticsOff(page);
  await expect(page.locator('[data-ui="field-hud"]')).toBeVisible();
  expect(external).toEqual([]);
});

test('S24 final gate: real pointer NPC -> quest -> spatial battle -> pointer turn-in, no diagnostics',async({page})=>{
  test.setTimeout(240000);
  const pageErrors:string[]=[];
  page.on('pageerror',error=>pageErrors.push(error.message));

  await page.setViewportSize({width:1366,height:768});
  await ready(page);
  const startRuntime=await runtime(page);
  test.skip(!startRuntime.playableRecovery,'Private fixed-hash M5 resources are required.');

  await assertDiagnosticsOff(page);
  const cursor=await hoverGuide(page);
  // This turns into a hard gate automatically once S22 has supplied the
  // required NPC hover/pointer contract. Until then the S24 branch records the
  // dependency explicitly instead of pretending keyboard E proves pointer UX.
  test.fixme(cursor!=='pointer','Waiting for S22 NPC pointer/hitbox contract on the integration head.');

  const start=await scene(page);
  expect(start.mapId).toBe(1);
  expect(start.worldVisuals.some(row=>row.id==='training-guide'&&row.visible)).toBe(true);
  expect(startRuntime.quest.stage).toBe('not_started');

  // Real keyboard events for zoom/fullscreen; no direct scene method calls.
  const initialZoom=start.camera.zoom;
  await page.keyboard.press('+');
  await expect.poll(async()=>(await scene(page)).camera.zoom).toBeGreaterThan(initialZoom);
  await page.keyboard.press('0');
  await expect.poll(async()=>(await scene(page)).camera.zoom).toBe(1);
  const viewport=(await scene(page)).viewport;
  if(viewport?.fullscreenSupported){
    await page.keyboard.press('f');
    await expect.poll(async()=>Boolean((await scene(page)).viewport?.fullscreenActive),{timeout:5000}).toBe(true);
    await page.keyboard.press('f');
    await expect.poll(async()=>Boolean((await scene(page)).viewport?.fullscreenActive),{timeout:5000}).toBe(false);
  }

  await equipSwordsman(page);

  // P0 gate: a real browser pointer click on the visible NPC must be consumed
  // as interaction and must not fall through to field movement. S23 requires
  // activation and quest mutation to be separate: opening the dialogue must
  // leave the quest at not_started until the user explicitly accepts.
  const offeredClick=await clickGuide(page);
  expect(offeredClick.after.routeLength).toBe(0);
  expect(offeredClick.after.anchor.x).toBeCloseTo(offeredClick.before.anchor.x,2);
  expect(offeredClick.after.anchor.y).toBeCloseTo(offeredClick.before.anchor.y,2);
  await expect.poll(async()=>(await runtime(page)).quest.stage,{timeout:5000}).toBe('not_started');

  const dialogue=page.locator('[data-ui="npc-dialogue"]');
  await expect(dialogue).toBeVisible();
  await expect(dialogue).toContainText(/训练引导员|训练/);
  const acceptChoice=dialogue.locator('[data-dialogue-choice="accept-quest"]');
  await expect(acceptChoice).toBeVisible();
  await acceptChoice.click();
  await expect.poll(async()=>(await runtime(page)).quest.stage,{timeout:5000}).toBe('accepted');

  const plan=(await runtime(page)).worldPlan!;
  await clickWorldCell(page,plan.doorCell as [number,number]);
  await expect.poll(async()=>(await scene(page)).mapId,{timeout:30000,intervals:[100]}).toBe(7);
  await expect.poll(async()=>(await runtime(page)).quest.stage).toBe('objective');
  expect((await scene(page)).worldVisuals.some(row=>row.resourceId===4524&&row.visible)).toBe(true);
  expect((await scene(page)).worldVisuals.some(row=>row.resourceId===4544&&row.visible)).toBe(true);

  await clickWorldCell(page,plan.encounterCell as [number,number]);
  await expect.poll(async()=>(await scene(page)).inBattleView,{timeout:30000,intervals:[100]}).toBe(true);
  expect((await scene(page)).battleZoneId).toBe(0);

  let moved=false,attacked=false;
  for(let turn=0;turn<40;turn++){
    await expect.poll(async()=>{
      const state=await scene(page);
      return state.phase!=='active'||state.actionReady;
    },{timeout:12000,intervals:[80]}).toBe(true);
    const state=await scene(page);
    if(state.phase==='won')break;
    expect(state.phase,`Unexpected defeat: ${JSON.stringify({hp:state.hp,enemies:state.enemies})}`).toBe('active');
    const target=state.enemies.find(row=>row.hp>0);
    if(!target)break;
    if(state.target!==target.id)await selectTarget(page,target.id);
    const current=await scene(page);
    const live=current.enemies.find(row=>row.id===target.id&&row.hp>0)!;
    const distance=Math.max(Math.abs(live.cell[0]-current.battleCell[0]),Math.abs(live.cell[1]-current.battleCell[1]));
    if(distance<=1){
      await clickAction(page,'attack');
      attacked=true;
      continue;
    }
    const options=[...current.reachable].sort((a,b)=>
      Math.max(Math.abs(a[0]-live.cell[0]),Math.abs(a[1]-live.cell[1]))
      -Math.max(Math.abs(b[0]-live.cell[0]),Math.abs(b[1]-live.cell[1]))
    );
    expect(options.length).toBeGreaterThan(0);
    const before=JSON.stringify(current.battleCell);
    await clickWorldCell(page,options[0]);
    await expect.poll(async()=>JSON.stringify((await scene(page)).battleCell),{timeout:10000}).not.toBe(before);
    moved=true;
  }

  await expect.poll(async()=>(await scene(page)).phase,{timeout:12000}).toBe('won');
  expect(moved).toBe(true);
  expect(attacked).toBe(true);

  await clickAction(page,'return');
  await expect.poll(async()=>(await scene(page)).inBattleView).toBe(false);
  await expect.poll(async()=>(await scene(page)).mapId).toBe(1);
  await expect.poll(async()=>(await runtime(page)).quest.stage).toBe('ready_to_turn_in');

  const turnInClick=await clickGuide(page);
  expect(turnInClick.after.routeLength).toBe(0);
  await expect.poll(async()=>(await runtime(page)).quest.stage,{timeout:5000}).toBe('ready_to_turn_in');
  await expect(dialogue).toBeVisible();
  const turnInChoice=dialogue.locator('[data-dialogue-choice="turn-in-quest"]');
  await expect(turnInChoice).toBeVisible();
  await turnInChoice.click();
  await expect.poll(async()=>(await runtime(page)).quest.stage,{timeout:5000}).toBe('complete');
  await assertDiagnosticsOff(page);
  expect(pageErrors).toEqual([]);

  await page.screenshot({path:'test-results/s24-final-player-input-1366x768.png',fullPage:true});

  // The same completed player shell must remain bounded at the second required
  // desktop viewport. This is a resize gate, not a separate state shortcut.
  await page.setViewportSize({width:1920,height:1080});
  await expect.poll(async()=>page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1920);
  await assertDiagnosticsOff(page);
  await page.screenshot({path:'test-results/s24-final-player-input-1920x1080.png',fullPage:true});
});

import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {writeFileSync} from 'node:fs';

const snap=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
const m5=(page:Page)=>page.evaluate(()=>window.lapisM4!.snapshot());

async function ready(page:Page){
  await page.goto('/?m4=1');
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
}

async function action(page:Page,value:string){
  await page.evaluate(name=>{
    const node=document.querySelector<HTMLButtonElement>(`[data-action="${name}"]`);
    if(!node)throw new Error(`Missing action ${name}`);
    node.click();
  },value);
}

async function clickWorldCell(page:Page,cell:readonly[number,number]){
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();if(!box)throw new Error('Missing canvas');
  const state=await snap(page);
  const worldX=(cell[0]+1)*32,worldY=(cell[1]+1)*16;
  await page.mouse.click(box.x+(worldX-state.camera.x)*state.camera.zoom,box.y+(worldY-state.camera.y)*state.camera.zoom);
}

async function clickWorldPointerTarget(page:Page,id:string){
  const canvas=page.locator('canvas');
  const box=await canvas.boundingBox();if(!box)throw new Error('Missing canvas');
  const state=await snap(page),target=state.worldPointerTargets.find(row=>row.id===id&&row.visible);
  if(!target)throw new Error(`Missing visible world pointer target ${id}`);
  const worldX=(target.bounds.left+target.bounds.right)/2,worldY=(target.bounds.top+target.bounds.bottom)/2;
  await page.mouse.click(box.x+(worldX-state.camera.x)*state.camera.zoom,box.y+(worldY-state.camera.y)*state.camera.zoom);
}

async function selectTarget(page:Page,id:string){
  await page.evaluate(()=>document.querySelector<HTMLButtonElement>('#battle-pause')?.click());
  const state=await snap(page),enemy=state.enemies.find(row=>row.id===id&&row.hp>0);
  if(!enemy)throw new Error(`Missing enemy ${id}`);
  const canvas=page.locator('canvas'),box=await canvas.boundingBox();if(!box)throw new Error('Missing canvas');
  await page.mouse.click(box.x+(enemy.x-state.camera.x)*state.camera.zoom,box.y+(enemy.y-state.camera.y)*state.camera.zoom);
  await expect.poll(async()=>(await snap(page)).target,{timeout:5000}).toBe(id);
  await page.evaluate(()=>document.querySelector<HTMLButtonElement>('#battle-pause')?.click());
}

// Final gate intentionally uses real pointer delivery after the Phaser logical-scroll adapter fix.
// S22 private-smoke must traverse the rendered training-guide pointer target against the fixed-hash M5 pack.
// Fixed-hash rerun follows a fully green synthetic Chromium suite with battle focus center semantics preserved.
test('M5 private-original playable recovery: camera NPC door monsters balance quest',async({page})=>{
  test.setTimeout(210000);
  const pageErrors:string[]=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await ready(page);
  const runtime=await m5(page);
  test.skip(!runtime.playableRecovery,'M5 recovered visuals/map 7 are private-original resources.');

  const checkpoints:Record<string,unknown>={};
  const start=await snap(page);
  expect(start.mapId).toBe(1);
  expect(start.cameraFollow).toBe(true);
  expect(start.worldVisuals.some(row=>row.resourceId===1001&&row.visible)).toBe(true);
  expect(runtime.quest.stage).toBe('not_started');
  checkpoints.start={scene:start,runtime};
  await page.screenshot({path:'test-results/m5-01-visible-npc-camera.png',fullPage:true});

  // Player-facing zoom/fullscreen controls are connected to the real Phaser camera.
  const initialZoom=start.camera.zoom;
  await page.keyboard.press('+');
  await expect.poll(async()=>(await snap(page)).camera.zoom).toBeGreaterThan(initialZoom);

  // S22: a real browser pointer click on the rendered guide must be consumed as
  // NPC interaction at non-default zoom; it must not fall through to moveTo().
  const beforeNpcClick=await snap(page);
  await clickWorldPointerTarget(page,'training-guide');
  await expect.poll(async()=>(await m5(page)).quest.stage).toBe('not_started');
  const offer=page.locator('[data-ui="npc-dialogue"]');
  await expect(offer).toBeVisible();
  await expect(offer).toHaveAttribute('data-input-source','pointer');
  await offer.locator('[data-dialogue-choice="accept-quest"]').click();
  await expect.poll(async()=>(await m5(page)).quest.stage).toBe('accepted');
  const afterNpcClick=await snap(page);
  expect(afterNpcClick.anchor).toEqual(beforeNpcClick.anchor);
  expect(afterNpcClick.routeLength).toBe(0);
  expect(afterNpcClick.mapId).toBe(1);

  await page.keyboard.press('0');
  await expect.poll(async()=>(await snap(page)).camera.zoom).toBe(1);
  const viewport=(await snap(page)).viewport;
  if(viewport?.fullscreenSupported){
    await page.keyboard.press('f');
    await expect.poll(async()=>Boolean((await snap(page)).viewport?.fullscreenActive),{timeout:5000}).toBe(true);
    await page.keyboard.press('f');
    await expect.poll(async()=>Boolean((await snap(page)).viewport?.fullscreenActive),{timeout:5000}).toBe(false);
  }

  // Equip through the real M4 menu; no state injection.
  await page.keyboard.press('Escape');
  await action(page,'inventory');
  await page.selectOption('#equip-weapon','3');
  await page.selectOption('#equip-armor','25');
  await action(page,'inventory');
  await page.keyboard.press('Escape');
  await expect.poll(async()=>{const s=await snap(page);return `${s.inventory.weapon}/${s.inventory.armor}`;}).toBe('3/25');

  // Quest acceptance above came from the visible guide pointer target. M5 must not warp immediately.
  expect((await m5(page)).quest.stage).toBe('accepted');
  expect((await snap(page)).mapId).toBe(1);

  const plan=(await m5(page)).worldPlan!;
  const beforeMove=(await snap(page)).camera;
  await clickWorldCell(page,plan.doorCell as [number,number]);
  await expect.poll(async()=>(await snap(page)).mapId,{timeout:30000,intervals:[100]}).toBe(7);
  await expect.poll(async()=>(await m5(page)).quest.stage).toBe('objective');
  const inside=await snap(page);
  expect(inside.camera.x!==beforeMove.x||inside.camera.y!==beforeMove.y).toBe(true);
  expect(inside.worldVisuals.some(row=>row.resourceId===4524&&row.visible)).toBe(true);
  expect(inside.worldVisuals.some(row=>row.resourceId===4544&&row.visible)).toBe(true);
  checkpoints.interior={scene:inside,runtime:await m5(page)};
  await page.screenshot({path:'test-results/m5-02-auto-interior-visible-monsters.png',fullPage:true});

  // Walking near the visible encounter starts battle automatically.
  await clickWorldCell(page,plan.encounterCell as [number,number]);
  await expect.poll(async()=>(await snap(page)).inBattleView,{timeout:30000,intervals:[100]}).toBe(true);
  const entered=await snap(page);
  expect(entered.battleZoneId).toBe(0);
  expect(entered.damagePolicy.id).toBe('m5-reconstruction-combat-balance-v2');
  expect(entered.damagePolicy.provenance).toBe('RECONSTRUCTION_POLICY');
  expect(entered.enemies.map(row=>row.visualResourceId)).toEqual([4524,4544]);
  expect(entered.enemies.every(row=>row.maxHp>0)).toBe(true);
  checkpoints.battleEntry=entered;
  await page.screenshot({path:'test-results/m5-03-recovered-monster-battle.png',fullPage:true});

  let moved=false,attacked=false;
  for(let turn=0;turn<40;turn++){
    await expect.poll(async()=>{const s=await snap(page);return s.phase!=='active'||s.actionReady;},{timeout:12000,intervals:[80]}).toBe(true);
    const state=await snap(page);
    if(state.phase==='won')break;
    expect(state.phase,`Unexpected defeat: ${JSON.stringify({hp:state.hp,enemies:state.enemies})}`).toBe('active');
    const target=state.enemies.find(row=>row.hp>0);if(!target)break;
    if(state.target!==target.id)await selectTarget(page,target.id);
    const current=await snap(page),live=current.enemies.find(row=>row.id===target.id&&row.hp>0)!;
    const distance=Math.max(Math.abs(live.cell[0]-current.battleCell[0]),Math.abs(live.cell[1]-current.battleCell[1]));
    if(distance<=1){
      await action(page,'attack');attacked=true;
      continue;
    }
    const options=[...current.reachable].sort((a,b)=>
      Math.max(Math.abs(a[0]-live.cell[0]),Math.abs(a[1]-live.cell[1]))-
      Math.max(Math.abs(b[0]-live.cell[0]),Math.abs(b[1]-live.cell[1]))
    );
    expect(options.length).toBeGreaterThan(0);
    const before=JSON.stringify(current.battleCell),cell=options[0];
    await clickWorldCell(page,cell);
    await expect.poll(async()=>JSON.stringify((await snap(page)).battleCell),{timeout:10000}).not.toBe(before);
    moved=true;
  }
  await expect.poll(async()=>(await snap(page)).phase,{timeout:12000}).toBe('won');
  expect(moved).toBe(true);expect(attacked).toBe(true);
  const victory=await snap(page);
  expect(victory.hp).toBeGreaterThan(0);
  expect(victory.hp).toBeLessThanOrEqual(victory.maxHp??125);
  checkpoints.victory=victory;
  await page.screenshot({path:'test-results/m5-04-balanced-victory.png',fullPage:true});

  await action(page,'return');
  await expect.poll(async()=>(await snap(page)).inBattleView).toBe(false);
  await expect.poll(async()=>(await snap(page)).mapId).toBe(1);
  await expect.poll(async()=>(await m5(page)).quest.stage).toBe('ready_to_turn_in');
  const postBattle=await m5(page);
  expect(postBattle.gold).toBe(8);
  expect(postBattle.progression.exp).toBe(70);

  await page.keyboard.press('e');
  const turnIn=page.locator('[data-ui="npc-dialogue"]');
  await expect(turnIn).toBeVisible();
  await expect(turnIn).toHaveAttribute('data-input-source','keyboard');
  await turnIn.locator('[data-dialogue-choice="turn-in-quest"]').click();
  await expect.poll(async()=>(await m5(page)).quest.stage).toBe('complete');
  const done=await m5(page);
  expect(done.gold).toBe(15);
  expect(done.progression.exp).toBe(300);
  expect(done.progression.level).toBe(3);
  const save=JSON.parse(await page.evaluate(()=>window.lapisM4!.exportJson()));
  expect(save.version).toBe(2);expect(save.quest.stage).toBe('complete');
  checkpoints.complete={runtime:done,save,scene:await snap(page)};
  await page.screenshot({path:'test-results/m5-05-quest-complete.png',fullPage:true});
  expect(pageErrors).toEqual([]);
  writeFileSync('test-results/m5-playable-recovery.json',JSON.stringify(checkpoints,null,2));
});

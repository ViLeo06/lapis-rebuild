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
  await page.locator('[data-action="menu"]:visible,[data-action="battle-menu"]:visible').first().click();
  await expect(page.locator('[data-ui="game-menu"]')).toBeVisible();
}
async function startTraining(page:Page,id=15){
  await openMenu(page);
  await page.locator('[data-training-battle-id="'+id+'"] [data-action="training-start"]').click();
  await expect.poll(async()=>(await runtime(page)).m7Training.activeBattleId).toBe(id);
  await expect.poll(async()=>(await scene(page)).inBattleView).toBe(true);
}
async function canvasPoint(page:Page,x:number,y:number){
  const state=await scene(page),viewport=state.viewport;
  if(!viewport)throw new Error('Missing viewport');
  const box=await page.locator('canvas').boundingBox();
  if(!box)throw new Error('Missing canvas');
  return{x:box.x+x*(box.width/viewport.viewport.width),y:box.y+y*(box.height/viewport.viewport.height)};
}
async function clickWorld(page:Page,x:number,y:number){
  const state=await scene(page),box=await page.locator('canvas').boundingBox();
  if(!box)throw new Error('Missing canvas');
  await page.mouse.click(box.x+(x-state.camera.x)*state.camera.zoom,box.y+(y-state.camera.y)*state.camera.zoom);
}

test('S40 field minimap is upper-left and F8 toggles presentation',async({page})=>{
  await ready(page);
  await expect.poll(async()=>Boolean((await scene(page)).worldMinimap?.layout)).toBe(true);
  const before=await scene(page);
  expect(before.worldMinimap.visible).toBe(true);
  expect(before.worldMinimap.layout!.x).toBeLessThan(20);
  expect(before.worldMinimap.layout!.y).toBeLessThan(100);
  await page.keyboard.press('F8');
  await expect.poll(async()=>(await scene(page)).worldMinimap.visible).toBe(false);
  await page.keyboard.press('F8');
  await expect.poll(async()=>Boolean((await scene(page)).worldMinimap?.layout)).toBe(true);
});

test('S40 movement range is automatic and HUD has no Range button',async({page})=>{
  await ready(page);
  await startTraining(page,1);
  await expect(page.locator('[data-action="battle-range-toggle"]')).toHaveCount(0);
  await expect.poll(async()=>Boolean((await scene(page)).targeting?.rangeOverlayVisible)).toBe(true);
  expect((await scene(page)).reachable.length).toBeGreaterThan(0);
});

test('S40 manual minimap view persists until accepted player movement restores follow',async({page})=>{
  await ready(page);
  await startTraining(page,15);
  const entered=await scene(page),minimap=entered.minimap;
  if(!minimap||!minimap.enemies.length)throw new Error('Missing battle minimap');
  expect(entered.battleCamera.mode).toBe('FOLLOW_PLAYER');
  const remote=minimap.enemies.reduce((best,current)=>{
    const bd=Math.hypot(best.x-minimap.player.x,best.y-minimap.player.y),cd=Math.hypot(current.x-minimap.player.x,current.y-minimap.player.y);
    return cd>bd?current:best;
  },minimap.enemies[0]!);
  const remotePoint=await canvasPoint(page,remote.x,remote.y);
  await page.mouse.click(remotePoint.x,remotePoint.y);
  await expect.poll(async()=>(await scene(page)).battleCamera.mode).toBe('MANUAL_VIEW');
  await page.waitForTimeout(1800);
  expect((await scene(page)).battleCamera.mode).toBe('MANUAL_VIEW');

  const manual=await scene(page);
  if(!manual.minimap)throw new Error('Missing minimap after manual pan');
  const playerPoint=await canvasPoint(page,manual.minimap.player.x,manual.minimap.player.y);
  await page.mouse.click(playerPoint.x,playerPoint.y);
  await expect.poll(async()=>(await scene(page)).battleCamera.target).toBe(null);

  const centered=await scene(page);
  expect(centered.battleCamera.mode).toBe('MANUAL_VIEW');
  const cell=centered.reachable[0];
  if(!cell)throw new Error('No actionable movement cell');
  await clickWorld(page,(cell[0]+1)*32,(cell[1]+1)*16);
  await expect.poll(async()=>(await scene(page)).battleCamera.mode).toBe('FOLLOW_PLAYER');
});

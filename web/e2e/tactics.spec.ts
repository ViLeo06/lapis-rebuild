import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
const snap=(p:Page)=>p.evaluate(()=>window.lapisDiagnostics!.snapshot());
async function ready(p:Page){await p.goto('/');await p.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);}
async function clickCell(p:Page,c:readonly number[]){const b=await p.locator('canvas').boundingBox();if(!b)throw Error('Missing canvas');const cam=(await snap(p)).camera;await p.mouse.click(b.x+((c[0]+1)*32-cam.x)*cam.zoom,b.y+((c[1]+1)*16-cam.y)*cam.zoom);}
test('field city enters a different battle map and restores exact field position',async({page})=>{
 await ready(page);const field=await snap(page);expect(field.mapId).toBe(1);expect(field.inBattleView).toBe(false);expect(field.debugBounds).toBe(false);expect(field.routeLineVisible).toBe(false);
 await page.screenshot({path:'test-results/review-field.png',fullPage:true});
 await page.click('#battle');await expect.poll(async()=>(await snap(page)).mapId).toBe(0);
 const b=await snap(page);expect(b.inBattleView).toBe(true);expect(b.reachable.length).toBeGreaterThan(0);expect(b.fieldReturn?.mapId).toBe(1);
 expect(b.reachable.every(c=>!b.enemies.some(e=>e.cell[0]===c[0]&&e.cell[1]===c[1]))).toBe(true);
 await expect(page.locator('#save')).toBeDisabled();await expect(page.locator('#map')).toBeDisabled();await expect(page.locator('#action')).toBeDisabled();
 await page.screenshot({path:'test-results/review-battle.png',fullPage:true});await page.click('#battle-pause');
 await page.click('#return');const after=await snap(page);expect(after.mapId).toBe(field.mapId);expect(after.anchor).toEqual(field.anchor);expect(after.direction).toBe(field.direction);expect(after.camera.zoom).toBe(field.camera.zoom);
});
test('battle movement cannot be redirected or cancelled by attacking during execution',async({page})=>{
 await ready(page);await page.click('#battle');const b=await snap(page);
 const ordered=[...b.reachable].sort((a,c)=>Math.max(Math.abs(c[0]-b.battleCell[0]),Math.abs(c[1]-b.battleCell[1]))-Math.max(Math.abs(a[0]-b.battleCell[0]),Math.abs(a[1]-b.battleCell[1])));
 const target=ordered[0];await clickCell(page,target);
 await expect.poll(async()=>(await snap(page)).busy).toBe(true);
 await clickCell(page,b.battleCell);await page.dispatchEvent('#attack','click');
 await expect(page.locator('#attack')).toBeDisabled();
 await expect.poll(async()=>(await snap(page)).routeLength,{timeout:10000}).toBe(0);
 expect((await snap(page)).battleCell).toEqual(target);
 await expect.poll(async()=>(await snap(page)).actionReady,{timeout:5000}).toBe(true);
 expect((await snap(page)).debugBounds).toBe(false);expect((await snap(page)).routeLineVisible).toBe(false);
});
test('battle pause freezes HP meters positions and disallows injected action events',async({page})=>{
 await ready(page);await page.click('#battle');await page.click('#attack');await page.click('#battle-pause');
 const b=await snap(page);await page.waitForTimeout(1100);await page.dispatchEvent('#attack','click');
 const a=await snap(page);expect(a.hp).toBe(b.hp);expect(a.action).toBe(b.action);expect(a.enemies).toEqual(b.enemies);expect(a.anchor).toEqual(b.anchor);
 await page.click('#battle-pause');await expect.poll(async()=>(await snap(page)).actionReady,{timeout:5000}).toBe(true);
});
test('invalid in-map save coordinates fail before mutating field role map or inventory',async({page})=>{
 await ready(page);const before=await snap(page);
 const pack=await page.evaluate(async()=>{const m=await (await fetch('./game-data/prototype.json')).json();return m.provenance?.pack_sha256??m.provenance?.installer_sha256??'synthetic-fixture-v1';});
 const bad={version:1,pack,character:'109',mapId:0,x:0,y:0,gold:500,savedAt:new Date().toISOString()};
 await page.locator('#import').setInputFiles({name:'blocked.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});
 await expect(page.locator('#notice')).toContainText('\u5b58\u6863\u4f4d\u7f6e\u4e0d\u53ef\u901a\u884c');
 const after=await snap(page);expect(after.character).toBe(before.character);expect(after.mapId).toBe(before.mapId);expect(after.inventory).toEqual(before.inventory);expect(after.gold).toBe(before.gold);expect(after.anchor).toEqual(before.anchor);
});

import {test,expect} from '@playwright/test';
import type { Page } from '@playwright/test';
import {pathToFileURL} from 'node:url';
const snap=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
async function ready(page:Page){await page.goto('/');await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);await page.selectOption('#map','0');}
async function clickWorld(page:Page,x:number,y:number){const canvas=page.locator('canvas');await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox();if(!b)throw Error('Missing canvas');const camera=(await snap(page)).camera;await page.mouse.click(b.x+(x-camera.x)*camera.zoom,b.y+(y-camera.y)*camera.zoom);}

test('loads real-format pack with no JS errors',async({page})=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);await expect(page.locator('#loading')).toBeHidden();await expect(page.locator('canvas')).toBeVisible();await expect(page.locator('#raw-timing')).toContainText('5');await expect(page.locator('#anchors')).not.toBeChecked();await page.screenshot({path:'test-results/diagnostic.png',fullPage:true});expect(errors).toEqual([]);});
for(const cid of ['100','109']) for(const slot of ['00','01','02','03','05']) {
 test(`eight directions and frame stepping B${cid}_${slot}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);
  await page.selectOption('#character',cid);await page.selectOption('#action',slot);
  for(let d=0;d<8;d++){await page.selectOption('#direction',String(d));await page.click('#step');const s=await snap(page);expect(s.character).toBe(cid);expect(s.slot).toBe(slot);expect(s.direction).toBe(d);expect(s.cursor).toBeLessThan(s.length);expect(s.frame).toBeGreaterThanOrEqual(0);}
  expect(errors).toEqual([]);
 });
}
test('pause freezes and step advances exactly one frame',async({page})=>{await ready(page);await page.click('#step');const a=await snap(page);await page.waitForTimeout(250);expect((await snap(page)).cursor).toBe(a.cursor);await page.click('#step');expect((await snap(page)).cursor).toBe((a.cursor+1)%a.length);});
test('map overlays and hover inspector',async({page})=>{await ready(page);await page.check('#grid');await page.check('#collision');await clickWorld(page,700,400);await expect(page.locator('#resource')).not.toHaveText('--');await page.screenshot({path:'test-results/overlays.png',fullPage:true});});
test('second map switches and persists through IndexedDB',async({page})=>{await ready(page);expect(await page.locator('#map option').count()).toBeGreaterThanOrEqual(2);await expect(page.locator('#map option[value="0"]')).toHaveCount(1);await expect(page.locator('#map option[value="1"]')).toHaveCount(1);await page.selectOption('#map','1');await expect.poll(async()=>(await snap(page)).mapId).toBe(1);await expect(page.locator('#map-title')).toContainText('0001');await page.click('#save');await expect(page.locator('#notice')).toContainText('IndexedDB');await page.reload();await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);await page.click('#load');await expect.poll(async()=>(await snap(page)).mapId).toBe(1);await expect(page.locator('#map-title')).toContainText('0001');await page.screenshot({path:'test-results/map-0001.png',fullPage:true});});
test('MagicRes diagnostic uses sequential SPR frames without direction claims',async({page})=>{await ready(page);expect(await page.locator('#effect option').count()).toBeGreaterThan(0);await page.selectOption('#effect','1');const before=(await snap(page)).effect!;expect(before.id).toBe(1);await page.click('#effect-step');const stepped=(await snap(page)).effect!;expect(stepped.cursor).toBe((before.cursor+1)%stepped.length);expect(stepped.frame).toBe(stepped.cursor);await page.click('#effect-play');await expect.poll(async()=>((await snap(page)).effect?.playing??false),{timeout:2000}).toBe(true);await expect(page.locator('.hint').last()).toContainText('FOCUS');});
test('click movement reaches a legal route anchor without forcing debug bounds',async({page})=>{await ready(page);const before=await snap(page);await clickWorld(page,before.anchor.x+64,before.anchor.y);await expect.poll(async()=>(await snap(page)).anchor.x,{timeout:10000}).not.toBe(before.anchor.x);await expect.poll(async()=>(await snap(page)).routeLength,{timeout:10000}).toBe(0);await expect(page.locator('#anchors')).not.toBeChecked();});
test('field and battle are distinct modes with action gauge',async({page})=>{await ready(page);const field=await snap(page);expect(field.inBattleView).toBe(false);await page.click('#battle');await expect.poll(async()=>(await snap(page)).inBattleView).toBe(true);await expect(page.locator('#battle')).toBeHidden();await expect(page.locator('#return')).toBeVisible();await expect(page.locator('#action-wrap')).toBeVisible();expect((await snap(page)).actionReady).toBe(true);await page.click('#attack');expect((await snap(page)).actionReady).toBe(false);await expect.poll(async()=>(await snap(page)).actionReady,{timeout:5000}).toBe(true);await page.click('#return');await expect.poll(async()=>(await snap(page)).inBattleView).toBe(false);const back=await snap(page);expect(back.mapId).toBe(field.mapId);expect(back.anchor).toEqual(field.anchor);});
test('basic attack, mana cost, action gate and diagnostic effect reference',async({page})=>{await ready(page);await page.click('#battle');await page.click('#skill-1101');const s=await snap(page);expect(s.phase).toBe('active');expect(s.inBattleView).toBe(true);expect(s.mp).toBe(75);expect(s.enemies[0].hp).toBe(56);expect(s.effect?.id).toBe(1);expect(s.actionReady).toBe(false);await expect(page.locator('#attack')).toBeDisabled();await page.dispatchEvent('#attack','click');expect((await snap(page)).enemies[0].hp).toBe(56);});
test('wizard skills and explicit temporary semantics',async({page})=>{await ready(page);await page.selectOption('#character','109');await expect(page.locator('#skill-19101')).toBeHidden();await page.click('#battle');await expect(page.locator('#skill-19301')).toBeVisible();await page.click('#skill-19301');expect((await snap(page)).mp).toBe(80);await expect(page.locator('.disclaimer')).toContainText('UNVERIFIED');});
test('IndexedDB save survives page reload',async({page})=>{await ready(page);await page.selectOption('#character','109');await page.click('#save');await expect(page.locator('#notice')).toContainText('IndexedDB');await page.reload();await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);await page.click('#load');await expect.poll(async()=>(await snap(page)).character).toBe('109');});
test('foreign save rejected without mutating actor',async({page})=>{await ready(page);const before=await snap(page);await page.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:2,pack:'foreign',character:'199',x:0,y:0,gold:999}))});expect((await snap(page)).character).toBe(before.character);await expect(page.locator('#notice')).toContainText('mismatch');});
test('missing pack fails closed',async({page})=>{await page.route('**/game-data/prototype.json',route=>route.fulfill({status:404,body:'missing'}));await page.goto('/');await expect(page.locator('#loading')).toContainText('HTTP 404');expect(await page.evaluate(()=>!!window.lapisDiagnostics)).toBe(false);});
test('responsive layout has no horizontal overflow',async({page})=>{await page.setViewportSize({width:820,height:1180});await ready(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(820);await page.screenshot({path:'test-results/compact.png',fullPage:true});});
test('offline HTML opens without external requests',async({page})=>{test.skip(!process.env.LAPIS_OFFLINE_PREVIEW,'No offline build supplied');const external:string[]=[];page.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});await page.goto(pathToFileURL(process.env.LAPIS_OFFLINE_PREVIEW!).href);await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);await page.selectOption('#character','109');await page.selectOption('#action','05');await page.click('#step');expect((await snap(page)).length).toBe(11);await page.selectOption('#map','1');expect((await snap(page)).mapId).toBe(1);await page.click('#battle');await expect.poll(async()=>(await snap(page)).inBattleView).toBe(true);expect((await snap(page)).mapId).toBe(0);await page.click('#battle-pause');await page.click('#return');expect((await snap(page)).mapId).toBe(1);expect(external).toEqual([]);await page.screenshot({path:'test-results/offline.png',fullPage:true});});
test('training victory, settlement and saved reward survive reload',async({page})=>{
 test.setTimeout(60000);await ready(page);
 // Exercise a legal equipped loadout for the settlement scenario. Separate
 // tests cover unarmored damage, defeat, armor restrictions and saved gear.
 await page.selectOption('#equip-weapon','3');
 await page.selectOption('#equip-armor','25');
 expect((await snap(page)).equipment.attack).toBeGreaterThan(0);
 expect((await snap(page)).equipment.defense).toBeGreaterThan(0);
 await page.click('#battle');
 for(let n=0;n<20;n++){
   await expect.poll(async()=>{const s=await snap(page);return s.phase!=='active'||s.actionReady;},{timeout:10000,intervals:[50]}).toBe(true);
   const s=await snap(page);if(s.phase==='won')break;
   expect(s.phase,`Battle ended before settlement: ${JSON.stringify({hp:s.hp,enemies:s.enemies})}`).toBe('active');
   const target=s.enemies.find(e=>e.hp>0)!;
   // Enemy coordinates can advance between snapshot and pointer delivery. Freeze
   // only for target switching, click the latest position, then resume battle.
   if(s.target!==target.id){
     await page.click('#battle-pause');
     const frozen=await snap(page);const liveTarget=frozen.enemies.find(e=>e.id===target.id&&e.hp>0)!;
     await clickWorld(page,liveTarget.x,liveTarget.y);
     await expect.poll(async()=>(await snap(page)).target,{intervals:[50]}).toBe(target.id);
     await page.click('#battle-pause');
   }
   const current=await snap(page);const liveTarget=current.enemies.find(e=>e.id===target.id&&e.hp>0)!;
   const distance=Math.max(Math.abs(liveTarget.cell[0]-current.battleCell[0]),Math.abs(liveTarget.cell[1]-current.battleCell[1]));
   if(distance<=1){await page.locator('#attack').click({timeout:3000});continue;}
   const options=[...current.reachable].sort((a,b)=>Math.max(Math.abs(a[0]-liveTarget.cell[0]),Math.abs(a[1]-liveTarget.cell[1]))-Math.max(Math.abs(b[0]-liveTarget.cell[0]),Math.abs(b[1]-liveTarget.cell[1])));
   expect(options.length).toBeGreaterThan(0);const c=options[0];await clickWorld(page,(c[0]+1)*32,(c[1]+1)*16);
 }
 await expect.poll(async()=>(await snap(page)).phase).toBe('won');
 await page.click('#return');expect((await snap(page)).gold).toBe(10);
 await expect(page.locator('#return')).toBeHidden();await page.dispatchEvent('#return','click');expect((await snap(page)).gold).toBe(10);
 await page.click('#save');await expect(page.locator('#notice')).toContainText('IndexedDB');
 await page.reload();await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);await page.click('#load');
 await expect.poll(async()=>(await snap(page)).gold).toBe(10);await page.screenshot({path:'test-results/settlement.png',fullPage:true});
});
test('equipment affects only training values and survives save',async({page})=>{
 await ready(page);await page.selectOption('#equip-weapon','3');
 expect((await snap(page)).equipment.attack).toBe(7);
 await page.click('#save');await expect(page.locator('#notice')).toContainText('IndexedDB');
 await page.reload();await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);await page.click('#load');
 await expect.poll(async()=>(await snap(page)).inventory.weapon).toBe(3);
 await page.click('#battle');await expect(page.locator('#equip-weapon')).toBeDisabled();await page.click('#attack');
 expect((await snap(page)).enemies[0].hp).toBe(65);
 await page.screenshot({path:'test-results/equipment.png',fullPage:true});
});
test('class switch unequips incompatible items',async({page})=>{
 await ready(page);await page.selectOption('#equip-weapon','1');await page.selectOption('#character','109');
 expect((await snap(page)).inventory.weapon).toBe(null);
 await page.selectOption('#equip-weapon','12');expect((await snap(page)).equipment.attack).toBe(7);
});
test('M3 guide drives NPC -> map -> quest -> save loop',async({page})=>{
 await ready(page);expect((await snap(page)).quest.guide).toBe('not_started');
 await page.click('#npc');await expect.poll(async()=>(await snap(page)).mapId).toBe(1);expect((await snap(page)).quest.guide).toBe('city_visit');await expect(page.locator('#quest-status')).toContainText('前往外城');
 await page.click('#npc');await expect.poll(async()=>(await snap(page)).mapId).toBe(0);expect((await snap(page)).quest.guide).toBe('return_training');
 await page.click('#npc');expect((await snap(page)).quest.guide).toBe('complete');await expect(page.locator('#quest-status')).toContainText('已完成');
 await page.click('#save');await expect(page.locator('#notice')).toContainText('IndexedDB');
 await page.reload();await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);await page.click('#load');
 await expect.poll(async()=>(await snap(page)).quest.guide).toBe('complete');await page.screenshot({path:'test-results/quest-loop.png',fullPage:true});
});

test('defeat freezes battle state, blocks actions and returns without a reward',async({page})=>{
 await ready(page);const field=await snap(page);await page.click('#battle');
 await expect.poll(async()=>(await snap(page)).phase,{timeout:30000,intervals:[100]}).toBe('lost');
 const dead=await snap(page);await expect(page.locator('#attack')).toBeDisabled();
 await page.dispatchEvent('#attack','click');await page.waitForTimeout(350);
 const after=await snap(page);expect(after.hp).toBe(0);expect(after.enemies).toEqual(dead.enemies);expect(after.anchor).toEqual(dead.anchor);
 await page.click('#return');const back=await snap(page);expect(back.mapId).toBe(field.mapId);expect(back.anchor).toEqual(field.anchor);expect(back.gold).toBe(0);
});
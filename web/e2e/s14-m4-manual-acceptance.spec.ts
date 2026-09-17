import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {writeFileSync} from 'node:fs';

const snap=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
const m4=(page:Page)=>page.evaluate(()=>window.lapisM4!.snapshot());

async function ready(page:Page){
  await page.goto('/?m4=1');
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
}

async function clickWorld(page:Page,x:number,y:number){
  const canvas=page.locator('canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox();
  if(!box)throw new Error('Missing canvas');
  const camera=(await snap(page)).camera;
  await page.mouse.click(box.x+(x-camera.x)*camera.zoom,box.y+(y-camera.y)*camera.zoom);
}

async function legacyPause(page:Page){
  await page.evaluate(()=>document.querySelector<HTMLButtonElement>('#battle-pause')?.click());
}

async function m4Action(page:Page,action:string){
  await page.evaluate((value)=>{
    const button=document.querySelector<HTMLButtonElement>(`[data-action="${value}"]`);
    if(!button)throw new Error(`Missing M4 action ${value}`);
    button.click();
  },action);
}

async function selectLiveTarget(page:Page,targetId:string){
  await legacyPause(page);
  const frozen=await snap(page);
  const target=frozen.enemies.find(enemy=>enemy.id===targetId&&enemy.hp>0);
  if(!target)throw new Error(`Missing live target ${targetId}`);
  await clickWorld(page,target.x,target.y);
  await expect.poll(async()=>(await snap(page)).target,{intervals:[50]}).toBe(targetId);
  await legacyPause(page);
}

test('S14 M4 swordsman completes the playable quest, rewards and SaveV2 path',async({page})=>{
  test.setTimeout(150000);
  const checkpoints:Record<string,unknown>={};
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));

  await ready(page);
  const start=await m4(page);
  expect(start.world.mapId).toBe(1);
  expect(start.quest.stage).toBe('not_started');
  expect((await snap(page)).character).toBe('100');
  checkpoints.start={m4:start,scene:await snap(page)};
  await page.screenshot({path:'test-results/s14-01-m4-field.png',fullPage:true});

  // Player-facing world flow: E accepts the reconstruction quest and warps to
  // the objective position on the currently validated field map.
  await page.keyboard.press('e');
  await expect.poll(async()=>(await m4(page)).quest.stage).toBe('accepted');
  expect((await m4(page)).world.mapId).toBe(1);
  checkpoints.accepted={m4:await m4(page),scene:await snap(page)};
  await page.screenshot({path:'test-results/s14-02-quest-accepted.png',fullPage:true});

  await page.keyboard.press('e');
  await expect.poll(async()=>(await m4(page)).quest.stage).toBe('objective');
  await expect.poll(async()=>(await snap(page)).inBattleView).toBe(true);
  const entered=await snap(page);
  expect(entered.battleZoneId).toBe(0);
  expect(entered.battleEntryProvenance).toBe('RECONSTRUCTION_POLICY');
  expect(entered.damagePolicy.provenance).toBe('RECONSTRUCTION_POLICY');
  await expect(page.locator('[data-ui="battle-hud"]')).toBeVisible();
  checkpoints.entered={m4:await m4(page),scene:entered};
  await page.screenshot({path:'test-results/s14-03-swordsman-battle.png',fullPage:true});

  let capturedMove=false;
  let capturedAttack=false;
  for(let turn=0;turn<28;turn++){
    await expect.poll(async()=>{const state=await snap(page);return state.phase!=='active'||state.actionReady;},{timeout:10000,intervals:[50]}).toBe(true);
    const state=await snap(page);
    if(state.phase==='won')break;
    expect(state.phase,`Battle ended unexpectedly: ${JSON.stringify({hp:state.hp,enemies:state.enemies})}`).toBe('active');
    const target=state.enemies.find(enemy=>enemy.hp>0);
    if(!target)break;

    if(state.target!==target.id)await selectLiveTarget(page,target.id);
    const current=await snap(page);
    const live=current.enemies.find(enemy=>enemy.id===target.id&&enemy.hp>0)!;
    const distance=Math.max(Math.abs(live.cell[0]-current.battleCell[0]),Math.abs(live.cell[1]-current.battleCell[1]));
    if(distance<=1){
      await m4Action(page,'attack');
      if(!capturedAttack){
        await page.waitForTimeout(120);
        checkpoints.firstAttack=await snap(page);
        await page.screenshot({path:'test-results/s14-05-swordsman-attack.png',fullPage:true});
        capturedAttack=true;
      }
      continue;
    }

    const options=[...current.reachable].sort((a,b)=>
      Math.max(Math.abs(a[0]-live.cell[0]),Math.abs(a[1]-live.cell[1]))-
      Math.max(Math.abs(b[0]-live.cell[0]),Math.abs(b[1]-live.cell[1]))
    );
    expect(options.length).toBeGreaterThan(0);
    const from=JSON.stringify(current.battleCell);
    const cell=options[0];
    await clickWorld(page,(cell[0]+1)*32,(cell[1]+1)*16);
    await expect.poll(async()=>JSON.stringify((await snap(page)).battleCell),{timeout:10000}).not.toBe(from);
    if(!capturedMove){
      checkpoints.firstMove=await snap(page);
      await page.screenshot({path:'test-results/s14-04-swordsman-move.png',fullPage:true});
      capturedMove=true;
    }
  }

  await expect.poll(async()=>(await snap(page)).phase,{timeout:10000}).toBe('won');
  expect(capturedMove).toBe(true);
  expect(capturedAttack).toBe(true);
  checkpoints.victory=await snap(page);
  await page.screenshot({path:'test-results/s14-06-victory.png',fullPage:true});

  await m4Action(page,'return');
  await expect.poll(async()=>(await snap(page)).inBattleView).toBe(false);
  await expect.poll(async()=>(await m4(page)).quest.stage).toBe('ready_to_turn_in');
  let state=await m4(page);
  expect(state.gold).toBe(10);
  expect(state.progression.exp).toBe(100);
  expect(state.progression.level).toBe(2);
  checkpoints.returned={m4:state,scene:await snap(page)};
  await page.screenshot({path:'test-results/s14-07-returned.png',fullPage:true});

  await page.keyboard.press('e');
  await expect.poll(async()=>(await m4(page)).quest.stage).toBe('complete');
  state=await m4(page);
  expect(state.gold).toBe(15);
  expect(state.progression.exp).toBe(300);
  expect(state.progression.level).toBe(3);
  const save=JSON.parse(await page.evaluate(()=>window.lapisM4!.exportJson()));
  expect(save.version).toBe(2);
  expect(save.quest.stage).toBe('complete');
  expect(save.gold).toBe(15);
  expect(save.progression.exp).toBe(300);
  expect(save.progression.level).toBe(3);
  checkpoints.complete={m4:state,save};
  await page.screenshot({path:'test-results/s14-08-quest-complete.png',fullPage:true});

  expect(errors).toEqual([]);
  writeFileSync('test-results/s14-m4-swordsman-acceptance.json',JSON.stringify(checkpoints,null,2));
});

test('S14 M4 wizard uses authored vitals, visible magic and opt-in diagnostics',async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await ready(page);

  await page.keyboard.press('Escape');
  await expect(page.locator('[data-action="class-wizard"]')).toBeVisible();
  await page.evaluate(()=>{
    const button=document.querySelector<HTMLButtonElement>('[data-action="class-wizard"]');
    if(!button)throw new Error('Missing wizard class action');
    button.click();
  });
  await expect.poll(async()=>(await snap(page)).character).toBe('109');
  await page.keyboard.press('e');
  await page.keyboard.press('e');
  await expect.poll(async()=>(await snap(page)).inBattleView).toBe(true);
  await expect(page.locator('[data-skill-id="19101"]')).toBeVisible();
  await expect(page.locator('[data-skill-id="19201"]')).toBeVisible();
  await expect(page.locator('[data-skill-id="19301"]')).toBeVisible();
  const before=await snap(page);
  expect(before.hp).toBe(100);
  expect(before.mp).toBe(130);
  await expect.poll(async()=>(await snap(page)).actionReady,{timeout:10000}).toBe(true);
  await page.keyboard.press('3');
  await expect.poll(async()=>(await snap(page)).mp).toBeLessThan(before.mp);
  const after=await snap(page);
  expect(after.character).toBe('109');
  expect(after.damagePolicy.provenance).toBe('RECONSTRUCTION_POLICY');
  await page.screenshot({path:'test-results/s14-09-wizard-magic.png',fullPage:true});

  await page.keyboard.press('Escape');
  await expect(page.locator('[data-action="dev-toggle"]')).toBeVisible();
  await page.evaluate(()=>{
    const toggle=document.querySelector<HTMLInputElement>('[data-action="dev-toggle"]');
    if(!toggle)throw new Error('Missing developer diagnostics toggle');
    toggle.checked=true;
    toggle.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await expect(page.locator('body')).toHaveClass(/m4-dev-enabled/);
  await expect(page.locator('#m4-debug-root')).toContainText('RECONSTRUCTION_POLICY');
  await page.screenshot({path:'test-results/s14-10-developer-diagnostics.png',fullPage:true});

  expect(errors).toEqual([]);
  writeFileSync('test-results/s14-m4-wizard-acceptance.json',JSON.stringify({before,after,m4:await m4(page)},null,2));
});

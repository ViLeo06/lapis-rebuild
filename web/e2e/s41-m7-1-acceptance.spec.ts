import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';

const FINAL=process.env.S41_M7_1_FINAL==='1';
const runtime=(page:Page)=>page.evaluate(()=>window.lapisM4!.snapshot());
const scene=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
const extendedScene=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot() as any);

async function ready(page:Page){
  await page.goto('/?m4=1');
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
  await page.waitForFunction(()=>document.body.classList.contains('m4-active'));
}

async function acceptanceStartTraining(page:Page,id:number){
  const ok=await page.evaluate(trainingId=>{
    const api=window.lapisM4 as any;
    if(typeof api?.acceptanceStartTrainingBattle!=='function')return false;
    api.acceptanceStartTrainingBattle(trainingId);
    return true;
  },id);
  expect(ok,'final S41 integration must expose webdriver-only acceptanceStartTrainingBattle').toBe(true);
  await expect.poll(async()=>(await runtime(page)).m7Training?.activeBattleId??null).toBe(id);
  await expect.poll(async()=>(await scene(page)).inBattleView).toBe(true);
}

test.describe('S41 M7.1 final acceptance skeleton',()=>{
  test.skip(!FINAL,'Phase-1 harness only. S41_M7_1_FINAL=1 is required after S35-S40 integration; skipped runs are not acceptance evidence.');

  test('battle HUD is state-driven and exposes HP/MP/EXP/ATK/DEF without Range button',async({page})=>{
    await ready(page);
    await acceptanceStartTraining(page,1);
    const hud=page.locator('[data-ui="battle-hud"]');
    await expect(hud).toBeVisible();
    await expect(hud.locator('[data-action="battle-range-toggle"]')).toHaveCount(0);
    for(const label of ['HP','MP','EXP','ATK','DEF'])await expect(hud).toContainText(label);
    const state:any=await extendedScene(page);
    expect(state.targeting?.rangeOverlayMode??null).toBe('movement');
  });

  test('world entry exposes training manager, world minimap and direct fullscreen action',async({page})=>{
    await ready(page);
    const state:any=await extendedScene(page);
    const app:any=await runtime(page);
    expect(state.inBattleView).toBe(false);
    await expect(page.locator('[data-world-minimap="true"]')).toBeVisible();
    await expect(page.locator('[data-action="fullscreen"]:visible')).toBeVisible();
    expect(app.m7Training?.battleCount).toBe(15);
    if(app.playableRecovery){
      expect((state.worldVisuals??[]).some((row:any)=>row.id==='training-manager'&&row.visible)).toBe(true);
    }
    await expect(page.locator('[data-settings-training-selector]')).toHaveCount(0);
    await expect(page.locator('[data-ui="m7-training-camp"]')).toHaveCount(0);
  });

  test('battle presentation exposes follow/manual camera, battle minimap and continuous monster motion observables',async({page})=>{
    await ready(page);
    await acceptanceStartTraining(page,6);
    const state:any=await extendedScene(page);
    expect(state.battleCamera?.mode).toBe('FOLLOW_PLAYER');
    expect(state.minimap?.placement).toBe('bottom-right');
    expect(state.minimap?.enemies?.length??0).toBe((state.enemies??[]).filter((row:any)=>row.hp>0).length);
    expect(state.monsterMotion?.teleportDetected??false).toBe(false);
  });

  test('retreat remains zero-EXP and returns to field',async({page})=>{
    await ready(page);
    const before:any=await runtime(page);
    await acceptanceStartTraining(page,1);
    await page.locator('[data-action="battle-exit-request"]:visible').click();
    await expect(page.locator('[data-ui="battle-exit-confirm"]')).toBeVisible();
    await page.locator('[data-action="battle-exit-confirm"]:visible').click();
    await expect.poll(async()=>(await scene(page)).inBattleView).toBe(false);
    const after:any=await runtime(page);
    expect(after.progression.exp).toBe(before.progression.exp);
    expect(after.progression.level).toBe(before.progression.level);
  });
});

test.describe('S41 M7.1 mobile/coarse-pointer final skeleton',()=>{
  test.use({viewport:{width:412,height:915},hasTouch:true});
  test.skip(!FINAL,'Phase-1 harness only. Enable only after S35-S40 are integrated.');

  test('mobile field exposes tappable training manager and battle minimap consumes touch',async({page})=>{
    await ready(page);
    const field:any=await extendedScene(page);
    const app:any=await runtime(page);
    expect(app.m7Training?.battleCount).toBe(15);
    if(app.playableRecovery){
      expect((field.worldVisuals??[]).some((row:any)=>row.id==='training-manager'&&row.visible)).toBe(true);
    }
    await acceptanceStartTraining(page,1);
    const state:any=await extendedScene(page);
    expect(state.minimap?.placement).toBe('bottom-right');
    expect(state.minimap?.pointerConsumesInput).toBe(true);
  });
});

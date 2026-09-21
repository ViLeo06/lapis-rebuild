import {expect,test} from '@playwright/test';
import type {Page} from '@playwright/test';

const runtime=(page:Page)=>page.evaluate(()=>window.lapisM4!.snapshot());
const scene=(page:Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());

async function ready(page:Page){
  await page.goto('/?m4=1');
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
  await page.waitForFunction(()=>document.body.classList.contains('m4-active'));
}

async function openMenu(page:Page){
  const button=page.locator('[data-action="menu"]:visible,[data-action="battle-menu"]:visible').first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('[data-ui="game-menu"]')).toBeVisible();
}

test('S33 developer preset resolves M7 stage boundaries and cannot pollute normal SaveV2',async({page})=>{
  await ready(page);
  await openMenu(page);
  await expect(page.locator('[data-action="training-start"]')).toHaveCount(15);
  await page.locator('[data-action="dev-toggle"]').check();
  await page.locator('[data-dev-profession]').selectOption('wizard');
  await page.locator('[data-dev-level-input]').fill('56');
  await page.locator('[data-dev-unlock-all]').check();
  await page.locator('[data-action="dev-preset-apply"]').click();

  const state=await runtime(page);
  expect(state.progression.level).toBe(56);
  expect(state.m6.stageId).toBe(169);
  expect(state.m7Training.developerPresetActive).toBe(true);
  expect(state.m7Training.skillLevelOverride).toBe(6);

  await openMenu(page);
  await expect(page.locator('[data-action="save"]')).toBeDisabled();
});

test.describe('S33 mobile controls',()=>{
  test.use({viewport:{width:412,height:915},hasTouch:true});

  test('15-battle Start, recovery actions and exit confirmation remain touchable',async({page})=>{
    await ready(page);
    await openMenu(page);
    const starts=page.locator('[data-action="training-start"]');
    await expect(starts).toHaveCount(15);
    const start8=page.locator('[data-training-battle-id="8"] [data-action="training-start"]');
    const startBox=await start8.boundingBox();
    expect(startBox?.height??0).toBeGreaterThanOrEqual(44);
    await start8.tap();
    await expect.poll(async()=>(await runtime(page)).m7Training.activeBattleId).toBe(8);

    for(const action of ['recovery-hp','recovery-mp','battle-exit-request']){
      const button=page.locator('[data-action="'+action+'"]:visible').first();
      await expect(button).toBeVisible();
      const box=await button.boundingBox();
      expect(box?.height??0).toBeGreaterThanOrEqual(44);
    }

    await page.locator('[data-action="battle-exit-request"]:visible').first().tap();
    await expect(page.locator('[data-ui="battle-exit-confirm"]')).toBeVisible();
    const confirm=page.locator('[data-action="battle-exit-confirm"]:visible');
    const confirmBox=await confirm.boundingBox();
    expect(confirmBox?.height??0).toBeGreaterThanOrEqual(44);
    await confirm.tap();
    await expect.poll(async()=>(await runtime(page)).m7Training.activeBattleId).toBeNull();
    expect((await scene(page)).inBattleView).toBe(false);
  });
});

test('MP recovery consumes readiness after a real skill action without leaving battle',async({page})=>{
  await ready(page);
  await openMenu(page);
  await page.locator('[data-training-battle-id="1"] [data-action="training-start"]').click();
  await expect.poll(async()=>(await runtime(page)).m7Training.activeBattleId).toBe(1);
  await page.waitForFunction(()=>window.lapisDiagnostics!.snapshot().actionReady);
  const skill=page.locator('[data-action="skill"]:visible').first();
  await expect(skill).toBeEnabled();
  const beforeSkill=await scene(page);
  await skill.click();
  await expect.poll(async()=>(await scene(page)).mp).toBeLessThan(beforeSkill.mp);
  await page.waitForFunction(()=>window.lapisDiagnostics!.snapshot().actionReady);
  const beforeRecovery=await scene(page);
  const recover=page.locator('[data-action="recovery-mp"]:visible').first();
  await expect(recover).toBeEnabled();
  await recover.click();
  await expect.poll(async()=>(await scene(page)).mp).toBeGreaterThan(beforeRecovery.mp);
  expect((await scene(page)).inBattleView).toBe(true);
  await expect(page.locator('#m4-runtime-notice')).toContainText('MP Recovery');
});

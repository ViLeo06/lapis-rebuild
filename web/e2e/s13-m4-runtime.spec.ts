import {test,expect} from '@playwright/test';

const snap=(page:import('@playwright/test').Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
const m4=(page:import('@playwright/test').Page)=>page.evaluate(()=>window.lapisM4!.snapshot());

async function ready(page:import('@playwright/test').Page){
  await page.goto('/?m4=1');
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
}

test('S13 M4 player shell replaces developer-first layout',async({page})=>{
  await ready(page);
  await expect(page.locator('body')).toHaveClass(/m4-active/);
  await expect(page.locator('[data-ui="field-hud"]')).toBeVisible();
  await expect(page.locator('main > aside')).toHaveCSS('opacity','0.001');
  const state=await m4(page);
  expect(state.quest.stage).toBe('not_started');
  expect(state.world.mapId).toBe(1);
  expect(state.progression.level).toBe(1);
});

test('S13 world quest enters explicit battle and exposes S11 skills through S8 HUD',async({page})=>{
  await ready(page);
  await page.keyboard.press('e');
  await expect.poll(async()=>(await m4(page)).quest.stage).toBe('accepted');
  await expect.poll(async()=>(await snap(page)).mapId).toBe(1);
  await expect(page.locator('[data-ui="field-hud"]')).toContainText('前往外城');

  await page.keyboard.press('e');
  await expect.poll(async()=>(await m4(page)).quest.stage).toBe('objective');
  await expect.poll(async()=>(await snap(page)).inBattleView).toBe(true);
  await expect(page.locator('[data-ui="battle-hud"]')).toBeVisible();
  await expect(page.locator('[data-skill-id="1101"]')).toBeVisible();
  await expect(page.locator('[data-skill-id="1201"]')).toBeVisible();
  await expect(page.locator('[data-skill-id="1301"]')).toBeVisible();
  const battle=await snap(page);
  expect(battle.battleZoneId).toBe(0);
  expect(battle.battleEntryProvenance).toBe('RECONSTRUCTION_POLICY');
});

test('S13 class switch swaps authored vitals and skill roster while keeping reconstruction provenance explicit',async({page})=>{
  await ready(page);
  await page.locator('[data-action="menu"]').first().click();
  await page.locator('[data-action="class-wizard"]').click();
  await expect.poll(async()=>(await snap(page)).character).toBe('109');
  await page.keyboard.press('e');
  await page.keyboard.press('e');
  await expect(page.locator('[data-skill-id="19101"]')).toBeVisible();
  await expect(page.locator('[data-skill-id="19201"]')).toBeVisible();
  await expect(page.locator('[data-skill-id="19301"]')).toBeVisible();
  const battle=await snap(page);
  expect(battle.hp).toBe(100);
  expect(battle.mp).toBe(130);
  expect(battle.damagePolicy.provenance).toBe('RECONSTRUCTION_POLICY');
});

test('S13 M4 save export uses v2 schema',async({page})=>{
  await ready(page);
  const json=await page.evaluate(()=>window.lapisM4!.exportJson());
  const save=JSON.parse(json);
  expect(save.kind).toBe('lapis-rebuild-save');
  expect(save.version).toBe(2);
  expect(save.progression.policyId).toBe('m4-linear-100x-level-v1');
  expect(save.quest.questId).toBe('s9-training-run');
});

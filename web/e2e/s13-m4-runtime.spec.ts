import {test,expect} from '@playwright/test';

const snap=(page:import('@playwright/test').Page)=>page.evaluate(()=>window.lapisDiagnostics!.snapshot());
const m4=(page:import('@playwright/test').Page)=>page.evaluate(()=>window.lapisM4!.snapshot());

async function ready(page:import('@playwright/test').Page){
  await page.goto('/?m4=1');
  await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready&&!!window.lapisM4);
}
async function chooseDialogue(page:import('@playwright/test').Page,id:string){
  const choice=page.locator(`[data-dialogue-choice="${id}"]`);
  await expect(choice).toBeVisible();
  await choice.click();
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
  test.skip((await m4(page)).playableRecovery===true,'M5 private pack uses the spatial training-house flow covered by m5-playable-recovery.spec.ts.');
  await page.keyboard.press('e');
  await chooseDialogue(page,'accept-quest');
  await expect.poll(async()=>(await m4(page)).quest.stage).toBe('accepted');
  await expect.poll(async()=>(await snap(page)).mapId).toBe(1);
  await expect(page.locator('[data-ui="field-hud"]')).toContainText('前往外城');

  await page.keyboard.press('e');
  await expect.poll(async()=>(await m4(page)).quest.stage).toBe('objective');
  await expect.poll(async()=>(await snap(page)).inBattleView).toBe(true);
  await expect(page.locator('[data-ui="battle-hud"]')).toBeVisible();
  await expect(page.locator('[data-skill-id="1101"]')).toBeVisible();
  await expect(page.locator('[data-skill-id="1201"]')).toHaveCount(0);
  await expect(page.locator('[data-skill-id="1301"]')).toHaveCount(0);
  const battle=await snap(page);
  expect(battle.battleZoneId).toBe(0);
  expect(battle.battleEntryProvenance).toBe('RECONSTRUCTION_POLICY');
});

test('S13 class switch swaps authored vitals and skill roster while keeping reconstruction provenance explicit',async({page})=>{
  await ready(page);
  test.skip((await m4(page)).playableRecovery===true,'M5 private pack uses the spatial battle entry covered by the M5 acceptance path.');
  // The field HUD is intentionally refreshed from live scene snapshots. Open
  // the menu with its stable keyboard path, then synchronously dispatch the
  // delegated class action so Playwright does not require the redrawn node to
  // remain attached across multiple animation frames.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-action="class-wizard"]')).toBeVisible();
  await page.evaluate(()=>{
    const button=document.querySelector<HTMLElement>('[data-action="class-wizard"]');
    if(!button)throw new Error('Missing wizard class action');
    button.click();
  });
  await expect.poll(async()=>(await snap(page)).character).toBe('109');
  await page.keyboard.press('e');
  await chooseDialogue(page,'accept-quest');
  await page.keyboard.press('e');
  await expect(page.locator('[data-skill-id="19101"]')).toBeVisible();
  await expect(page.locator('[data-skill-id="19201"]')).toHaveCount(0);
  await expect(page.locator('[data-skill-id="19301"]')).toHaveCount(0);
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
  expect(save.progression.policyId).toBe('m7-1-levelabl-experience-v1');
  expect(save.quest.questId).toBe((await m4(page)).playableRecovery?'m5-training-house':'s9-training-run');
});

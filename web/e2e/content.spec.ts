import {test,expect} from '@playwright/test';

test('source-backed NPC and quest content loads into diagnostics',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.waitForFunction(()=>window.lapisDiagnostics?.snapshot().ready);
  await expect(page.locator('#source-content-panel')).toBeVisible();
  expect(await page.locator('#source-npc option').count()).toBeGreaterThan(0);
  expect(await page.locator('#source-quest option').count()).toBeGreaterThan(0);
  await expect(page.locator('#source-npc-text')).not.toHaveText('--');
  await expect(page.locator('#source-quest-text')).not.toBeEmpty();
  await expect(page.locator('#source-evidence')).not.toBeEmpty();
  expect(errors).toEqual([]);
});

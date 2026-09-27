import {expect, test} from '@playwright/test';
import {bootProductionApp, captureRuntimeFailures} from './helpers/platform-acceptance.ts';
import {
  SYNTHETIC_FILES,
  syntheticMembers,
  zipFixture,
} from '../tests/fixtures/full-pack-fixture.ts';

test('M8.1 integrated Full Pack persists separately and serves an installed asset offline', async ({page}) => {
  const failures=captureRuntimeFailures(page);
  const pack=zipFixture(syntheticMembers());
  const packBytes=Buffer.from(await pack.arrayBuffer());

  await bootProductionApp(page);
  await page.waitForFunction(() => Boolean((window as any).lapisM4 && (window as any).lapisDistribution));
  await page.evaluate(() => (window as any).lapisDistribution.open());

  const before=await page.evaluate(async () => {
    const runtime=(window as any).lapisM4;
    await runtime.save();
    const value=JSON.parse(runtime.exportJson());
    delete value.savedAt;
    return value;
  });

  const input=page.locator('[data-role="pack-file"]');
  await expect(input).toHaveCount(1);
  await input.setInputFiles({
    name:'lapis-full-synthetic-safe-1.lapispak',
    mimeType:'application/octet-stream',
    buffer:packBytes,
  });

  await expect(page.getByRole('button',{name:/进入游戏/})).toBeVisible({timeout:30_000});
  const installed=await page.evaluate(async () => {
    const request=indexedDB.open('lapis-asset-store',1);
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    try{
      const tx=db.transaction('installed','readonly');
      const get=tx.objectStore('installed').get('synthetic-safe');
      return await new Promise<any>((resolve,reject)=>{
        get.onsuccess=()=>resolve(get.result);
        get.onerror=()=>reject(get.error);
      });
    }finally{
      db.close();
    }
  });
  expect(installed?.contentPack).toBe('synthetic-safe');
  expect(installed?.version).toBe('1');
  expect(installed?.assetCount).toBe(2);

  const after=await page.evaluate(async () => {
    const runtime=(window as any).lapisM4;
    await runtime.load();
    const value=JSON.parse(runtime.exportJson());
    delete value.savedAt;
    return value;
  });
  expect(after).toEqual(before);

  await page.waitForFunction(async () => {
    const registration=await navigator.serviceWorker?.getRegistration();
    return Boolean(registration?.active&&navigator.serviceWorker.controller);
  });

  await page.context().setOffline(true);
  try{
    const served=await page.evaluate(async () => {
      const response=await fetch('./game-data/maps/demo.json?m81-installed=1',{cache:'no-store'});
      return{
        ok:response.ok,
        body:await response.text(),
        version:response.headers.get('x-lapis-asset-version'),
        sha256:response.headers.get('x-lapis-asset-sha256'),
      };
    });
    expect(served.ok).toBe(true);
    expect(served.body).toBe(SYNTHETIC_FILES['maps/demo.json']);
    expect(served.version).toBe('1');
    expect(served.sha256).toMatch(/^[a-f0-9]{64}$/);
  }finally{
    await page.context().setOffline(false);
  }

  expect(failures.pageErrors).toEqual([]);
});

test('M8.1 Pages preview without public content keeps the install panel open', async ({page}) => {
  const failures=captureRuntimeFailures(page);
  await page.route('**/release-metadata.json', async route => {
    await route.fulfill({
      status:200,
      contentType:'application/json',
      body:JSON.stringify({
        schema:1,
        release:{
          channel:'preview',
          commit:'d8fa4e683d25017c33e548dffdede2f0e03e06b9',
          branch:'codex/m8-1-distribution-playtest-integration',
          url:'https://preview.example.pages.dev/',
        },
        content:null,
      }),
    });
  });

  const response=await page.goto('/?m4=1',{waitUntil:'domcontentloaded'});
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole('button',{name:/导入完整资源包/})).toBeVisible();
  await expect(page.getByRole('button',{name:/下载完整资源/})).toHaveCount(0);
  await expect(page.locator('#canvas-host canvas')).toHaveCount(0);
  expect(failures.pageErrors).toEqual([]);
});


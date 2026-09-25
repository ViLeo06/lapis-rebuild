import { expect, type Page } from '@playwright/test';

export type RuntimeFailures = {
  pageErrors: string[];
  consoleErrors: string[];
};

export function captureRuntimeFailures(page: Page): RuntimeFailures {
  const failures: RuntimeFailures = { pageErrors: [], consoleErrors: [] };
  page.on('pageerror', error => failures.pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') failures.consoleErrors.push(message.text());
  });
  return failures;
}

export async function bootProductionApp(page: Page) {
  const response = await page.goto('/?m4=1', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#canvas-host')).toBeVisible();
  await expect(page.locator('#loading')).not.toContainText('无法启动');
  await expect(page.locator('#canvas-host canvas')).toBeVisible({ timeout: 30_000 });
}

export async function expectPageFitsViewport(page: Page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);

  const host = page.locator('#canvas-host');
  const box = await host.boundingBox();
  expect(box).not.toBeNull();
  if (box) {
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(metrics.innerWidth + 1);
  }
}

export async function expectTouchAccepted(page: Page) {
  await page.evaluate(() => {
    (window as any).__m8TouchCount = 0;
    document.body.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') (window as any).__m8TouchCount += 1;
    }, { once: true });
  });
  const canvas = page.locator('#canvas-host canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => page.evaluate(() => (window as any).__m8TouchCount)).toBe(1);
}

export async function productionAssetSnapshot(page: Page) {
  const html = await (await page.request.get('/')).text();
  const resources = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .map(entry => (entry as PerformanceResourceTiming).name)
  );
  return {
    html,
    jsAssets: resources.filter(url => /\/assets\/.*\.js(?:\?|$)/.test(url)),
    cssAssets: resources.filter(url => /\/assets\/.*\.css(?:\?|$)/.test(url)),
  };
}

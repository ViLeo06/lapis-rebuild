import { expect, test } from '@playwright/test';
import {
  bootProductionApp,
  captureRuntimeFailures,
  expectPageFitsViewport,
  expectTouchAccepted,
  productionAssetSnapshot,
} from './helpers/platform-acceptance.ts';

const PWA_INTEGRATED = process.env.M8_PWA_INTEGRATED === '1';

test.describe('M8 platform acceptance - fast smoke', () => {
  test('desktop production smoke boots canvas without runtime failure', async ({ page }) => {
    const failures = captureRuntimeFailures(page);
    await bootProductionApp(page);
    await expectPageFitsViewport(page);
    expect(failures.pageErrors).toEqual([]);
  });

  test('production preview is a multi-file Vite build', async ({ page }) => {
    await bootProductionApp(page);
    const snapshot = await productionAssetSnapshot(page);
    expect(snapshot.jsAssets.length).toBeGreaterThan(0);
    expect(snapshot.html).not.toContain('data:text/javascript');
    expect(snapshot.html).not.toContain('data:image/');
    expect(snapshot.html.length).toBeLessThan(100_000);
  });
});
test.describe('M8 platform acceptance - mobile landscape', () => {
  test.use({
    viewport: { width: 915, height: 412 },
    hasTouch: true,
    isMobile: true,
  });

  test('landscape keeps canvas in usable width and accepts touch', async ({ page }) => {
    const failures = captureRuntimeFailures(page);
    await bootProductionApp(page);
    await expectPageFitsViewport(page);
    await expectTouchAccepted(page);
    await expect(page.locator('#canvas-host canvas')).toBeVisible();
    expect(failures.pageErrors).toEqual([]);
  });
});

test.describe('M8 platform acceptance - mobile portrait', () => {
  test.use({
    viewport: { width: 412, height: 915 },
    hasTouch: true,
    isMobile: true,
  });

  test('portrait remains bootable and can rotate back to landscape', async ({ page }) => {
    const failures = captureRuntimeFailures(page);
    await bootProductionApp(page);
    await expectPageFitsViewport(page);
    await expect(page.locator('#canvas-host canvas')).toBeVisible();
    await page.setViewportSize({ width: 915, height: 412 });
    await expectPageFitsViewport(page);
    await expect(page.locator('#canvas-host canvas')).toBeVisible();
    expect(failures.pageErrors).toEqual([]);
  });
});

test.describe('M8 offline/PWA integration contract', () => {
  test.skip(
    !PWA_INTEGRATED,
    'NOT YET INTEGRATED: Worker 2 owns the Service Worker/PWA implementation.'
  );

  test('installed app shell has an active service worker registration', async ({ page }) => {
    await bootProductionApp(page);
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker?.getRegistration();
      return Boolean(registration?.active);
    });
    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.scope ?? null;
    });
    expect(scope).not.toBeNull();
  });
});

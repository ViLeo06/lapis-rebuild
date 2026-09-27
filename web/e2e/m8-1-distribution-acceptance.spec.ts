import { expect, test, type Page } from '@playwright/test';
import {
  bootProductionApp,
  captureRuntimeFailures,
  expectPageFitsViewport,
} from './helpers/platform-acceptance.ts';

const RELEASE_URL = process.env.M81_PAGES_URL?.trim();
const RELEASE_COMMIT = process.env.M81_PAGES_COMMIT?.trim().toLowerCase();

async function distributionUiPresent(page: Page): Promise<boolean> {
  const names = [
    /下载完整资源/,
    /导入完整资源包/,
    /进入游戏/,
    /检查更新/,
    /修复资源/,
  ];
  for (const name of names) {
    if (await page.getByRole('button', { name }).count()) return true;
  }
  return false;
}

async function requireDistributionUi(page: Page): Promise<void> {
  await bootProductionApp(page);
  if (!(await distributionUiPresent(page))) {
    test.skip(true, 'M8.1 distribution UI is not integrated on this branch yet.');
  }
}

async function expectTouchTargets(page: Page): Promise<void> {
  const buttons = page.getByRole('button').filter({
    hasText: /下载完整资源|导入完整资源包|进入游戏|检查更新|修复资源/,
  });
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const box = await buttons.nth(index).boundingBox();
    expect(box, `distribution button ${index} should be visible`).not.toBeNull();
    expect(box!.height, `distribution button ${index} should keep a touch-sized target`).toBeGreaterThanOrEqual(44);
  }
}

test.describe('M8.1 distribution acceptance - first run UX', () => {
  test('new player sees full-pack actions without developer jargon', async ({ page }) => {
    const failures = captureRuntimeFailures(page);
    await requireDistributionUi(page);

    await expect(page.getByRole('button', { name: /下载完整资源/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /导入完整资源包/ })).toBeVisible();

    const visibleText = await page.locator('body').innerText();
    expect(visibleText).not.toMatch(/\bSHA-?256\b/i);
    expect(visibleText).not.toMatch(/\bIndexedDB\b/i);
    expect(visibleText).not.toMatch(/\bResource\s+Manifest\b/i);
    expect(failures.pageErrors).toEqual([]);
  });
});

test.describe('M8.1 distribution acceptance - Android landscape', () => {
  test.use({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true });

  test('distribution panel fits 915x412 and keeps touch targets usable', async ({ page }) => {
    const failures = captureRuntimeFailures(page);
    await requireDistributionUi(page);
    await expectPageFitsViewport(page);
    await expectTouchTargets(page);
    expect(failures.pageErrors).toEqual([]);
  });
});

test.describe('M8.1 distribution acceptance - Android portrait', () => {
  test.use({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });

  test('distribution panel fits 412x915 and survives rotation', async ({ page }) => {
    const failures = captureRuntimeFailures(page);
    await requireDistributionUi(page);
    await expectPageFitsViewport(page);
    await expectTouchTargets(page);

    await page.setViewportSize({ width: 915, height: 412 });
    await expectPageFitsViewport(page);
    expect(failures.pageErrors).toEqual([]);
  });
});

test.describe('M8.1 release acceptance', () => {
  test.skip(!RELEASE_URL, 'BLOCKED / AWAITING_RELEASE_AUTHORIZATION: no real Pages URL supplied.');

  test('authorized Pages URL exposes the deployed commit, PWA metadata and offline shell', async ({ page }) => {
    const failures = captureRuntimeFailures(page);
    await page.goto(RELEASE_URL!, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#canvas-host canvas')).toBeVisible();
    await expectPageFitsViewport(page);

    const manifestResponse = await page.request.get(new URL('/manifest.webmanifest', RELEASE_URL!).href);
    expect(manifestResponse.ok()).toBe(true);

    const metadata = await page.evaluate(async () => {
      const response = await fetch('./release-metadata.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('release-metadata.json fetch failed: ' + response.status);
      return await response.json() as {
        schema: number;
        release: { channel: string; commit: string | null; branch: string | null; url: string | null };
        content: null | { manifestPath: string };
      };
    });

    expect(metadata.schema).toBe(1);
    expect(metadata.release.channel).toBe('production');
    expect(metadata.release.branch).toBe('main');
    if (RELEASE_COMMIT) expect(metadata.release.commit).toBe(RELEASE_COMMIT);

    if (metadata.content?.manifestPath) {
      const resourceManifest = await page.request.get(new URL(metadata.content.manifestPath, RELEASE_URL!).href);
      expect(resourceManifest.ok()).toBe(true);
    }

    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker?.getRegistration();
      return Boolean(registration?.active);
    });

    await page.context().setOffline(true);
    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('#canvas-host canvas')).toBeVisible();
    } finally {
      await page.context().setOffline(false);
    }

    expect(failures.pageErrors).toEqual([]);
  });
});

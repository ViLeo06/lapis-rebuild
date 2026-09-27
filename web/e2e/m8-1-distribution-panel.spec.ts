import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  renderDistributionPanelMarkup,
  type DistributionSnapshot,
} from '../src/ui/distribution-panel-model.ts';

const panelCss = readFileSync(new URL('../src/ui/distribution-panel.css', import.meta.url), 'utf8');

async function mountPanel(page: Page, snapshot: DistributionSnapshot) {
  const markup = renderDistributionPanelMarkup(snapshot);
  await page.setContent(
    '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
    '<style>html,body{margin:0;width:100%;height:100%;background:#0d1412}' + panelCss + '</style></head><body>' +
    '<div class="lapis-distribution-layer" data-test-layer>' + markup + '</div></body></html>',
  );
}

async function expectNoViewportOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    layer: (() => {
      const node = document.querySelector<HTMLElement>('[data-test-layer]');
      if (!node) return null;
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    })(),
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth + 1);
  expect(metrics.layer).not.toBeNull();
  if (metrics.layer) {
    expect(metrics.layer.left).toBeGreaterThanOrEqual(-1);
    expect(metrics.layer.right).toBeLessThanOrEqual(metrics.innerWidth + 1);
    expect(metrics.layer.top).toBeGreaterThanOrEqual(-1);
    expect(metrics.layer.bottom).toBeLessThanOrEqual(metrics.innerHeight + 1);
  }
}

test('first-run, installed, update, repair and error views expose the expected player actions', async ({ page }) => {
  await mountPanel(page, { state: 'NO_PACK' });
  await expect(page.getByRole('button', { name: '下载完整资源' })).toBeVisible();
  await expect(page.getByRole('button', { name: '导入完整资源包' })).toBeVisible();
  await expect(page.getByText(/Manifest|SHA-256|IndexedDB/)).toHaveCount(0);

  await mountPanel(page, { state: 'READY', installedVersion: 'v1' });
  await expect(page.getByRole('button', { name: '进入游戏' })).toBeVisible();
  await expect(page.getByRole('button', { name: '检查更新' })).toBeVisible();

  await mountPanel(page, { state: 'UPDATE_AVAILABLE', installedVersion: 'v1', targetVersion: 'v2' });
  await expect(page.getByRole('button', { name: '立即更新' })).toBeVisible();
  await expect(page.getByText(/只更新变化/)).toBeVisible();

  await mountPanel(page, { state: 'REPAIR_REQUIRED', installedVersion: 'v1' });
  await expect(page.getByRole('button', { name: '修复资源' })).toBeVisible();

  await mountPanel(page, { state: 'ERROR', message: '网络连接中断' });
  await expect(page.getByRole('alert')).toContainText('网络连接中断');
});

test('download view exposes percentage, byte totals and current step', async ({ page }) => {
  await mountPanel(page, {
    state: 'DOWNLOADING',
    progress: {
      downloadedBytes: 25 * 1024 * 1024,
      totalBytes: 100 * 1024 * 1024,
      status: '下载资源',
      currentAsset: 'characters/wizard-01.bin',
    },
  });
  const progress = page.getByRole('progressbar', { name: '资源下载进度' });
  await expect(progress).toHaveAttribute('aria-valuenow', '25');
  await expect(page.getByText('25%')).toBeVisible();
  await expect(page.getByText('已完成 25 MB')).toBeVisible();
  await expect(page.getByText('总计 100 MB')).toBeVisible();
  await expect(page.getByText('下载资源')).toBeVisible();
});

test.describe('mobile distribution UX', () => {
  test.use({
    viewport: { width: 915, height: 412 },
    hasTouch: true,
    isMobile: true,
  });

  test('915x412 and 412x915 fit, accept touch, and keep native keyboard focus', async ({ page }) => {
    await mountPanel(page, { state: 'NO_PACK' });
    await expectNoViewportOverflow(page);

    const download = page.getByRole('button', { name: '下载完整资源' });
    const buttonBox = await download.boundingBox();
    expect(buttonBox).not.toBeNull();
    if (buttonBox) expect(buttonBox.height).toBeGreaterThanOrEqual(44);

    await page.evaluate(() => {
      (window as any).__distributionPointerType = '';
      document.querySelector('[data-action="downloadFullPack"]')?.addEventListener('pointerdown', (event) => {
        (window as any).__distributionPointerType = (event as PointerEvent).pointerType;
      }, { once: true });
    });
    if (buttonBox) {
      await page.touchscreen.tap(buttonBox.x + buttonBox.width / 2, buttonBox.y + buttonBox.height / 2);
    }
    await expect.poll(() => page.evaluate(() => (window as any).__distributionPointerType)).toBe('touch');

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('Tab');
    await expect(download).toBeFocused();

    await page.setViewportSize({ width: 412, height: 915 });
    await expectNoViewportOverflow(page);
    await expect(download).toBeVisible();
  });
});

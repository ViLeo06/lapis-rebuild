import test from 'node:test';
import assert from 'node:assert/strict';
import {
  distributionProgressPercent,
  formatDistributionBytes,
  getDistributionViewModel,
  renderDistributionPanelMarkup,
  type DistributionSnapshot,
  type DistributionState,
} from '../src/ui/distribution-panel-model.ts';

test('first run offers full download and local pack import without developer terminology', () => {
  const view = getDistributionViewModel({ state: 'NO_PACK' });
  assert.deepEqual(view.actions, ['downloadFullPack', 'importFullPack']);
  const html = renderDistributionPanelMarkup({ state: 'NO_PACK' });
  assert.match(html, /下载完整资源/);
  assert.match(html, /导入完整资源包/);
  assert.doesNotMatch(html, /Manifest|SHA-256|IndexedDB/);
});

test('installed and offline-ready states keep a direct enter-game path', () => {
  assert.deepEqual(
    getDistributionViewModel({ state: 'READY', installedVersion: 'v1' }).actions,
    ['enterGame', 'checkUpdate', 'repair'],
  );
  assert.deepEqual(
    getDistributionViewModel({ state: 'OFFLINE_READY', installedVersion: 'v1' }).actions,
    ['enterGame', 'repair'],
  );
});

test('update available exposes incremental update wording rather than another full-pack download', () => {
  const snapshot: DistributionSnapshot = {
    state: 'UPDATE_AVAILABLE',
    installedVersion: 'v1',
    targetVersion: 'v2',
  };
  const view = getDistributionViewModel(snapshot);
  assert.deepEqual(view.actions, ['applyUpdate', 'enterGame', 'repair']);
  assert.match(view.summary, /只更新变化/);
  assert.doesNotMatch(renderDistributionPanelMarkup(snapshot), /下载完整资源/);
});

test('download progress clamps percentage and formats current/total bytes', () => {
  const snapshot: DistributionSnapshot = {
    state: 'DOWNLOADING',
    progress: {
      downloadedBytes: 5 * 1024 * 1024,
      totalBytes: 20 * 1024 * 1024,
      currentAsset: 'maps/training-01.bin',
      status: '下载资源',
    },
  };
  const view = getDistributionViewModel(snapshot);
  assert.equal(view.percent, 25);
  assert.equal(view.downloadedText, '5 MB');
  assert.equal(view.totalText, '20 MB');
  const html = renderDistributionPanelMarkup(snapshot);
  assert.match(html, /aria-valuenow="25"/);
  assert.match(html, /当前文件：maps\/training-01\.bin/);
  assert.equal(distributionProgressPercent({ downloadedBytes: 30, totalBytes: 20 }), 100);
  assert.equal(distributionProgressPercent({ downloadedBytes: -1, totalBytes: 20 }), 0);
  assert.equal(formatDistributionBytes(1536), '1.5 KB');
});

test('repair and error states expose safe recovery paths', () => {
  assert.deepEqual(
    getDistributionViewModel({ state: 'REPAIR_REQUIRED', installedVersion: 'v1' }).actions,
    ['repair', 'checkUpdate'],
  );
  const installedError = getDistributionViewModel({
    state: 'ERROR',
    installedVersion: 'v1',
    progress: { failure: '网络连接中断' },
  });
  assert.deepEqual(installedError.actions, ['enterGame', 'checkUpdate', 'repair']);
  assert.equal(installedError.errorText, '网络连接中断');

  const firstRunError = getDistributionViewModel({ state: 'ERROR', message: '资源包无法读取' });
  assert.deepEqual(firstRunError.actions, ['downloadFullPack', 'importFullPack']);
});

test('all required distribution states render a stable player-facing state label', () => {
  const states: DistributionState[] = [
    'NO_PACK',
    'CHECKING',
    'DOWNLOADING',
    'VERIFYING',
    'INSTALLING',
    'READY',
    'UPDATE_AVAILABLE',
    'REPAIR_REQUIRED',
    'ERROR',
    'OFFLINE_READY',
  ];
  for (const state of states) {
    const html = renderDistributionPanelMarkup({ state });
    assert.match(html, new RegExp('data-state="' + state + '"'));
    assert.match(html, /aria-labelledby="lapis-distribution-title"/);
  }
});

test('dynamic status text is HTML escaped', () => {
  const html = renderDistributionPanelMarkup({
    state: 'ERROR',
    message: '<img src=x onerror=alert(1)>',
    progress: { currentAsset: '<script>bad()</script>' },
  });
  assert.doesNotMatch(html, /<img|<script/);
  assert.match(html, /&lt;img/);
});

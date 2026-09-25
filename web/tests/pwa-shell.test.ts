import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path: string) => readFile(new URL(path, import.meta.url), 'utf8');

test('web app manifest defines an installable standalone shell', async () => {
  const manifest = JSON.parse(await read('../public/manifest.webmanifest'));
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'any');
  assert.ok(manifest.icons.some((icon: { sizes?: string }) => icon.sizes === 'any'));
});

test('service worker caches only explicit app-shell paths and build assets', async () => {
  const source = await read('../public/service-worker.js');
  assert.match(source, /lapis-app-shell-v1/);
  assert.match(source, /\.\/assets\//);
  assert.match(source, /request\.mode === 'navigate'/);
  assert.match(source, /precacheBuiltAssets/);
  assert.match(source, /cache\.addAll/);
  assert.doesNotMatch(source, /game-data/);
  assert.doesNotMatch(source, /skipWaiting/);
});

test('PWA registration is production-only and never forces a refresh', async () => {
  const source = await read('../src/pwa-shell.ts');
  assert.match(source, /import\.meta\.env\.PROD/);
  assert.match(source, /serviceWorker\.register/);
  assert.doesNotMatch(source, /location\.reload/);
});

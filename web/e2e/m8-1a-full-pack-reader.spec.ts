import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {syntheticManifest, syntheticMembers, zipFixture} from '../tests/fixtures/full-pack-fixture.ts';

test.use({serviceWorkers: 'block'});
// Isolated module test, not W5's final installation/offline/gameplay acceptance.
// Serve the real TS module through test-only routes; no production hook or shared entrypoint edits.
test('M8.1 W1 browser Blob reader verifies and rejects corruption', async ({page}) => {
  await page.route('**/__w1-full-pack/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/harness.html')) {
      await route.fulfill({contentType: 'text/html', body: '<!doctype html><title>Full Pack module test</title>'}); return;
    }
    const source = path.endsWith('/distribution/full-pack.ts') ? '../src/distribution/full-pack.ts' : '../src/resource-manifest.ts';
    const output = ts.transpileModule(readFileSync(new URL(source, import.meta.url), 'utf8'), {
      compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022},
    }).outputText;
    await route.fulfill({contentType: 'text/javascript', body: output});
  });
  await page.goto('/__w1-full-pack/harness.html');
  const blob = zipFixture(syntheticMembers()), bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
  const result = await page.evaluate(async ({bytes, manifest}) => {
    const moduleUrl = '/__w1-full-pack/distribution/full-pack.ts';
    const {verifyFullPack} = await import(/* @vite-ignore */ moduleUrl);
    const data = new Uint8Array(bytes);
    const verified = await verifyFullPack(new Blob([data]), {expectedManifest: manifest});
    const text = await verified.getAsset('text/readme.txt').text();
    const v = new DataView(data.buffer);
    data[v.getUint32(data.length - 6, true) - 1] ^= 1;
    let corruption = 'ACCEPTED';
    try {await verifyFullPack(new Blob([data]));} catch (error) {corruption = (error as {code: string}).code;}
    return {assets: verified.manifest.assets.length, text, corruption};
  }, {bytes, manifest: syntheticManifest()});
  expect(result.assets).toBe(2);
  expect(result.text).toContain('Synthetic test data only');
  expect(result.corruption).toBe('CRC_MISMATCH');
});

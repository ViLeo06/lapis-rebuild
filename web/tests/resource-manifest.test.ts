import assert from 'node:assert/strict';
import {mkdtemp, mkdir, rm, unlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {generateResourceManifest, verifyResourceManifest} from '../scripts/resource-manifest.ts';
import {hasResourceContent, validateResourceManifest} from '../src/resource-manifest.ts';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'lapis-resource-manifest-'));
  await mkdir(join(root, 'maps'), {recursive: true});
  await writeFile(join(root, 'prototype.json'), '{"schema":1}\n');
  await writeFile(join(root, 'maps', 'map-0000.png'), Buffer.from([137, 80, 78, 71]));
  return root;
}

test('resource manifest generation is deterministic and verifies valid files', async () => {
  const root = await fixture();
  try {
    const first = await generateResourceManifest({root, contentPack: 'synthetic-ci', version: 'm8-test-1'});
    const second = await generateResourceManifest({root, contentPack: 'synthetic-ci', version: 'm8-test-1'});
    assert.deepEqual(second, first);
    assert.equal(first.schema, 1);
    assert.deepEqual(first.assets.map(asset => asset.path), ['maps/map-0000.png', 'prototype.json']);
    assert.equal(first.assets[0].mediaType, 'image/png');
    assert.equal(first.assets[1].mediaType, 'application/json');
    assert.ok(hasResourceContent(first, first.assets[0].sha256, first.assets[0].size));
    assert.deepEqual(await verifyResourceManifest(root, first), []);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('resource manifest verifier reports a missing file', async () => {
  const root = await fixture();
  try {
    const manifest = await generateResourceManifest({root, contentPack: 'synthetic-ci', version: 'm8-test-1'});
    await unlink(join(root, 'prototype.json'));
    const issues = await verifyResourceManifest(root, manifest);
    assert.ok(issues.some(issue => issue.code === 'MISSING_FILE' && issue.path === 'prototype.json'));
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('resource manifest verifier reports a SHA-256 mismatch', async () => {
  const root = await fixture();
  try {
    const manifest = await generateResourceManifest({root, contentPack: 'synthetic-ci', version: 'm8-test-1'});
    await writeFile(join(root, 'prototype.json'), '{"schema":2}\n');
    const issues = await verifyResourceManifest(root, manifest);
    assert.ok(issues.some(issue => issue.code === 'HASH_MISMATCH' && issue.path === 'prototype.json'));
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('resource manifest validation rejects duplicate assetId values', async () => {
  const root = await fixture();
  try {
    const manifest = await generateResourceManifest({root, contentPack: 'synthetic-ci', version: 'm8-test-1'});
    const duplicate = structuredClone(manifest);
    duplicate.assets[1].assetId = duplicate.assets[0].assetId;
    assert.throws(() => validateResourceManifest(duplicate), /Duplicate assetId/);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {auditReleaseRoot} from '../scripts/release-sanity.ts';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'lapis-release-sanity-'));
  const dist = join(root, 'dist');
  await mkdir(dist, {recursive: true});
  await writeFile(join(dist, 'release-metadata.json'), '{"schema":1,"release":{"channel":"ci","commit":null,"branch":null,"url":null},"content":null}\n');
  const policy = join(root, 'release-public-assets.json');
  await writeFile(policy, '{"schema":1,"publicSafeFullPacks":[]}\n');
  return {root, dist, policy};
}

test('release sanity accepts a public build with no Full Pack', async () => {
  const {dist, policy} = await fixture();
  assert.deepEqual(await auditReleaseRoot(dist, policy), []);
});

test('release sanity rejects unlisted Full Packs and raw original formats', async () => {
  const {dist, policy} = await fixture();
  await writeFile(join(dist, 'unexpected.lapispak'), 'not-public');
  await writeFile(join(dist, 'client.spr'), 'raw-original');
  const issues = await auditReleaseRoot(dist, policy);
  assert.ok(issues.some(issue => issue.code === 'UNLISTED_FULL_PACK'));
  assert.ok(issues.some(issue => issue.code === 'FORBIDDEN_EXTENSION'));
});

test('release sanity binds public incremental assets to the allowlisted manifest', async () => {
  const {root, dist} = await fixture();
  const packDir = join(dist, 'distribution', 'packs');
  const manifestDir = join(dist, 'distribution', 'manifests', 'demo', 'v1');
  const assetDir = join(dist, 'distribution', 'assets', 'demo', 'v1', 'maps');
  await mkdir(packDir, {recursive: true});
  await mkdir(manifestDir, {recursive: true});
  await mkdir(assetDir, {recursive: true});

  const body = '{"synthetic":true}\n';
  const bytes = Buffer.from(body);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  await writeFile(join(packDir, 'lapis-full-demo-v1.lapispak'), 'synthetic');
  await writeFile(join(assetDir, 'demo.json'), bytes);
  await writeFile(
    join(manifestDir, 'resource-manifest.json'),
    JSON.stringify({
      schema:1,
      contentPack:'demo',
      version:'v1',
      assets:[{
        assetId:'maps/demo.json',
        path:'maps/demo.json',
        contentPack:'demo',
        size:bytes.byteLength,
        sha256,
        mediaType:'application/json',
        version:'v1',
      }],
    }) + '\n',
  );

  const policy = join(root, 'release-public-assets.json');
  await writeFile(
    policy,
    JSON.stringify({
      schema:1,
      publicSafeFullPacks:[{
        path:'distribution/packs/lapis-full-demo-v1.lapispak',
        contentPack:'demo',
        version:'v1',
        manifestPath:'distribution/manifests/demo/v1/resource-manifest.json',
      }],
    }) + '\n',
  );

  assert.deepEqual(await auditReleaseRoot(dist, policy), []);

  await writeFile(join(assetDir, 'unexpected.bin'), 'not-in-manifest');
  const issues = await auditReleaseRoot(dist, policy);
  assert.ok(issues.some(issue => issue.code === 'UNLISTED_INCREMENTAL_ASSET'));
});

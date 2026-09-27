import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink} from 'node:fs/promises';
import {openAsBlob} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildFullPack, fullPackCli} from '../scripts/full-pack.ts';
import {canonicalFullPackManifest, fullPackFileName, fullPackCrc32, fullPackSha256, verifyFullPack,
  FULL_PACK_LIMITS, FullPackError, type FullPackErrorCode} from '../src/distribution/full-pack.ts';
import {syntheticManifest, syntheticMembers, SYNTHETIC_FILES, zipFixture, mutateZip} from './fixtures/full-pack-fixture.ts';

const rejects = (blob: Blob | Promise<Blob>, code: FullPackErrorCode) =>
  assert.rejects(async () => verifyFullPack(await blob), (error: unknown) => error instanceof FullPackError && error.code === code);

test('valid synthetic Full Pack verifies every member before exposing immutable resources', async () => {
  const progress: unknown[] = [], manifest = syntheticManifest();
  const pack = await verifyFullPack(zipFixture(syntheticMembers()), {expectedManifest: manifest,
    expectedContentPack: manifest.contentPack, expectedVersion: '1', onProgress: value => progress.push(value)});
  assert.deepEqual(pack.manifest, manifest);
  for (const [path, content] of Object.entries(SYNTHETIC_FILES)) assert.equal(await pack.getAsset(path).text(), content);
  assert.equal(pack.getAsset('maps/demo.json').type, 'application/json');
  assert.throws(() => pack.getAsset('missing.txt'), /Unknown asset/);
  assert.equal(Object.isFrozen(pack.manifest.assets[0]), true);
  assert.equal(Object.isFrozen(pack.manifest.assets), true);
  assert.equal(Object.isFrozen(pack.manifest), true);
  assert.equal(Object.isFrozen(manifest), false);
  const last = progress.at(-1) as {status: string; totalBytes: number; verifiedBytes: number};
  assert.equal(last.status, 'VERIFIED'); assert.equal(last.verifiedBytes, last.totalBytes);
});

test('canonical manifest and filename do not depend on input key/asset order', () => {
  const m = syntheticManifest();
  const reordered = {assets: [...m.assets].reverse(), version: m.version, contentPack: m.contentPack, schema: m.schema};
  assert.equal(canonicalFullPackManifest(m), canonicalFullPackManifest(reordered));
  assert.equal(fullPackFileName(m), 'lapis-full-synthetic-safe-1.lapispak');
});

test('known CRC32 and SHA-256 vectors, including a typed-array subview', async () => {
  assert.equal(fullPackCrc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.equal(fullPackCrc32(new Uint8Array()), 0);
  assert.equal(await fullPackSha256(new TextEncoder().encode('!abc!').subarray(1, 4)),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('external contentPack/version and pinned manifest mismatch reject', async () => {
  const blob = zipFixture(syntheticMembers());
  for (const [options, code] of [
    [{expectedContentPack: 'other'}, 'CONTENT_PACK_MISMATCH'],
    [{expectedVersion: '2'}, 'VERSION_MISMATCH'],
    [{expectedManifest: syntheticManifest(SYNTHETIC_FILES, '2')}, 'MANIFEST_MISMATCH'],
  ] as const) await assert.rejects(verifyFullPack(blob, options), (e: unknown) => e instanceof FullPackError && e.code === code);
});

test('missing, extra, reordered and duplicate ZIP members reject', async () => {
  const members = syntheticMembers();
  await rejects(zipFixture(members.slice(0, 2)), 'MISSING_ASSET');
  await rejects(zipFixture([...members, {name: 'extra.txt', data: 'x'}]), 'UNEXPECTED_ASSET');
  await rejects(zipFixture([members[0], members[2], members[1]]), 'INVALID_ZIP');
  await rejects(zipFixture([...members, members[1]]), 'DUPLICATE_ENTRY');
  await rejects(zipFixture([...members, {...members[1], name: 'MAPS/demo.json'}]), 'DUPLICATE_ENTRY');
  await rejects(zipFixture(members.slice(1)), 'MISSING_ASSET');
});

for (const path of ['../escape', '/absolute', 'a/../../b', 'a\\b', 'a//b', 'a/./b', 'C:/escape',
  'a/%2e%2e/b', 'a?query', 'a#fragment', 'a\u0000b', 'a ', 'a.', 'NUL.txt', 'a/COM1.dat', 'a\nfile']) {
  test(`unsafe archive/manifest path rejects: ${JSON.stringify(path)}`, async () => {
    const members = syntheticMembers(); members[1] = {...members[1], name: path};
    // Python zipfile truncates NUL names; the local-vs-expected manifest check still rejects it.
    if (path.includes('\u0000')) await assert.rejects(verifyFullPack(zipFixture(members)));
    else await rejects(zipFixture(members), 'INVALID_PATH');
    const m = syntheticManifest(); m.assets[0].path = path;
    assert.throws(() => canonicalFullPackManifest(m), FullPackError);
  });
}

test('reserved root manifest and file/directory aliases reject', () => {
  for (const path of ['resource-manifest.json', 'RESOURCE-MANIFEST.JSON', 'resource-manifest.json/child']) {
    const m = syntheticManifest(); m.assets[0].path = path;
    assert.throws(() => canonicalFullPackManifest(m), FullPackError);
  }
  const m = syntheticManifest(); m.assets[1].path = 'maps';
  assert.throws(() => canonicalFullPackManifest(m), /collision/);
});

test('schema authority rejects duplicate IDs/paths and per-entry version/contentPack mismatch', async () => {
  const mutations = [
    (m: ReturnType<typeof syntheticManifest>) => {m.assets[1].assetId = m.assets[0].assetId;},
    (m: ReturnType<typeof syntheticManifest>) => {m.assets[1].path = m.assets[0].path;},
    (m: ReturnType<typeof syntheticManifest>) => {m.assets[0].version = 'bad';},
    (m: ReturnType<typeof syntheticManifest>) => {m.assets[0].contentPack = 'bad';},
    (m: ReturnType<typeof syntheticManifest>) => {m.assets[0].size = -1;},
    (m: ReturnType<typeof syntheticManifest>) => {m.assets[0].sha256 = 'not-a-hash';},
  ];
  for (const mutation of mutations) {
    const m = syntheticManifest(); mutation(m);
    const members = syntheticMembers(); members[0].data = JSON.stringify(m) + '\n';
    await rejects(zipFixture(members), 'INVALID_MANIFEST');
  }
});

test('noncanonical/duplicate-key JSON and unsupported schema reject', async () => {
  const members = syntheticMembers();
  for (const data of [members[0].data.trim(), members[0].data.replace('{', '{"schema":1,'),
    members[0].data.replace('"schema":1', '"schema":2'), '{bad json']) {
    await rejects(zipFixture([{...members[0], data}, ...members.slice(1)]), 'INVALID_MANIFEST');
  }
});

test('wrong asset size and hash reject even with internally valid ZIP CRC', async () => {
  let m = syntheticManifest(); m.assets[0].size++;
  await rejects(zipFixture(syntheticMembers(m)), 'SIZE_MISMATCH');
  m = syntheticManifest(); m.assets[0].sha256 = '0'.repeat(64);
  await rejects(zipFixture(syntheticMembers(m)), 'HASH_MISMATCH');
  const members = syntheticMembers(); members[1].data = members[1].data.replace('true', 'fals');
  await rejects(zipFixture(members), 'HASH_MISMATCH');
});

test('payload corruption, truncation, appended garbage and forged central bounds reject', async () => {
  const blob = zipFixture(syntheticMembers());
  await rejects(mutateZip(blob, (bytes, _v, cd) => {bytes[cd - 1] ^= 1;}), 'CRC_MISMATCH');
  await rejects(blob.slice(0, blob.size - 1), 'INVALID_ZIP');
  await rejects(new Blob([blob, 'garbage']), 'INVALID_ZIP');
  await rejects(mutateZip(blob, (_b, v) => {v.setUint32(v.byteLength - 6, 0xffffffff, true);}), 'INVALID_ZIP');
  await rejects(mutateZip(blob, (_b, v, cd) => {v.setUint32(cd + 42, 1, true);}), 'INVALID_ZIP');
  await rejects(mutateZip(blob, (bytes) => {bytes[30] ^= 1;}), 'INVALID_ZIP');
});

test('deflate, symlink, directory attributes, encryption and ZIP64 are explicitly unsupported', async () => {
  const members = syntheticMembers();
  await rejects(zipFixture([{...members[0], method: 8}, ...members.slice(1)]), 'UNSUPPORTED_ZIP');
  await rejects(zipFixture([members[0], {...members[1], attributes: (0o120777 << 16) >>> 0}, members[2]]), 'UNSUPPORTED_ZIP');
  await rejects(zipFixture([members[0], {...members[1], attributes: 0x10}, members[2]]), 'UNSUPPORTED_ZIP');
  const blob = zipFixture(members);
  await rejects(mutateZip(blob, (_b, v, cd) => {v.setUint16(cd + 8, 1, true);}), 'UNSUPPORTED_ZIP');
  await rejects(mutateZip(blob, (_b, v) => {v.setUint16(v.byteLength - 12, 0xffff, true);}), 'UNSUPPORTED_ZIP');
});

test('bounds reject before reading oversized archives or allocating claimed member sizes', async () => {
  class OversizeBlob extends Blob {
    get size() {return FULL_PACK_LIMITS.maxArchiveBytes + 1;}
    slice(): Blob {throw new Error('Must not read oversized archive');}
  }
  await rejects(new OversizeBlob(), 'LIMIT_EXCEEDED');
  await rejects(mutateZip(zipFixture(syntheticMembers()), (_b, v, cd) => {
    v.setUint32(cd + 20, FULL_PACK_LIMITS.maxAssetBytes + 1, true);
    v.setUint32(cd + 24, FULL_PACK_LIMITS.maxAssetBytes + 1, true);
  }), 'LIMIT_EXCEEDED');
  const m = syntheticManifest(); m.assets[0].size = FULL_PACK_LIMITS.maxAssetBytes + 1;
  assert.throws(() => canonicalFullPackManifest(m), /large/);
});

test('valid UTF-8 paths and zero-length resources roundtrip', async () => {
  const files = {'data/\u5730\u56fe.txt': 'synthetic', 'empty.txt': ''};
  const pack = await verifyFullPack(zipFixture(syntheticMembers(syntheticManifest(files), files)));
  assert.equal(await pack.getAsset('data/\u5730\u56fe.txt').text(), 'synthetic');
  assert.equal(pack.getAsset('empty.txt').size, 0);
});

test('reader never arrayBuffers the whole input Blob; abort exposes no verified result', async () => {
  class SlicedBlob extends Blob { async arrayBuffer(): Promise<ArrayBuffer> {throw new Error('Whole pack read forbidden');} }
  const blob = new SlicedBlob([zipFixture(syntheticMembers())]);
  await verifyFullPack(blob);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(verifyFullPack(blob, {signal: controller.signal}), /abort/i);
  const mid = new AbortController();
  await assert.rejects(verifyFullPack(blob, {signal: mid.signal, onProgress: () => mid.abort()}), /abort/i);
});

test('production builder: deterministic roundtrip, standard zip interoperability and no overwrite', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'lapis-w1-'));
  try {
    const root = resolve(dir, 'assets'), manifest = syntheticManifest(), name = fullPackFileName(manifest);
    for (const [path, content] of Object.entries(SYNTHETIC_FILES)) {
      await mkdir(dirname(resolve(root, path)), {recursive: true}); await writeFile(resolve(root, path), content);
    }
    const first = await buildFullPack({root, manifest, output: resolve(dir, 'one', name), visibility: 'public-safe'});
    const second = await buildFullPack({root, manifest: {...manifest, assets: [...manifest.assets].reverse()},
      output: resolve(dir, 'two', name), visibility: 'private-original'});
    assert.equal(first.sha256, second.sha256);
    assert.deepEqual(await readFile(first.output), await readFile(second.output));
    const pack = await verifyFullPack(await openAsBlob(first.output), {expectedManifest: manifest});
    assert.equal(pack.manifest.assets.length, 2);
    const standardReader = execFileSync('python3', ['-S', '-c',
      'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; print(len(z.namelist()))', first.output], {encoding: 'utf8'});
    assert.equal(standardReader.trim(), '3');
    await assert.rejects(buildFullPack({root, manifest, output: first.output, visibility: 'public-safe'}), /overwrite/);
    assert.deepEqual(await readFile(first.output), await readFile(second.output));
    assert.deepEqual((await readdir(dirname(first.output))).filter(f => f.startsWith('.lapis-pack-')), []);
    // Source failure never creates a final pack or leaves staging debris.
    await writeFile(resolve(root, manifest.assets[0].path), 'bad');
    const failureDir = resolve(dir, 'failure');
    await assert.rejects(buildFullPack({root, manifest, output: resolve(failureDir, name), visibility: 'public-safe'}), /SIZE_MISMATCH/);
    assert.deepEqual(await readdir(failureDir), []);
    // A source symlink is refused even if it points to valid bytes inside the root.
    await rm(resolve(root, manifest.assets[0].path));
    await writeFile(resolve(root, 'real.txt'), SYNTHETIC_FILES['maps/demo.json']);
    await symlink(resolve(root, 'real.txt'), resolve(root, manifest.assets[0].path));
    await assert.rejects(buildFullPack({root, manifest, output: resolve(failureDir, name), visibility: 'public-safe'}), /Symlink/);
    // A FIFO must reject before opening/reading, rather than hang the build.
    await rm(resolve(root, manifest.assets[0].path));
    execFileSync('python3', ['-S', '-c', 'import os,sys; os.mkfifo(sys.argv[1])', resolve(root, manifest.assets[0].path)]);
    await assert.rejects(buildFullPack({root, manifest, output: resolve(failureDir, name), visibility: 'public-safe'}), /Not a regular file/);
    assert.deepEqual(await readdir(failureDir), []);
    // Explicit policy guards, including public-safe (publication belongs to W4).
    const publicOutput = fileURLToPath(new URL(`../public/${name}`, import.meta.url));
    await assert.rejects(buildFullPack({root, manifest, output: publicOutput, visibility: 'public-safe'}), /publication/);
    await assert.rejects(buildFullPack({root, manifest, output: resolve(dir, 'wrong.lapispak'), visibility: 'public-safe'}), /name/);
    await assert.rejects(buildFullPack({root, manifest, output: resolve(dir, name), visibility: 'unknown' as 'public-safe'}), /visibility/);
    await assert.rejects(buildFullPack({root, manifest, output: resolve(dir, name), visibility: 'private-original', expectedVersion: '2'}), /VERSION_MISMATCH/);
  } finally {await rm(dir, {recursive: true, force: true});}
});

test('CLI rejects missing, unknown and duplicate flags', async () => {
  for (const args of [['verify'], ['verify', '--bad', '1'], ['verify', '--version', '1', '--version', '2']]) {
    await assert.rejects(fullPackCli(args));
  }
});

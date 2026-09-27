import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

type Entry = {
  assetId: string;
  path: string;
  contentPack: string;
  size: number;
  sha256: string;
  mediaType: string;
  version: string;
};

type Manifest = {
  schema: 1;
  contentPack: string;
  version: string;
  assets: Entry[];
};

type Installed = {
  contentPack: string;
  version: string;
  manifest: Manifest;
  installedAt: string;
  updatedAt: string;
  lastOperation: 'install' | 'update' | 'repair';
  assetCount: number;
  totalBytes: number;
};

type EngineModule = {
  updateAssets(options: Record<string, unknown>): Promise<any>;
  repairAssets(options: Record<string, unknown>): Promise<any>;
};

const engineUrl = new URL('../src/distribution/update-engine.ts', import.meta.url);
const engineAvailable = existsSync(fileURLToPath(engineUrl));
const fixedTime = '2026-09-27T00:00:00.000Z';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function blob(content: string): Blob {
  return new Blob([content], { type: 'application/octet-stream' });
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function entry(pathIndex: number, version: string, content: string): Entry {
  const value = blob(content);
  return {
    assetId: `asset-${pathIndex}`,
    path: `assets/asset-${String(pathIndex).padStart(3, '0')}.bin`,
    contentPack: 'm81-acceptance',
    size: value.size,
    sha256: sha256(content),
    mediaType: 'application/octet-stream',
    version,
  };
}

function fixtureV1(): { manifest: Manifest; contents: Map<string, string> } {
  const contents = new Map<string, string>();
  const assets: Entry[] = [];
  for (let index = 0; index < 100; index += 1) {
    const content = `v1:${String(index).padStart(3, '0')}`;
    const item = entry(index, 'v1', content);
    assets.push(item);
    contents.set(item.path, content);
  }
  return {
    manifest: { schema: 1, contentPack: 'm81-acceptance', version: 'v1', assets },
    contents,
  };
}

function fixtureV2(v1: ReturnType<typeof fixtureV1>): { manifest: Manifest; contents: Map<string, string> } {
  const contents = new Map<string, string>();
  const assets: Entry[] = [];

  for (let index = 0; index < 95; index += 1) {
    const previous = v1.manifest.assets[index];
    assets.push({ ...previous, version: 'v2' });
    contents.set(previous.path, v1.contents.get(previous.path)!);
  }

  for (let index = 95; index < 98; index += 1) {
    const content = `v2:${String(index).padStart(3, '0')}`;
    const item = entry(index, 'v2', content);
    assets.push(item);
    contents.set(item.path, content);
  }

  for (let index = 100; index < 102; index += 1) {
    const content = `v2:${String(index).padStart(3, '0')}`;
    const item = entry(index, 'v2', content);
    assets.push(item);
    contents.set(item.path, content);
  }

  return {
    manifest: { schema: 1, contentPack: 'm81-acceptance', version: 'v2', assets },
    contents,
  };
}

class MemoryAssetStore {
  installed: Installed | undefined;
  readonly blobs = new Map<string, { sha256: string; size: number; blob: Blob }>();
  readonly manifests = new Map<string, Manifest>();

  async getInstalled(contentPack: string): Promise<Installed | undefined> {
    return this.installed?.contentPack === contentPack ? clone(this.installed) : undefined;
  }

  async getManifest(contentPack: string, version: string): Promise<Manifest | undefined> {
    const value = this.manifests.get(`${contentPack}@${version}`);
    return value ? clone(value) : undefined;
  }

  async getBlob(hash: string) {
    const value = this.blobs.get(hash);
    return value ? { ...value, blob: value.blob } : undefined;
  }

  async getAsset(contentPack: string, path: string) {
    const installed = await this.getInstalled(contentPack);
    const item = installed?.manifest.assets.find((candidate) => candidate.path === path);
    if (!item) return undefined;
    const stored = await this.getBlob(item.sha256);
    return stored ? { entry: clone(item), blob: stored.blob } : undefined;
  }

  async putBlob(item: Entry, value: Blob): Promise<void> {
    this.blobs.set(item.sha256, { sha256: item.sha256, size: item.size, blob: value });
  }

  async commit(
    manifest: Manifest,
    operation: Installed['lastOperation'],
    committedAt = fixedTime,
  ): Promise<Installed> {
    for (const item of manifest.assets) {
      const stored = this.blobs.get(item.sha256);
      if (!stored || stored.size !== item.size || stored.blob.size !== item.size) {
        throw new Error(`Missing staged asset: ${item.path}`);
      }
    }
    const installedAt = this.installed?.installedAt ?? committedAt;
    this.installed = {
      contentPack: manifest.contentPack,
      version: manifest.version,
      manifest: clone(manifest),
      installedAt,
      updatedAt: committedAt,
      lastOperation: operation,
      assetCount: manifest.assets.length,
      totalBytes: manifest.assets.reduce((sum, item) => sum + item.size, 0),
    };
    this.manifests.set(`${manifest.contentPack}@${manifest.version}`, clone(manifest));
    return clone(this.installed);
  }

  corrupt(hash: string, replacement: Blob): void {
    const record = this.blobs.get(hash);
    assert.ok(record, 'expected staged blob before corruption');
    this.blobs.set(hash, { sha256: hash, size: record.size, blob: replacement });
  }
}

async function loadEngine(): Promise<EngineModule> {
  const moduleUrl = engineUrl.href;
  return await import(moduleUrl) as EngineModule;
}

async function installV1(store: MemoryAssetStore, fixture: ReturnType<typeof fixtureV1>): Promise<void> {
  for (const item of fixture.manifest.assets) {
    await store.putBlob(item, blob(fixture.contents.get(item.path)!));
  }
  await store.commit(fixture.manifest, 'install', fixedTime);
}

test('M8.1 acceptance: V1 to V2 fetches only 3 changed + 2 new assets', { skip: !engineAvailable }, async () => {
  const engine = await loadEngine();
  const v1 = fixtureV1();
  const v2 = fixtureV2(v1);
  const store = new MemoryAssetStore();
  await installV1(store, v1);

  const requests: string[] = [];
  const progress: string[] = [];
  const result = await engine.updateAssets({
    store,
    targetManifest: v2.manifest,
    fetchAsset: async (item: Entry) => {
      requests.push(item.path);
      return blob(v2.contents.get(item.path)!);
    },
    onProgress: (value: { status: string }) => progress.push(value.status),
    committedAt: '2026-09-27T00:01:00.000Z',
  });

  assert.equal(result.diff.unchanged.length, 95);
  assert.equal(result.diff.changed.length, 3);
  assert.equal(result.diff.newAssets.length, 2);
  assert.equal(result.diff.removed.length, 2);
  assert.equal(result.fetchedAssets, 5);
  assert.equal(requests.length, 5);
  assert.deepEqual(
    requests.slice().sort(),
    [...result.diff.changed, ...result.diff.newAssets].map((item: Entry) => item.path).sort(),
  );
  assert.equal((await store.getInstalled('m81-acceptance'))?.version, 'v2');
  assert.ok(progress.includes('checking'));
  assert.ok(progress.includes('downloading'));
  assert.ok(progress.includes('verifying'));
  assert.ok(progress.includes('staging'));
  assert.ok(progress.includes('committing'));
  assert.equal(progress.at(-1), 'complete');
});

test('M8.1 acceptance: failed update preserves installed V1 metadata', { skip: !engineAvailable }, async () => {
  const engine = await loadEngine();
  const v1 = fixtureV1();
  const v2 = fixtureV2(v1);
  const store = new MemoryAssetStore();
  await installV1(store, v1);

  await assert.rejects(
    engine.updateAssets({
      store,
      targetManifest: v2.manifest,
      fetchAsset: async () => {
        throw new Error('synthetic network failure');
      },
      committedAt: '2026-09-27T00:02:00.000Z',
    }),
    /synthetic network failure/,
  );

  const installed = await store.getInstalled('m81-acceptance');
  assert.equal(installed?.version, 'v1');
  assert.equal(installed?.lastOperation, 'install');
});

test('M8.1 acceptance: SHA mismatch rejects update and preserves V1', { skip: !engineAvailable }, async () => {
  const engine = await loadEngine();
  const v1 = fixtureV1();
  const v2 = fixtureV2(v1);
  const store = new MemoryAssetStore();
  await installV1(store, v1);

  await assert.rejects(
    engine.updateAssets({
      store,
      targetManifest: v2.manifest,
      fetchAsset: async () => blob('wrong-content'),
      committedAt: '2026-09-27T00:03:00.000Z',
    }),
    /mismatch/i,
  );

  assert.equal((await store.getInstalled('m81-acceptance'))?.version, 'v1');
});

test('M8.1 acceptance: repairing one corrupt asset fetches exactly one asset', { skip: !engineAvailable }, async () => {
  const engine = await loadEngine();
  const v1 = fixtureV1();
  const store = new MemoryAssetStore();
  await installV1(store, v1);

  const broken = v1.manifest.assets[42];
  const original = v1.contents.get(broken.path)!;
  const replacement = original.replace('v1:', 'xx:');
  assert.equal(blob(replacement).size, broken.size);
  store.corrupt(broken.sha256, blob(replacement));

  const requests: string[] = [];
  const result = await engine.repairAssets({
    store,
    contentPack: 'm81-acceptance',
    fetchAsset: async (item: Entry) => {
      requests.push(item.path);
      return blob(v1.contents.get(item.path)!);
    },
    committedAt: '2026-09-27T00:04:00.000Z',
  });

  assert.equal(result.auditBefore.corrupt.length, 1);
  assert.equal(result.auditBefore.missing.length, 0);
  assert.equal(result.fetchedAssets, 1);
  assert.deepEqual(requests, [broken.path]);
  assert.equal((await store.getInstalled('m81-acceptance'))?.lastOperation, 'repair');
});

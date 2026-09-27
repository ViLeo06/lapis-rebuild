import assert from 'node:assert/strict';
import test from 'node:test';
import {buildReleaseMetadata, publicReleasePath, publicReleaseReference} from '../scripts/release-metadata.ts';

test('release metadata identifies production Pages builds and public content paths', () => {
  const metadata = buildReleaseMetadata({
    CF_PAGES: '1',
    CF_PAGES_BRANCH: 'main',
    CF_PAGES_COMMIT_SHA: 'a'.repeat(40),
    CF_PAGES_URL: 'https://lapis-rebuild.pages.dev',
    LAPIS_PUBLIC_CONTENT_PACK: 'public-demo',
    LAPIS_PUBLIC_CONTENT_VERSION: 'm8-1',
    LAPIS_PUBLIC_MANIFEST_PATH: '/distribution/manifests/public-demo/m8-1/resource-manifest.json',
    LAPIS_PUBLIC_FULL_PACK_PATH: '/distribution/packs/lapis-full-public-demo-m8-1.lapispak',
  });

  assert.equal(metadata.release.channel, 'production');
  assert.equal(metadata.release.commit, 'a'.repeat(40));
  assert.equal(metadata.content?.contentPack, 'public-demo');
  assert.equal(metadata.content?.fullPackPath, '/distribution/packs/lapis-full-public-demo-m8-1.lapispak');
});

test('release metadata is content-neutral when no public pack is configured', () => {
  const metadata = buildReleaseMetadata({
    GITHUB_ACTIONS: 'true',
    GITHUB_HEAD_REF: 'codex/m8-1d-pages-release',
    GITHUB_SHA: 'b'.repeat(40),
  });
  assert.equal(metadata.release.channel, 'ci');
  assert.equal(metadata.content, null);
});

test('release metadata accepts clean HTTPS object-storage references for authorized public resources', () => {
  const manifest = 'https://pub-example.r2.dev/m8-1/resource-manifest.json';
  const pack = 'https://pub-example.r2.dev/m8-1/lapis-full-demo-1.lapispak';
  const metadata = buildReleaseMetadata({
    LAPIS_PUBLIC_CONTENT_PACK: 'demo',
    LAPIS_PUBLIC_CONTENT_VERSION: '1',
    LAPIS_PUBLIC_MANIFEST_PATH: manifest,
    LAPIS_PUBLIC_FULL_PACK_PATH: pack,
  });
  assert.equal(metadata.content?.manifestPath, manifest);
  assert.equal(metadata.content?.fullPackPath, pack);
  assert.equal(publicReleaseReference(pack, 'pack'), pack);
});

test('release metadata rejects private or unsafe public resource references', () => {
  assert.throws(() => publicReleasePath('/game-data/private/resource-manifest.json', 'manifest'), /private game-data/);
  assert.throws(() => publicReleasePath('https://example.com/resource-manifest.json', 'manifest'), /current public origin/);
  assert.throws(() => publicReleaseReference('http://example.com/file.lapispak', 'pack'), /clean HTTPS URL/);
  assert.throws(() => publicReleaseReference('https://user:pass@example.com/file.lapispak', 'pack'), /clean HTTPS URL/);
  assert.throws(() => publicReleaseReference('https://example.com/file.lapispak?token=x', 'pack'), /clean HTTPS URL/);
  assert.throws(() => publicReleaseReference('https://example.com/game-data/private.lapispak', 'pack'), /private game-data/);
});

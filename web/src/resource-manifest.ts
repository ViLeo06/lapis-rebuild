export type ResourceManifestEntry = {
  assetId: string;
  path: string;
  contentPack: string;
  size: number;
  sha256: string;
  mediaType: string;
  version: string;
};

export type ResourceManifest = {
  schema: 1;
  contentPack: string;
  version: string;
  assets: ResourceManifestEntry[];
};

const SHA256 = /^[a-f0-9]{64}$/;
const TOKEN = /^[A-Za-z0-9._-]{1,128}$/;
const MEDIA_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function resourcePath(value: unknown): string {
  assert(typeof value === 'string' && value.length > 0 && value.length <= 512, 'Invalid resource path');
  assert(!value.startsWith('/') && !value.startsWith('./') && !value.includes('\\'), 'Resource path must be relative POSIX');
  const parts = value.split('/');
  assert(parts.every(part => part.length > 0 && part !== '.' && part !== '..'), 'Resource path escapes content pack');
  return value;
}

export function validateResourceManifest(raw: unknown): ResourceManifest {
  assert(object(raw), 'Missing resource manifest');
  assert(raw.schema === 1, 'Unsupported resource manifest schema');
  assert(typeof raw.contentPack === 'string' && TOKEN.test(raw.contentPack), 'Invalid contentPack');
  assert(typeof raw.version === 'string' && TOKEN.test(raw.version), 'Invalid resource manifest version');
  assert(Array.isArray(raw.assets), 'Invalid resource manifest assets');

  const assetIds = new Set<string>();
  const paths = new Set<string>();

  for (const candidate of raw.assets) {
    assert(object(candidate), 'Invalid resource manifest entry');
    assert(typeof candidate.assetId === 'string' && candidate.assetId.length > 0 && candidate.assetId.length <= 256, 'Invalid assetId');
    assert(!assetIds.has(candidate.assetId), `Duplicate assetId: ${candidate.assetId}`);
    assetIds.add(candidate.assetId);

    const path = resourcePath(candidate.path);
    assert(!paths.has(path), `Duplicate resource path: ${path}`);
    paths.add(path);

    assert(candidate.contentPack === raw.contentPack, `Asset contentPack mismatch: ${candidate.assetId}`);
    assert(candidate.version === raw.version, `Asset version mismatch: ${candidate.assetId}`);
    assert(Number.isSafeInteger(candidate.size) && (candidate.size as number) >= 0, `Invalid asset size: ${candidate.assetId}`);
    assert(typeof candidate.sha256 === 'string' && SHA256.test(candidate.sha256), `Invalid asset sha256: ${candidate.assetId}`);
    assert(typeof candidate.mediaType === 'string' && MEDIA_TYPE.test(candidate.mediaType), `Invalid asset mediaType: ${candidate.assetId}`);
  }

  return raw as ResourceManifest;
}

export function findResourceByHash(
  manifest: ResourceManifest,
  sha256: string,
  size?: number,
): ResourceManifestEntry | undefined {
  assert(SHA256.test(sha256), 'Invalid lookup sha256');
  return manifest.assets.find(asset => asset.sha256 === sha256 && (size === undefined || asset.size === size));
}

export function hasResourceContent(manifest: ResourceManifest, sha256: string, size?: number): boolean {
  return findResourceByHash(manifest, sha256, size) !== undefined;
}

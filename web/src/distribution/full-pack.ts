import {resourcePath, validateResourceManifest, type ResourceManifest} from '../resource-manifest.ts';

/** M8.1 strict ZIP32/STORE profile. No extraction, fetch, installation or save writes. */
export const FULL_PACK_MANIFEST_PATH = 'resource-manifest.json';
export const FULL_PACK_LIMITS = Object.freeze({
  maxArchiveBytes: 512 * 1024 * 1024,
  maxAssetBytes: 128 * 1024 * 1024,
  maxManifestBytes: 8 * 1024 * 1024,
  maxEntries: 20000,
});
export type FullPackErrorCode = 'INVALID_PATH' | 'INVALID_MANIFEST' | 'INVALID_ZIP' |
  'UNSUPPORTED_ZIP' | 'LIMIT_EXCEEDED' | 'DUPLICATE_ENTRY' | 'MISSING_ASSET' |
  'UNEXPECTED_ASSET' | 'SIZE_MISMATCH' | 'CRC_MISMATCH' | 'HASH_MISMATCH' |
  'CONTENT_PACK_MISMATCH' | 'VERSION_MISMATCH' | 'MANIFEST_MISMATCH';
export class FullPackError extends Error {
  readonly code: FullPackErrorCode;
  constructor(code: FullPackErrorCode, message: string) {
    super(message); this.name = 'FullPackError'; this.code = code;
  }
}
function check(ok: unknown, code: FullPackErrorCode, message: string): asserts ok {
  if (!ok) throw new FullPackError(code, message);
}
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true});
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** Stricter portable archive/URL path policy; the schema-1 authority is unchanged. */
export function fullPackPath(value: unknown): string {
  let path: string;
  try { path = resourcePath(value); }
  catch { throw new FullPackError('INVALID_PATH', 'Invalid relative resource path'); }
  check(!/[\u0000-\u0020\u007f-\u009f:%?#<>"|*]/u.test(path) && path.normalize('NFC') === path,
    'INVALID_PATH', `Non-portable resource path: ${path}`);
  for (const part of path.split('/')) {
    check(!/[. ]$/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
      'INVALID_PATH', `Reserved resource path: ${path}`);
  }
  return path;
}

/** Fixed key order, code-point-independent UTF-16 lexical path order, no locale/time input. */
export function canonicalFullPackManifest(raw: unknown): string {
  let manifest: ResourceManifest;
  try { manifest = validateResourceManifest(raw); }
  catch (error) { throw new FullPackError('INVALID_MANIFEST', String(error)); }
  check(manifest.assets.length + 1 <= FULL_PACK_LIMITS.maxEntries, 'LIMIT_EXCEEDED', 'Too many assets');
  const aliases = new Set<string>([FULL_PACK_MANIFEST_PATH]);
  const assets = manifest.assets.map(asset => {
    const path = fullPackPath(asset.path);
    const alias = path.toLowerCase();
    check(!aliases.has(alias), 'DUPLICATE_ENTRY', `Reserved or case-colliding path: ${path}`);
    aliases.add(alias);
    check(asset.size <= FULL_PACK_LIMITS.maxAssetBytes, 'LIMIT_EXCEEDED', `Asset too large: ${path}`);
    return {assetId: asset.assetId, path, contentPack: asset.contentPack, size: asset.size,
      sha256: asset.sha256, mediaType: asset.mediaType, version: asset.version};
  }).sort((a, b) => compare(a.path, b.path));
  check(assets.reduce((total, asset) => total + asset.size, 0) <= FULL_PACK_LIMITS.maxArchiveBytes - FULL_PACK_LIMITS.maxManifestBytes,
    'LIMIT_EXCEEDED', 'Total asset size exceeds archive budget');
  for (const asset of assets) {
    const parts = asset.path.toLowerCase().split('/');
    for (let i = 1; i < parts.length; i++) {
      check(!aliases.has(parts.slice(0, i).join('/')), 'INVALID_PATH', 'File/directory path collision');
    }
  }
  const text = JSON.stringify({schema: 1, contentPack: manifest.contentPack, version: manifest.version, assets}) + '\n';
  check(encoder.encode(text).length <= FULL_PACK_LIMITS.maxManifestBytes, 'LIMIT_EXCEEDED', 'Manifest too large');
  return text;
}
export function fullPackFileName(raw: unknown): string {
  const manifest = JSON.parse(canonicalFullPackManifest(raw)) as ResourceManifest;
  return `lapis-full-${manifest.contentPack}-${manifest.version}.lapispak`;
}

const crcTable = Uint32Array.from({length: 256}, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
export function fullPackCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
export async function fullPackSha256(bytes: Uint8Array): Promise<string> {
  // Copy to a plain ArrayBuffer (also handles typed-array views with nonzero offsets).
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
export type FullPackProgress = {
  status: 'VERIFYING' | 'VERIFIED'; totalBytes: number; verifiedBytes: number; currentAsset?: string;
};
export type FullPackOptions = {
  expectedContentPack?: string;
  expectedVersion?: string;
  /** Trusted target manifest, not another value extracted from the same untrusted pack. */
  expectedManifest?: ResourceManifest;
  signal?: AbortSignal;
  onProgress?: (progress: FullPackProgress) => void;
};
export type VerifiedFullPack = {
  readonly manifest: ResourceManifest;
  readonly archiveBytes: number;
  /** Available only after EVERY member has passed validation. Paths, not asset IDs. */
  getAsset(path: string): Blob;
};
type ZipEntry = {path: string; size: number; crc: number; start: number; end: number};
function abort(signal?: AbortSignal) { signal?.throwIfAborted(); }
async function read(blob: Blob, start: number, length: number): Promise<Uint8Array> {
  check(start >= 0 && length >= 0 && start + length <= blob.size, 'INVALID_ZIP', 'Truncated ZIP record');
  return new Uint8Array(await blob.slice(start, start + length).arrayBuffer());
}
function decode(bytes: Uint8Array): string {
  try { return decoder.decode(bytes); }
  catch { throw new FullPackError('INVALID_ZIP', 'Invalid UTF-8'); }
}
function view(bytes: Uint8Array) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }

async function directory(blob: Blob, signal?: AbortSignal): Promise<ZipEntry[]> {
  check(blob.size >= 22, 'INVALID_ZIP', 'Truncated ZIP');
  check(blob.size <= FULL_PACK_LIMITS.maxArchiveBytes, 'LIMIT_EXCEEDED', 'Archive too large');
  const end = view(await read(blob, blob.size - 22, 22));
  check(end.getUint32(0, true) === 0x06054b50 && end.getUint16(20, true) === 0,
    'INVALID_ZIP', 'Missing terminal ZIP record (comments/trailing data not allowed)');
  const count = end.getUint16(10, true);
  check(end.getUint16(4, true) === 0 && end.getUint16(6, true) === 0 &&
    end.getUint16(8, true) === count && count !== 0xffff, 'UNSUPPORTED_ZIP', 'Split/ZIP64 archive not supported');
  check(count > 0 && count <= FULL_PACK_LIMITS.maxEntries, 'LIMIT_EXCEEDED', 'Invalid entry count');
  const cdSize = end.getUint32(12, true), cdStart = end.getUint32(16, true);
  check(cdStart + cdSize === blob.size - 22 && cdSize <= count * (46 + 2048),
    'INVALID_ZIP', 'Invalid central directory bounds');
  const cd = await read(blob, cdStart, cdSize), cv = view(cd);
  const result: ZipEntry[] = [], names = new Set<string>();
  let p = 0, nextLocal = 0;
  for (let index = 0; index < count; index++) {
    abort(signal);
    check(p + 46 <= cd.length && cv.getUint32(p, true) === 0x02014b50, 'INVALID_ZIP', 'Invalid central record');
    const needed = cv.getUint16(p + 6, true), flags = cv.getUint16(p + 8, true);
    const method = cv.getUint16(p + 10, true), crc = cv.getUint32(p + 16, true);
    const packed = cv.getUint32(p + 20, true), size = cv.getUint32(p + 24, true);
    const nameLength = cv.getUint16(p + 28, true), extra = cv.getUint16(p + 30, true);
    const comment = cv.getUint16(p + 32, true), attributes = cv.getUint32(p + 38, true);
    const localOffset = cv.getUint32(p + 42, true);
    check((needed === 10 || needed === 20) && (flags === 0 || flags === 0x800) && method === 0 &&
      extra === 0 && comment === 0 && cv.getUint16(p + 34, true) === 0 && cv.getUint16(p + 36, true) === 0,
      'UNSUPPORTED_ZIP', 'Only ZIP32 STORE without encryption, descriptors or extra fields is supported');
    const fileType = (attributes >>> 16) & 0xf000;
    check((fileType === 0 || fileType === 0x8000) && (attributes & 0x18) === 0,
      'UNSUPPORTED_ZIP', 'Symlink/directory/device members are forbidden');
    check(size === packed, 'SIZE_MISMATCH', 'STORE sizes differ');
    check(size <= FULL_PACK_LIMITS.maxAssetBytes, 'LIMIT_EXCEEDED', 'Member too large');
    check(nameLength > 0 && nameLength <= 2048 && p + 46 + nameLength <= cd.length,
      'INVALID_ZIP', 'Invalid member name bounds');
    const nameBytes = cd.subarray(p + 46, p + 46 + nameLength);
    check(flags === 0x800 || nameBytes.every(byte => byte < 128), 'INVALID_ZIP', 'Non-ASCII path without UTF-8 flag');
    const path = fullPackPath(decode(nameBytes)), alias = path.toLowerCase();
    check(!names.has(alias), 'DUPLICATE_ENTRY', `Duplicate ZIP path: ${path}`); names.add(alias);
    check(localOffset === nextLocal && localOffset + 30 + nameLength + size <= cdStart,
      'INVALID_ZIP', 'Overlapping, hidden or noncontiguous local member');
    const local = await read(blob, localOffset, 30 + nameLength), lv = view(local);
    check(lv.getUint32(0, true) === 0x04034b50 && lv.getUint16(26, true) === nameLength &&
      lv.getUint16(28, true) === 0, 'INVALID_ZIP', 'Invalid local record');
    // Compare all shared metadata, including time/date, CRC and both sizes.
    check(local.subarray(4, 26).every((byte, i) => byte === cd[p + 6 + i]) &&
      local.subarray(30).every((byte, i) => byte === nameBytes[i]), 'INVALID_ZIP', 'Local/central header mismatch');
    const start = localOffset + 30 + nameLength, finish = start + size;
    result.push({path, size, crc, start, end: finish}); nextLocal = finish; p += 46 + nameLength;
  }
  check(p === cdSize && nextLocal === cdStart, 'INVALID_ZIP', 'Unindexed or trailing ZIP data');
  return result;
}
async function verifiedBytes(blob: Blob, entry: ZipEntry): Promise<Uint8Array> {
  const bytes = await read(blob, entry.start, entry.size);
  check(fullPackCrc32(bytes) === entry.crc, 'CRC_MISMATCH', `ZIP checksum mismatch: ${entry.path}`);
  return bytes;
}

/** Bounded random-access Blob reader; no whole-pack arrayBuffer/unzip allocation. */
export async function verifyFullPack(blob: Blob, options: FullPackOptions = {}): Promise<VerifiedFullPack> {
  abort(options.signal);
  const entries = await directory(blob, options.signal);
  const first = entries[0];
  check(first.path === FULL_PACK_MANIFEST_PATH, 'MISSING_ASSET', 'Root manifest must be first');
  check(first.size <= FULL_PACK_LIMITS.maxManifestBytes, 'LIMIT_EXCEEDED', 'Manifest too large');
  const text = decode(await verifiedBytes(blob, first));
  let raw: unknown;
  try { raw = JSON.parse(text); }
  catch { throw new FullPackError('INVALID_MANIFEST', 'Invalid manifest JSON'); }
  const canonical = canonicalFullPackManifest(raw);
  check(canonical === text, 'INVALID_MANIFEST', 'Manifest must use canonical encoding');
  const manifest = JSON.parse(canonical) as ResourceManifest;
  check(options.expectedContentPack === undefined || options.expectedContentPack === manifest.contentPack,
    'CONTENT_PACK_MISMATCH', 'Unexpected contentPack');
  check(options.expectedVersion === undefined || options.expectedVersion === manifest.version,
    'VERSION_MISMATCH', 'Unexpected pack version');
  if (options.expectedManifest !== undefined) {
    check(canonicalFullPackManifest(options.expectedManifest) === canonical, 'MANIFEST_MISMATCH', 'Trusted target manifest differs');
  }
  const byPath = new Map(entries.slice(1).map(entry => [entry.path, entry]));
  for (const asset of manifest.assets) {
    const entry = byPath.get(asset.path);
    check(entry, 'MISSING_ASSET', `Missing asset: ${asset.path}`);
    check(entry.size === asset.size, 'SIZE_MISMATCH', `Asset size mismatch: ${asset.path}`);
  }
  check(byPath.size === manifest.assets.length, 'UNEXPECTED_ASSET', 'Unlisted ZIP member');
  check(entries.slice(1).every((entry, i) => entry.path === manifest.assets[i].path),
    'INVALID_ZIP', 'Assets must be in canonical path order');
  const totalBytes = manifest.assets.reduce((sum, asset) => sum + asset.size, 0);
  let verified = 0;
  for (const asset of manifest.assets) {
    abort(options.signal);
    options.onProgress?.({status: 'VERIFYING', totalBytes, verifiedBytes: verified, currentAsset: asset.path});
    const bytes = await verifiedBytes(blob, byPath.get(asset.path)!);
    check(await fullPackSha256(bytes) === asset.sha256, 'HASH_MISMATCH', `Asset SHA-256 mismatch: ${asset.path}`);
    verified += asset.size;
  }
  abort(options.signal);
  for (const asset of manifest.assets) Object.freeze(asset);
  Object.freeze(manifest.assets); Object.freeze(manifest);
  options.onProgress?.({status: 'VERIFIED', totalBytes, verifiedBytes: verified});
  abort(options.signal);
  const mediaTypes = new Map(manifest.assets.map(asset => [asset.path, asset.mediaType]));
  return Object.freeze({manifest, archiveBytes: blob.size, getAsset(path: string) {
    const entry = byPath.get(path);
    check(entry, 'MISSING_ASSET', `Unknown asset: ${path}`);
    return blob.slice(entry.start, entry.end, mediaTypes.get(path)!);
  }});
}

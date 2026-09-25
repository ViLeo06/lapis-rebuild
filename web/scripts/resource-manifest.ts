import {createHash} from 'node:crypto';
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {dirname, extname, join, relative, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  resourcePath,
  validateResourceManifest,
  type ResourceManifest,
  type ResourceManifestEntry,
} from '../src/resource-manifest.ts';

export type ResourceVerificationIssue = {
  code: 'MISSING_FILE' | 'SIZE_MISMATCH' | 'HASH_MISMATCH' | 'UNREADABLE_FILE';
  assetId: string;
  path: string;
  expected?: string | number;
  actual?: string | number;
};

const MEDIA_TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.gif': 'image/gif',
  '.html': 'text/html',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
};

const toPosix = (value: string) => value.split(sep).join('/');
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

export function mediaTypeForPath(path: string): string {
  return MEDIA_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

async function listFiles(root: string, current = root): Promise<string[]> {
  const entries = await readdir(current, {withFileTypes: true});
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const files: string[] = [];
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, absolute));
    else if (entry.isFile()) files.push(toPosix(relative(root, absolute)));
  }
  return files;
}

export async function generateResourceManifest(options: {
  root: string;
  contentPack: string;
  version: string;
  excludePaths?: Iterable<string>;
}): Promise<ResourceManifest> {
  const root = resolve(options.root);
  const excluded = new Set(Array.from(options.excludePaths ?? [], path => resourcePath(toPosix(path))));
  const paths = (await listFiles(root)).filter(path => !excluded.has(path));
  const assets: ResourceManifestEntry[] = [];

  for (const path of paths) {
    resourcePath(path);
    const bytes = await readFile(join(root, path));
    assets.push({
      assetId: path,
      path,
      contentPack: options.contentPack,
      size: bytes.byteLength,
      sha256: sha256(bytes),
      mediaType: mediaTypeForPath(path),
      version: options.version,
    });
  }

  return validateResourceManifest({
    schema: 1,
    contentPack: options.contentPack,
    version: options.version,
    assets,
  });
}

export async function verifyResourceManifest(
  rootPath: string,
  rawManifest: unknown,
): Promise<ResourceVerificationIssue[]> {
  const root = resolve(rootPath);
  const manifest = validateResourceManifest(rawManifest);
  const issues: ResourceVerificationIssue[] = [];

  for (const asset of manifest.assets) {
    let bytes: Uint8Array;
    try {
      bytes = await readFile(join(root, asset.path));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException)?.code;
      issues.push({
        code: code === 'ENOENT' ? 'MISSING_FILE' : 'UNREADABLE_FILE',
        assetId: asset.assetId,
        path: asset.path,
      });
      continue;
    }

    if (bytes.byteLength !== asset.size) {
      issues.push({
        code: 'SIZE_MISMATCH',
        assetId: asset.assetId,
        path: asset.path,
        expected: asset.size,
        actual: bytes.byteLength,
      });
    }

    const actualHash = sha256(bytes);
    if (actualHash !== asset.sha256) {
      issues.push({
        code: 'HASH_MISMATCH',
        assetId: asset.assetId,
        path: asset.path,
        expected: asset.sha256,
        actual: actualHash,
      });
    }
  }

  return issues;
}

function requiredOption(args: string[], name: string): string {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error(`Missing required option ${name}`);
  }
  return args[index + 1];
}

async function cli(argv: string[]) {
  const [command, ...args] = argv;
  if (command === 'generate') {
    const root = resolve(requiredOption(args, '--root'));
    const output = resolve(requiredOption(args, '--output'));
    const contentPack = requiredOption(args, '--content-pack');
    const version = requiredOption(args, '--version');
    const outputRelative = toPosix(relative(root, output));
    const excludePaths = outputRelative !== '..' && !outputRelative.startsWith('../') ? [outputRelative] : [];
    const manifest = await generateResourceManifest({root, contentPack, version, excludePaths});
    await mkdir(dirname(output), {recursive: true});
    await writeFile(output, JSON.stringify(manifest, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ok: true, output, assets: manifest.assets.length}) + '\n');
    return;
  }

  if (command === 'verify') {
    const root = resolve(requiredOption(args, '--root'));
    const manifestPath = resolve(requiredOption(args, '--manifest'));
    const raw = JSON.parse(await readFile(manifestPath, 'utf8'));
    const issues = await verifyResourceManifest(root, raw);
    process.stdout.write(JSON.stringify({ok: issues.length === 0, issues}, null, 2) + '\n');
    if (issues.length) process.exitCode = 1;
    return;
  }

  throw new Error(
    'Usage: resource-manifest.ts generate --root DIR --output FILE --content-pack ID --version VERSION | verify --root DIR --manifest FILE',
  );
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedAsScript) {
  cli(process.argv.slice(2)).catch(error => {
    process.stderr.write(String(error instanceof Error ? error.message : error) + '\n');
    process.exitCode = 1;
  });
}

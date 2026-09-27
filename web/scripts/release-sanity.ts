import {createHash} from 'node:crypto';
import {extname, join, relative, resolve, sep} from 'node:path';
import {readFile, readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {validateResourceManifest, type ResourceManifest} from '../src/resource-manifest.ts';

export type PublicSafeFullPack = {
  path: string;
  contentPack: string;
  version: string;
  manifestPath: string;
};

export type PublicReleasePolicy = {
  schema: 1;
  publicSafeFullPacks: PublicSafeFullPack[];
};

export type ReleaseAuditIssue = {
  code:
    | 'FORBIDDEN_PATH'
    | 'FORBIDDEN_EXTENSION'
    | 'UNLISTED_FULL_PACK'
    | 'INVALID_POLICY'
    | 'MISSING_FULL_PACK'
    | 'MISSING_MANIFEST'
    | 'INVALID_MANIFEST'
    | 'MISSING_RELEASE_METADATA'
    | 'MISSING_INCREMENTAL_ASSET'
    | 'UNLISTED_INCREMENTAL_ASSET'
    | 'INCREMENTAL_ASSET_SIZE_MISMATCH'
    | 'INCREMENTAL_ASSET_HASH_MISMATCH';
  path?: string;
  message: string;
};

const TOKEN = /^[A-Za-z0-9._-]{1,128}$/;
const FORBIDDEN_EXTENSIONS = new Set(['.exe', '.dll', '.spr', '.ani', '.sgr', '.lib', '.tdg', '.7z', '.rar', '.zip']);

const toPosix = (value: string) => value.split(sep).join('/');

function relativePath(value: string, label: string): string {
  if (!value || value.startsWith('/') || value.startsWith('./') || value.includes('\\')) {
    throw new Error(`${label} must be a relative POSIX path`);
  }
  const parts = value.split('/');
  if (parts.some(part => !part || part === '.' || part === '..')) {
    throw new Error(`${label} contains an invalid path segment`);
  }
  return value;
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

function validatePolicy(raw: unknown): PublicReleasePolicy {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Missing public release policy');
  const candidate = raw as Record<string, unknown>;
  if (candidate.schema !== 1 || !Array.isArray(candidate.publicSafeFullPacks)) {
    throw new Error('Invalid public release policy');
  }

  const seen = new Set<string>();
  for (const item of candidate.publicSafeFullPacks) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid public Full Pack policy entry');
    const entry = item as Record<string, unknown>;
    if (
      typeof entry.path !== 'string' ||
      typeof entry.contentPack !== 'string' ||
      typeof entry.version !== 'string' ||
      typeof entry.manifestPath !== 'string'
    ) {
      throw new Error('Incomplete public Full Pack policy entry');
    }
    relativePath(entry.path, 'Full Pack path');
    relativePath(entry.manifestPath, 'manifest path');
    if (!TOKEN.test(entry.contentPack) || !TOKEN.test(entry.version)) throw new Error('Invalid public Full Pack identity');
    if (seen.has(entry.path)) throw new Error(`Duplicate public Full Pack policy path: ${entry.path}`);
    seen.add(entry.path);
  }

  return candidate as PublicReleasePolicy;
}

async function validateIncrementalAssets(
  root: string,
  fileSet: Set<string>,
  files: string[],
  policyEntry: PublicSafeFullPack,
  manifest: ResourceManifest,
  issues: ReleaseAuditIssue[],
): Promise<void> {
  const assetRoot = `distribution/assets/${policyEntry.contentPack}/${policyEntry.version}/`;
  const expected = new Set(manifest.assets.map(asset => assetRoot + asset.path));

  for (const asset of manifest.assets) {
    const publicPath = assetRoot + asset.path;
    if (!fileSet.has(publicPath)) {
      issues.push({
        code: 'MISSING_INCREMENTAL_ASSET',
        path: publicPath,
        message: 'Every manifest asset must be present in the public incremental asset tree',
      });
      continue;
    }
    const bytes = await readFile(join(root, publicPath));
    if (bytes.byteLength !== asset.size) {
      issues.push({
        code: 'INCREMENTAL_ASSET_SIZE_MISMATCH',
        path: publicPath,
        message: `Incremental asset size mismatch: expected ${asset.size}, got ${bytes.byteLength}`,
      });
      continue;
    }
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    if (sha256 !== asset.sha256) {
      issues.push({
        code: 'INCREMENTAL_ASSET_HASH_MISMATCH',
        path: publicPath,
        message: 'Incremental asset SHA-256 does not match the allowlisted Resource Manifest',
      });
    }
  }

  for (const path of files) {
    if (path.startsWith(assetRoot) && !expected.has(path)) {
      issues.push({
        code: 'UNLISTED_INCREMENTAL_ASSET',
        path,
        message: 'Public incremental asset is not listed by the allowlisted Resource Manifest',
      });
    }
  }
}

export async function auditReleaseRoot(rootPath: string, policyPath: string): Promise<ReleaseAuditIssue[]> {
  const root = resolve(rootPath);
  const rawPolicy = JSON.parse(await readFile(resolve(policyPath), 'utf8'));
  const policy = validatePolicy(rawPolicy);
  const files = await listFiles(root);
  const fileSet = new Set(files);
  const issues: ReleaseAuditIssue[] = [];

  if (!fileSet.has('release-metadata.json')) {
    issues.push({
      code: 'MISSING_RELEASE_METADATA',
      path: 'release-metadata.json',
      message: 'Production build must emit release-metadata.json',
    });
  }

  for (const path of files) {
    const parts = path.toLowerCase().split('/');
    if (parts.includes('game-data')) {
      issues.push({code: 'FORBIDDEN_PATH', path, message: 'Private game-data must never ship in public Pages dist'});
    }

    const extension = extname(path).toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      issues.push({code: 'FORBIDDEN_EXTENSION', path, message: `Forbidden original/archive extension in public dist: ${extension}`});
    }
  }

  const allowedPacks = new Map(policy.publicSafeFullPacks.map(entry => [entry.path, entry]));
  for (const path of files.filter(path => path.endsWith('.lapispak'))) {
    if (!allowedPacks.has(path)) {
      issues.push({code: 'UNLISTED_FULL_PACK', path, message: 'Every public .lapispak must be explicitly allowlisted as public-safe'});
    }
  }

  for (const entry of policy.publicSafeFullPacks) {
    const expectedPath = `distribution/packs/lapis-full-${entry.contentPack}-${entry.version}.lapispak`;
    if (entry.path !== expectedPath) {
      issues.push({
        code: 'INVALID_POLICY',
        path: entry.path,
        message: `Public Full Pack path must be ${expectedPath}`,
      });
    }
    if (!entry.manifestPath.startsWith(`distribution/manifests/${entry.contentPack}/${entry.version}/`) ||
        !entry.manifestPath.endsWith('/resource-manifest.json')) {
      issues.push({
        code: 'INVALID_POLICY',
        path: entry.manifestPath,
        message: 'Public manifest path must be versioned under distribution/manifests/<contentPack>/<version>/resource-manifest.json',
      });
    }

    if (!fileSet.has(entry.path)) {
      issues.push({code: 'MISSING_FULL_PACK', path: entry.path, message: 'Allowlisted public Full Pack is missing from dist'});
    }
    if (!fileSet.has(entry.manifestPath)) {
      issues.push({code: 'MISSING_MANIFEST', path: entry.manifestPath, message: 'Allowlisted public Resource Manifest is missing from dist'});
      continue;
    }

    let manifest: ResourceManifest;
    try {
      manifest = validateResourceManifest(JSON.parse(await readFile(join(root, entry.manifestPath), 'utf8')));
      if (manifest.contentPack !== entry.contentPack || manifest.version !== entry.version) {
        issues.push({
          code: 'INVALID_MANIFEST',
          path: entry.manifestPath,
          message: 'Resource Manifest identity does not match public release allowlist',
        });
        continue;
      }
    } catch (error) {
      issues.push({
        code: 'INVALID_MANIFEST',
        path: entry.manifestPath,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    await validateIncrementalAssets(root, fileSet, files, entry, manifest, issues);
  }

  return issues;
}

function requiredOption(args: string[], name: string): string {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Missing required option ${name}`);
  return args[index + 1];
}

async function cli(argv: string[]) {
  const root = requiredOption(argv, '--root');
  const policy = requiredOption(argv, '--policy');
  const issues = await auditReleaseRoot(root, policy);
  process.stdout.write(JSON.stringify({ok: issues.length === 0, issues}, null, 2) + '\n');
  if (issues.length) process.exitCode = 1;
}

const invokedAsScript = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedAsScript) {
  cli(process.argv.slice(2)).catch(error => {
    process.stderr.write(String(error instanceof Error ? error.message : error) + '\n');
    process.exitCode = 1;
  });
}

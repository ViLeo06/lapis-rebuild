import {createHash} from 'node:crypto';
import {createReadStream, openAsBlob} from 'node:fs';
import {chmod, link, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import {basename, dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {canonicalFullPackManifest, fullPackFileName, verifyFullPack, type FullPackOptions} from '../src/distribution/full-pack.ts';
import type {ResourceManifest} from '../src/resource-manifest.ts';

export type PackVisibility = 'public-safe' | 'private-original';
const run = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const inside = (root: string, path: string) => {
  const rel = relative(root, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};

/** Explicit inputs only; never scans/auto-publishes a directory or regenerates hashes. */
export async function buildFullPack(options: {
  root: string; manifest: unknown; output: string; visibility: PackVisibility;
  expectedContentPack?: string; expectedVersion?: string;
}) {
  if (options.visibility !== 'public-safe' && options.visibility !== 'private-original') {
    throw new Error('Explicit visibility public-safe or private-original is required');
  }
  const canonical = canonicalFullPackManifest(options.manifest);
  const manifest = JSON.parse(canonical) as ResourceManifest;
  if (options.expectedContentPack !== undefined && options.expectedContentPack !== manifest.contentPack) {
    throw new Error('CONTENT_PACK_MISMATCH');
  }
  if (options.expectedVersion !== undefined && options.expectedVersion !== manifest.version) {
    throw new Error('VERSION_MISMATCH');
  }
  const root = await realpath(resolve(options.root));
  if (!(await lstat(root)).isDirectory()) throw new Error('Asset root must be a directory');
  const output = resolve(options.output);
  if (basename(output) !== fullPackFileName(manifest)) throw new Error('Output name must match contentPack/version');
  await mkdir(dirname(output), {recursive: true});
  const physicalOutput = resolve(await realpath(dirname(output)), basename(output));
  for (const directory of ['web/public', 'web/dist']) {
    const blocked = resolve(repoRoot, directory);
    let physicalBlocked = blocked;
    try { physicalBlocked = await realpath(blocked); } catch { /* Not built yet. */ }
    if (inside(blocked, output) || inside(physicalBlocked, physicalOutput)) {
      throw new Error('No automatic public/dist pack publication; use the separately authorized release process');
    }
  }
  if (inside(root, physicalOutput)) throw new Error('Output must be outside the input asset root');
  try { await lstat(physicalOutput); throw new Error('Refusing to overwrite an existing pack'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const staging = await mkdtemp(resolve(dirname(physicalOutput), '.lapis-pack-'));
  try {
    const manifestFile = resolve(staging, 'resource-manifest.json'), candidate = resolve(staging, 'candidate.zip');
    await writeFile(manifestFile, canonical, {mode: 0o600});
    await run('python3', ['-S', fileURLToPath(new URL('../../tools/write_lapispak.py', import.meta.url)), root, manifestFile, candidate],
      {maxBuffer: 1024 * 1024});
    await chmod(candidate, 0o600);
    const verified = await verifyFullPack(await openAsBlob(candidate), {expectedManifest: manifest,
      expectedContentPack: manifest.contentPack, expectedVersion: manifest.version});
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(candidate)) hash.update(chunk);
    // Same-filesystem, create-only publication: a concurrent file is never overwritten.
    await link(candidate, physicalOutput);
    return {ok: true, output: physicalOutput, visibility: options.visibility,
      contentPack: manifest.contentPack, version: manifest.version, assets: verified.manifest.assets.length,
      bytes: verified.archiveBytes, sha256: hash.digest('hex')};
  } finally { await rm(staging, {recursive: true, force: true}); }
}

function parseArgs(args: string[]) {
  const values = new Map<string, string>();
  const valid = new Set(['--root', '--manifest', '--output', '--pack', '--visibility', '--content-pack', '--version']);
  for (let i = 0; i < args.length; i += 2) {
    if (!valid.has(args[i]) || values.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error(`Invalid, duplicate or missing option: ${args[i]}`);
    }
    values.set(args[i], args[i + 1]);
  }
  return (key: string, required = true) => {
    const value = values.get(key);
    if (required && value === undefined) throw new Error(`Missing ${key}`);
    return value;
  };
}
export async function fullPackCli(argv: string[]) {
  const [command, ...args] = argv, option = parseArgs(args);
  if (command !== 'build' && command !== 'verify') throw new Error('Usage: full-pack.ts build|verify (see docs/contracts/m8-1-resource-pack.md)');
  const expectedContentPack = option('--content-pack')!, expectedVersion = option('--version')!;
  if (command === 'build') {
    const result = await buildFullPack({root: option('--root')!, output: option('--output')!,
      manifest: JSON.parse(await readFile(option('--manifest')!, 'utf8')),
      visibility: option('--visibility') as PackVisibility, expectedContentPack, expectedVersion});
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    const target = option('--manifest', false);
    const options: FullPackOptions = {expectedContentPack, expectedVersion};
    if (target) options.expectedManifest = JSON.parse(await readFile(target, 'utf8'));
    const pack = await verifyFullPack(await openAsBlob(option('--pack')!), options);
    process.stdout.write(JSON.stringify({ok: true, contentPack: pack.manifest.contentPack,
      version: pack.manifest.version, assets: pack.manifest.assets.length, bytes: pack.archiveBytes,
      authority: target ? 'pinned-target-manifest' : 'self-consistency-only'}) + '\n');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  fullPackCli(process.argv.slice(2)).catch(error => {
    process.stderr.write(JSON.stringify({ok: false, error: error instanceof Error ? error.message : String(error)}) + '\n');
    process.exitCode = 1;
  });
}

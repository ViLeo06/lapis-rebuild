import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {openAsBlob} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {buildFullPack} from './full-pack.ts';
import {canonicalFullPackManifest, fullPackFileName, verifyFullPack} from '../src/distribution/full-pack.ts';
import {SYNTHETIC_FILES, syntheticManifest} from '../tests/fixtures/full-pack-fixture.ts';

// Only generated text/JSON. No original client, Drive, credentials or network access.
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--output') throw new Error('Usage: full-pack-synthetic.ts --output DIR');
const output = resolve(args[1]), workspace = await mkdtemp(resolve(tmpdir(), 'lapis-pack-synthetic-'));
try {
  const manifest = syntheticManifest(), root = resolve(workspace, 'input'), name = fullPackFileName(manifest);
  for (const [path, content] of Object.entries(SYNTHETIC_FILES)) {
    await mkdir(dirname(resolve(root, path)), {recursive: true}); await writeFile(resolve(root, path), content);
  }
  const built = await buildFullPack({root, manifest, output: resolve(output, name), visibility: 'public-safe'});
  const rebuilt = await buildFullPack({root, manifest, output: resolve(workspace, 'repeat', name), visibility: 'public-safe'});
  if (built.sha256 !== rebuilt.sha256) throw new Error('Nondeterministic archive');
  const verified = await verifyFullPack(await openAsBlob(built.output), {expectedManifest: manifest});
  const bytes = await readFile(built.output);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  bytes[view.getUint32(bytes.length - 6, true) - 1] ^= 1;
  let rejected = false;
  try {await verifyFullPack(new Blob([new Uint8Array(bytes).buffer]));} catch {rejected = true;}
  if (!rejected) throw new Error('Corruption accepted');
  const report = {...built, output: name, deterministic: true, roundtrip: true,
    corruptionRejected: true, verifiedAssets: verified.manifest.assets.length,
    evidence: 'synthetic-only; not a playable original asset pack'};
  await writeFile(resolve(output, 'resource-manifest.json'), canonicalFullPackManifest(manifest));
  await writeFile(resolve(output, 'full-pack-report.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} finally {await rm(workspace, {recursive: true, force: true});}

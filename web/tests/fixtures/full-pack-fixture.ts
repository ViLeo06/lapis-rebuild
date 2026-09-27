import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {canonicalFullPackManifest} from '../../src/distribution/full-pack.ts';
import type {ResourceManifest} from '../../src/resource-manifest.ts';

export const SYNTHETIC_FILES: Record<string, string> = {
  'maps/demo.json': '{"synthetic":true,"map":1}\n',
  'text/readme.txt': 'Synthetic test data only; no original game assets.\n',
};
export function syntheticManifest(files = SYNTHETIC_FILES, version = '1', contentPack = 'synthetic-safe'): ResourceManifest {
  return {schema: 1, contentPack, version, assets: Object.entries(files).map(([path, text]) => ({
    assetId: path, path, contentPack, version, mediaType: path.endsWith('.json') ? 'application/json' : 'text/plain',
    size: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex'),
  }))};
}
export type TestMember = {name: string; data: string; method?: number; attributes?: number};
/** Test-only independent ZIP fixture writer. Names stay inside the archive; NEVER extracted. */
export function zipFixture(members: TestMember[]): Blob {
  const code = `import io,json,sys,zipfile
out=io.BytesIO()
with zipfile.ZipFile(out,'w',allowZip64=False) as z:
 for entry in json.loads(sys.stdin.read()):
  i=zipfile.ZipInfo(entry['name'],date_time=(1980,1,1,0,0,0))
  i.create_system=3
  i.compress_type=entry.get('method',0)
  i.external_attr=entry.get('attributes',0o100644<<16)
  z.writestr(i,entry['data'].encode('utf-8'))
sys.stdout.buffer.write(out.getvalue())`;
  const bytes = execFileSync('python3', ['-S', '-W', 'ignore', '-c', code], {input: JSON.stringify(members), maxBuffer: 32 * 1024 * 1024});
  return new Blob([bytes]);
}
export function syntheticMembers(manifest = syntheticManifest(), files = SYNTHETIC_FILES): TestMember[] {
  return [{name: 'resource-manifest.json', data: canonicalFullPackManifest(manifest)},
    ...Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, data]) => ({name, data}))];
}
export async function mutateZip(blob: Blob, mutate: (bytes: Uint8Array, view: DataView, central: number) => void): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer()), view = new DataView(bytes.buffer);
  mutate(bytes, view, view.getUint32(bytes.length - 6, true));
  return new Blob([bytes]);
}

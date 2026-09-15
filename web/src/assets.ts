import { assert, validateManifest, validateAnimation, validateCollision, frameFile, textureKey, safePath } from './model.ts';
import type { LoadedPack, Inspector } from './model.ts';
declare global { interface Window { __LAPIS_PACK__?: Record<string,string>; } }
export const assetUrl = (path: string) => {
  safePath(path);
  if(window.__LAPIS_PACK__) { const url=window.__LAPIS_PACK__[path]; if(!url) throw new Error(`Embedded asset missing: ${path}`); return url; }
  return `./game-data/${path}`;
};
async function json(path: string): Promise<unknown> {
  const response=await fetch(assetUrl(path)); if(!response.ok) throw new Error(`Asset ${path}: HTTP ${response.status}`);
  return response.json();
}
export async function loadPack(progress: (s: string)=>void): Promise<LoadedPack> {
  progress('\u8bfb\u53d6\u8d44\u6e90\u6e05\u5355');
  const manifest=validateManifest(await json('prototype.json'));
  const collision=validateCollision(await json(manifest.map.collision));
  const inspector = manifest.map.inspector ? await json(manifest.map.inspector) as Inspector : null;
  if(inspector) assert(inspector.width>0&&inspector.height>0&&inspector.cells.length===inspector.width*inspector.height, 'Invalid map inspector');
  const animations: LoadedPack['animations']={}; const images: Record<string,string>={ map:assetUrl(manifest.map.png) };
  for(const [id, c] of Object.entries(manifest.characters)) {
    animations[id]={};
    for(const [slot,paths] of Object.entries(c.actions)) {
      const a=validateAnimation(await json(paths.animation)); animations[id][slot]=a;
      for(const index of new Set(a.directions.flat())) images[textureKey(id,slot,index)]=assetUrl(frameFile(paths.frames_dir,index));
    }
  }
  progress(`\u5df2\u6821\u9a8c ${Object.keys(images).length-1} \u5f20\u89d2\u8272\u5e27`);
  return {manifest,collision,inspector,animations,images,digest:manifest.provenance?.installer_sha256??'synthetic-fixture-v1'};
}

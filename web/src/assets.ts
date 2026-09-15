import { assert, validateManifest, validateAnimation, validateCollision, frameFile, textureKey, safePath, mapTextureKey, effectTextureKey } from './model.ts';
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
async function inspector(path:string|undefined):Promise<Inspector|null>{
  if(!path)return null;const raw=await json(path) as Inspector;assert(raw.width>0&&raw.height>0&&raw.cells.length===raw.width*raw.height,'Invalid map inspector');return raw;
}
export async function loadPack(progress: (s: string)=>void): Promise<LoadedPack> {
  progress('读取资源清单');
  const manifest=validateManifest(await json('prototype.json'));
  const mapDefs=manifest.maps??{[String(manifest.map.id)]:manifest.map};
  const maps:LoadedPack['maps']={};const images:Record<string,string>={};
  for(const [id,m] of Object.entries(mapDefs)){
    const collision=validateCollision(await json(m.collision));
    maps[id]={manifest:m,collision,inspector:await inspector(m.inspector)};
    images[mapTextureKey(m.id)]=assetUrl(m.png);
  }
  const primary=maps[String(manifest.map.id)];assert(primary,'Primary map missing after load');
  const animations: LoadedPack['animations']={};
  for(const [id, c] of Object.entries(manifest.characters)) {
    animations[id]={};
    for(const [slot,paths] of Object.entries(c.actions)) {
      const a=validateAnimation(await json(paths.animation)); animations[id][slot]=a;
      for(const index of new Set(a.directions.flat())) images[textureKey(id,slot,index)]=assetUrl(frameFile(paths.frames_dir,index));
    }
  }
  const effects=manifest.effects??{};
  for(const effect of Object.values(effects))for(const index of effect.sequence)images[effectTextureKey(effect.resource_id,index)]=assetUrl(frameFile(effect.frames_dir,index));
  progress(`已校验 ${Object.keys(images).length} 个图像资源引用`);
  return {manifest,collision:primary.collision,inspector:primary.inspector,maps,effects,animations,images,digest:manifest.provenance?.pack_sha256??manifest.provenance?.installer_sha256??'synthetic-fixture-v1'};
}

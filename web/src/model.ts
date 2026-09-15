export type Evidence = 'VERIFIED' | 'INFERRED' | 'UNVERIFIED';
export type Bounds = { index: number; left: number; top: number; right: number; bottom: number };
export type Animation = { action_slot: string; frames_per_direction: number; raw_timing: number; directions: number[][]; spr_frame_count: number; frame_bounds: Bounds[] };
export type ActorPack = { class_id: number; label: string; actions: Record<string, { animation: string; frames_dir: string }> };
export type MapAsset = { id:number; name:string; png:string; collision:string; inspector?:string; render:{width:number;height:number}; evidence?:string };
export type EffectAsset = { resource_id:number; layer_name:string; raw_timing:number; frame_count:number; sequence:number[]; frames_dir:string; frame_bounds:Bounds[]; sequence_evidence:string; timing_semantics:string; placement_semantics:string; warning:string };
export type Manifest = { schema: number; provenance?: { kind: string; installer_sha256?: string; pack_sha256?: string; evidence: Evidence }; characters: Record<string, ActorPack>; map: MapAsset; maps?:Record<string,MapAsset>; effects?:Record<string,EffectAsset> };
export type Collision = { width: number; height: number; grid_order: string; grid: number[] };
export type Inspector = { width: number; height: number; cells: { resource_id: number; directory_path: number[] }[] };
export type LoadedMap = { manifest:MapAsset; collision:Collision; inspector:Inspector|null };
export type LoadedPack = { manifest: Manifest; collision: Collision; inspector: Inspector | null; maps:Record<string,LoadedMap>; effects:Record<string,EffectAsset>; animations: Record<string, Record<string, Animation>>; images: Record<string, string>; digest: string };
export function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const integer = (x: unknown): x is number => Number.isInteger(x);
export function safePath(value: unknown): string {
  assert(typeof value === 'string' && /^[A-Za-z0-9_./-]+$/.test(value), 'Unsafe asset path');
  assert(!value.startsWith('/') && !value.split('/').includes('..') && !value.includes('//'), 'Asset path escapes pack');
  return value;
}
function validateMap(m:MapAsset):MapAsset {
  assert(m && integer(m.id) && m.id>=0 && typeof m.name==='string' && m.name.length>0 && m.name.length<=100, 'Invalid map');
  assert(m.render && integer(m.render.width) && integer(m.render.height) && m.render.width > 0 && m.render.height > 0 && m.render.width <= 8192 && m.render.height <= 8192, 'Invalid map dimensions');
  safePath(m.png);safePath(m.collision);if(m.inspector)safePath(m.inspector);return m;
}
export function validateManifest(raw: unknown): Manifest {
  assert(raw && typeof raw === 'object', 'Missing manifest'); const m = raw as Manifest;
  assert(m.schema === 1, 'Unsupported pack schema');
  validateMap(m.map);
  if(m.maps){const entries=Object.entries(m.maps);assert(entries.length>0&&entries.length<=20,'Invalid map count');for(const [id,map] of entries){validateMap(map);assert(/^\d+$/.test(id)&&map.id===Number(id),'Map key/id mismatch');}assert(!!m.maps[String(m.map.id)],'Primary map missing from maps');}
  assert(m.characters && Object.keys(m.characters).length > 0 && Object.keys(m.characters).length <= 20, 'Invalid character count');
  for (const [id, c] of Object.entries(m.characters)) {
    assert(/^\d+$/.test(id) && c.class_id === Number(id) && c.actions && c.actions['00'] && c.actions['01'] && c.actions['02'] && Object.keys(c.actions).length > 0, 'Invalid character');
    for (const [slot, a] of Object.entries(c.actions)) { assert(/^\d{2}$/.test(slot), 'Invalid action slot'); safePath(a.animation); safePath(a.frames_dir); }
  }
  if(m.effects){const entries=Object.entries(m.effects);assert(entries.length<=100,'Invalid effect count');for(const [id,e] of entries){assert(/^\d+$/.test(id)&&e.resource_id===Number(id),'Effect key/id mismatch');assert(typeof e.layer_name==='string'&&e.layer_name.length<=64,'Invalid effect layer');assert(Number.isFinite(e.raw_timing),'Invalid effect timing');assert(integer(e.frame_count)&&e.frame_count>=1&&e.frame_count<=4096,'Invalid effect frame count');assert(Array.isArray(e.sequence)&&e.sequence.length===e.frame_count&&e.sequence.every((v,i)=>integer(v)&&v===i),'Effect sequence must be verified sequential file order');safePath(e.frames_dir);assert(Array.isArray(e.frame_bounds)&&e.frame_bounds.length===e.frame_count,'Effect bounds mismatch');e.frame_bounds.forEach((b,i)=>{assert(b.index===i&&[b.left,b.top,b.right,b.bottom].every(integer),'Invalid effect bounds');assert(b.right>b.left&&b.bottom>b.top,'Invalid effect dimensions');});}}
  return m;
}
export function validateAnimation(raw: unknown): Animation {
  assert(raw && typeof raw === 'object', 'Missing animation'); const a = raw as Animation;
  assert(integer(a.frames_per_direction) && a.frames_per_direction >= 1 && a.frames_per_direction <= 32, 'Invalid active frame count');
  assert(integer(a.spr_frame_count) && a.spr_frame_count >= 1 && a.spr_frame_count <= 4096, 'Invalid SPR count');
  assert(Number.isFinite(a.raw_timing), 'Non-finite raw timing');
  assert(Array.isArray(a.directions) && a.directions.length === 8, 'Expected eight raw direction slots');
  for (const row of a.directions) assert(Array.isArray(row) && row.length === a.frames_per_direction && row.every(i => integer(i) && i >= 0 && i < a.spr_frame_count), 'ANI active index out of range');
  assert(Array.isArray(a.frame_bounds) && a.frame_bounds.length === a.spr_frame_count, 'Bounds count mismatch');
  a.frame_bounds.forEach((b, i) => { assert(b.index === i && [b.left,b.top,b.right,b.bottom].every(integer), 'Invalid frame bounds'); assert(b.right > b.left && b.bottom > b.top && b.right-b.left <= 2048 && b.bottom-b.top <= 2048, 'Invalid frame dimensions'); });
  return a;
}
export function validateCollision(raw: unknown): Collision {
  assert(raw && typeof raw === 'object', 'Missing collision data'); const c = raw as Collision;
  assert(integer(c.width) && integer(c.height) && c.width > 0 && c.height > 0 && c.width*c.height <= 1000000 && c.grid_order === 'first-major', 'Unsupported collision layout');
  assert(Array.isArray(c.grid) && c.grid.length === c.width*c.height && c.grid.every(integer), 'Invalid collision grid');
  return c;
}
export function frameIndex(a: Animation, direction: number, cursor: number): number {
  assert(Number.isInteger(direction) && direction >= 0 && direction < 8, 'Invalid direction');
  return a.directions[direction][((Math.floor(cursor) % a.frames_per_direction) + a.frames_per_direction) % a.frames_per_direction];
}
export function advanceClock(cursor: number, elapsed: number, delta: number, duration: number, length: number) {
  assert(duration > 0 && Number.isFinite(duration) && length > 0 && Number.isInteger(length), 'Invalid playback clock');
  const total = elapsed + Math.max(0, delta);
  return { cursor: (cursor + Math.floor(total / duration)) % length, elapsed: total % duration };
}
export const textureKey = (id: string, slot: string, index: number) => `B${id}_${slot}_${index}`;
export const frameFile = (dir: string, index: number) => `${dir}/frame-${String(index).padStart(3,'0')}.png`;
export const mapTextureKey = (id:number)=>`map_${id}`;
export const effectTextureKey=(id:number,index:number)=>`effect_${id}_${index}`;

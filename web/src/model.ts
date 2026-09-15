export type Evidence = 'VERIFIED' | 'INFERRED' | 'UNVERIFIED';
export type Bounds = { index: number; left: number; top: number; right: number; bottom: number };
export type Animation = { action_slot: string; frames_per_direction: number; raw_timing: number; directions: number[][]; spr_frame_count: number; frame_bounds: Bounds[] };
export type ActorPack = { class_id: number; label: string; actions: Record<string, { animation: string; frames_dir: string }> };
export type Manifest = { schema: number; provenance?: { kind: string; installer_sha256?: string; pack_sha256?: string; evidence: Evidence }; characters: Record<string, ActorPack>; map: { id: number; name: string; png: string; collision: string; inspector?: string; render: { width: number; height: number } } };
export type Collision = { width: number; height: number; grid_order: string; grid: number[] };
export type Inspector = { width: number; height: number; cells: { resource_id: number; directory_path: number[] }[] };
export type LoadedPack = { manifest: Manifest; collision: Collision; inspector: Inspector | null; animations: Record<string, Record<string, Animation>>; images: Record<string, string>; digest: string };
export function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
const integer = (x: unknown): x is number => Number.isInteger(x);
export function safePath(value: unknown): string {
  assert(typeof value === 'string' && /^[A-Za-z0-9_./-]+$/.test(value), 'Unsafe asset path');
  assert(!value.startsWith('/') && !value.split('/').includes('..') && !value.includes('//'), 'Asset path escapes pack');
  return value;
}
export function validateManifest(raw: unknown): Manifest {
  assert(raw && typeof raw === 'object', 'Missing manifest'); const m = raw as Manifest;
  assert(m.schema === 1, 'Unsupported pack schema');
  assert(m.map && Number.isInteger(m.map.id) && m.map.render && Number.isInteger(m.map.render.width) && Number.isInteger(m.map.render.height) && m.map.render.width > 0 && m.map.render.height > 0 && m.map.render.width <= 8192 && m.map.render.height <= 8192, 'Invalid map dimensions');
  safePath(m.map.png); safePath(m.map.collision); if (m.map.inspector) safePath(m.map.inspector);
  assert(m.characters && Object.keys(m.characters).length > 0 && Object.keys(m.characters).length <= 20, 'Invalid character count');
  for (const [id, c] of Object.entries(m.characters)) {
    assert(/^\d+$/.test(id) && c.class_id === Number(id) && c.actions && c.actions['00'] && c.actions['01'] && c.actions['02'] && Object.keys(c.actions).length > 0, 'Invalid character');
    for (const [slot, a] of Object.entries(c.actions)) { assert(/^\d{2}$/.test(slot), 'Invalid action slot'); safePath(a.animation); safePath(a.frames_dir); }
  }
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

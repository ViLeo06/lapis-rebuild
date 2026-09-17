import {validateEquipment} from './equipment.ts';
import {validateInventory} from './inventory.ts';
import type {InventoryState} from './inventory.ts';
import {validateProgression} from './progression.ts';
import type {ProgressionState} from './progression.ts';

export const SAVE_KIND = 'lapis-rebuild-save' as const;
export const CURRENT_SAVE_VERSION = 2 as const;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | {[key: string]: JsonValue};
export type SaveV2 = {
  kind: typeof SAVE_KIND;
  version: typeof CURRENT_SAVE_VERSION;
  pack: string;
  character: string;
  mapId: number;
  x: number;
  y: number;
  gold: number;
  inventory: InventoryState;
  quest: JsonValue;
  questFlags: Record<string, true>;
  progression: ProgressionState;
  rewardReceipts: string[];
  savedAt: string;
};
export type SaveValidationContext = {
  pack: string;
  characters: readonly string[];
  mapBounds?: Readonly<Record<number, {width: number; height: number}>>;
};

const MAX_JSON_NODES = 2048;
const integerIn = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const validToken = (value: unknown, max = 128): value is string =>
  typeof value === 'string' && value.length >= 1 && value.length <= max && /^[A-Za-z0-9._:/-]+$/.test(value);

function cloneJson(value: unknown, depth = 0, counter = {nodes: 0}): JsonValue {
  counter.nodes += 1;
  if (counter.nodes > MAX_JSON_NODES || depth > 16) throw new Error('Quest save data too large');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid quest number');
    return value;
  }
  if (Array.isArray(value)) return value.map(entry => cloneJson(entry, depth + 1, counter));
  if (!value || typeof value !== 'object') throw new Error('Invalid quest save data');
  const out: {[key: string]: JsonValue} = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!validToken(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Invalid quest save key');
    out[key] = cloneJson(entry, depth + 1, counter);
  }
  return out;
}

function validateFlags(raw: unknown): Record<string, true> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid quest flags');
  const result: Record<string, true> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!validToken(key) || value !== true) throw new Error('Invalid quest flag');
    result[key] = true;
  }
  if (Object.keys(result).length > 256) throw new Error('Too many quest flags');
  return result;
}

function validateReceipts(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length > 512 || !raw.every(entry => validToken(entry)) || new Set(raw).size !== raw.length) throw new Error('Invalid reward receipts');
  return [...raw];
}

export function validateSaveV2(raw: unknown, context: SaveValidationContext): SaveV2 {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid save');
  const save = raw as Partial<SaveV2>;
  if (save.kind !== SAVE_KIND || save.version !== CURRENT_SAVE_VERSION) throw new Error('Unsupported save schema');
  if (save.pack !== context.pack) throw new Error('Save resource pack mismatch');
  if (typeof save.character !== 'string' || !context.characters.includes(save.character)) throw new Error('Unknown save character');
  if (!integerIn(save.mapId, 0, 100000)) throw new Error('Invalid save map');
  if (!Number.isFinite(save.x) || !Number.isFinite(save.y) || (save.x as number) < 0 || (save.y as number) < 0) throw new Error('Invalid save coordinates');
  const bounds = context.mapBounds?.[save.mapId];
  if (bounds && ((save.x as number) > bounds.width || (save.y as number) > bounds.height)) throw new Error('Save coordinates outside map');
  if (!integerIn(save.gold, 0, Number.MAX_SAFE_INTEGER)) throw new Error('Invalid save gold');
  if (typeof save.savedAt !== 'string' || !Number.isFinite(Date.parse(save.savedAt))) throw new Error('Invalid save timestamp');
  const inventory = validateEquipment(validateInventory(save.inventory), save.character);
  const progression = validateProgression(save.progression);
  return {
    kind: SAVE_KIND,
    version: CURRENT_SAVE_VERSION,
    pack: save.pack,
    character: save.character,
    mapId: save.mapId,
    x: save.x as number,
    y: save.y as number,
    gold: save.gold,
    inventory,
    quest: cloneJson(save.quest),
    questFlags: validateFlags(save.questFlags),
    progression,
    rewardReceipts: validateReceipts(save.rewardReceipts),
    savedAt: save.savedAt,
  };
}

export function serializeSaveV2(save: SaveV2, context: SaveValidationContext): string {
  return JSON.stringify(validateSaveV2(save, context));
}

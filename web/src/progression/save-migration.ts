import {equipItem, validateEquipment} from './equipment.ts';
import {createInventory, knownItemIds, validateInventory} from './inventory.ts';
import type {InventoryState} from './inventory.ts';
import {initialProgression} from './progression.ts';
import {CURRENT_SAVE_VERSION, SAVE_KIND, validateSaveV2} from './save-schema.ts';
import type {JsonValue, SaveV2, SaveValidationContext} from './save-schema.ts';

const MAX_SERIALIZED_SAVE_BYTES = 256 * 1024;

type LegacyInventory = {owned: number[]; weapon: number | null; armor: number | null};
type LegacySaveV1 = {
  version: 1;
  pack: string;
  character: string;
  mapId?: number;
  x: number;
  y: number;
  gold: number;
  inventory?: LegacyInventory;
  quest?: JsonValue;
  savedAt: string;
};

const integerIn = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

function migrateLegacyInventory(raw: unknown, character: string): InventoryState {
  const legacy = raw === undefined ? {owned: knownItemIds(), weapon: null, armor: null} : raw as LegacyInventory;
  if (!legacy || typeof legacy !== 'object' || !Array.isArray(legacy.owned) || legacy.owned.length > 256 || new Set(legacy.owned).size !== legacy.owned.length || !legacy.owned.every(id => integerIn(id, 0, Number.MAX_SAFE_INTEGER))) throw new Error('Invalid legacy inventory');
  let inventory = createInventory(legacy.owned.map(itemId => ({itemId, source: {kind: 'migration' as const, ref: raw === undefined ? 's7-v1-default' : 's7-v1'}})));
  for (const slot of ['weapon', 'armor'] as const) {
    const itemId = legacy[slot];
    if (itemId !== null) inventory = equipItem(inventory, character, slot, itemId);
  }
  return validateEquipment(validateInventory(inventory), character);
}

function migrateV1(raw: unknown, context: SaveValidationContext): SaveV2 {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid legacy save');
  const save = raw as Partial<LegacySaveV1>;
  if (save.version !== 1) throw new Error('Unsupported legacy save version');
  if (save.pack !== context.pack) throw new Error('Save resource pack mismatch');
  if (typeof save.character !== 'string' || !context.characters.includes(save.character)) throw new Error('Unknown save character');
  if (save.mapId !== undefined && !integerIn(save.mapId, 0, 100000)) throw new Error('Invalid legacy save map');
  if (!Number.isFinite(save.x) || !Number.isFinite(save.y) || (save.x as number) < 0 || (save.y as number) < 0) throw new Error('Invalid legacy save coordinates');
  if (!integerIn(save.gold, 0, Number.MAX_SAFE_INTEGER)) throw new Error('Invalid legacy save gold');
  if (typeof save.savedAt !== 'string' || !Number.isFinite(Date.parse(save.savedAt))) throw new Error('Invalid legacy save timestamp');
  const migrated: SaveV2 = {
    kind: SAVE_KIND,
    version: CURRENT_SAVE_VERSION,
    pack: save.pack,
    character: save.character,
    mapId: save.mapId ?? 0,
    x: save.x as number,
    y: save.y as number,
    gold: save.gold,
    inventory: migrateLegacyInventory(save.inventory, save.character),
    quest: save.quest ?? {guide: 'not_started'},
    questFlags: {},
    progression: initialProgression(),
    rewardReceipts: [],
    savedAt: save.savedAt,
  };
  return validateSaveV2(migrated, context);
}

export function migrateSave(raw: unknown, context: SaveValidationContext): SaveV2 {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid save');
  const version = (raw as {version?: unknown}).version;
  if (version === CURRENT_SAVE_VERSION) return validateSaveV2(raw, context);
  if (version === 1) return migrateV1(raw, context);
  throw new Error('Unsupported save version');
}

export function deserializeSave(serialized: string, context: SaveValidationContext): SaveV2 {
  if (typeof serialized !== 'string' || new TextEncoder().encode(serialized).byteLength > MAX_SERIALIZED_SAVE_BYTES) throw new Error('Save payload too large');
  let raw: unknown;
  try { raw = JSON.parse(serialized); }
  catch { throw new Error('Invalid save JSON'); }
  return migrateSave(raw, context);
}

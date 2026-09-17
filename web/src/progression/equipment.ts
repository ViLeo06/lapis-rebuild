import {itemMetadata, validateInventory} from './inventory.ts';
import type {ClassFamily, EquipmentSlot, InventoryState, ItemMetadata} from './inventory.ts';

const SWORDSMAN_IDS = new Set([100,110,120,130,140,150,160,170,180,190]);
const WIZARD_IDS = new Set([109,119,129,139,149,159,169,179,189,199]);

export type EquipmentCompatibilityResolver = (characterId: string, item: ItemMetadata) => boolean;
export type EquipmentReconcileResult = { inventory: InventoryState; unequipped: number[] };

export function classFamilyForCharacter(characterId: string): ClassFamily | null {
  const id = Number(characterId);
  if (SWORDSMAN_IDS.has(id)) return 'swordsman';
  if (WIZARD_IDS.has(id)) return 'wizard';
  return null;
}

// The role field in data/items/training-catalog.json is an M3/M4 gameplay compatibility
// aid and remains UNVERIFIED; S13 may replace this resolver with S11 class definitions.
export const legacyTrainingCompatibility: EquipmentCompatibilityResolver = (characterId, item) =>
  classFamilyForCharacter(characterId) === item.classRestriction;

export function validateEquipment(inventory: InventoryState, characterId: string, resolver: EquipmentCompatibilityResolver = legacyTrainingCompatibility): InventoryState {
  const valid = validateInventory(inventory);
  if (!classFamilyForCharacter(characterId)) throw new Error('Unsupported character for equipment validation');
  for (const slot of ['weapon', 'armor'] as const) {
    const itemId = valid.equipped[slot];
    if (itemId === null) continue;
    const item = itemMetadata(itemId);
    if (item.slot !== slot || !resolver(characterId, item)) throw new Error('Incompatible equipped item');
  }
  return valid;
}

export function equipItem(inventory: InventoryState, characterId: string, slot: EquipmentSlot, itemId: number | null, resolver: EquipmentCompatibilityResolver = legacyTrainingCompatibility): InventoryState {
  const valid = validateInventory(inventory);
  if (itemId !== null) {
    const owned = valid.items.find(item => item.itemId === itemId);
    const item = itemMetadata(itemId);
    if (!owned || item.slot !== slot || !resolver(characterId, item)) throw new Error('Incompatible equipment selection');
  }
  const next = {...valid, equipped: {...valid.equipped, [slot]: itemId}};
  return validateEquipment(next, characterId, resolver);
}

export function reconcileEquipmentForCharacter(inventory: InventoryState, characterId: string, resolver: EquipmentCompatibilityResolver = legacyTrainingCompatibility): EquipmentReconcileResult {
  if (!classFamilyForCharacter(characterId)) throw new Error('Unsupported character for equipment reconciliation');
  const valid = validateInventory(inventory);
  const next: InventoryState = {items: valid.items, equipped: {...valid.equipped}};
  const unequipped: number[] = [];
  for (const slot of ['weapon', 'armor'] as const) {
    const itemId = next.equipped[slot];
    if (itemId !== null && !resolver(characterId, itemMetadata(itemId))) {
      unequipped.push(itemId);
      next.equipped[slot] = null;
    }
  }
  return {inventory: validateEquipment(next, characterId, resolver), unequipped};
}

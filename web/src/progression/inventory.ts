import catalogData from '../../../data/items/training-catalog.json' with { type: 'json' };

export type EquipmentSlot = 'weapon' | 'armor';
export type AcquisitionKind = 'starter' | 'battle' | 'quest' | 'migration' | 'system';
export type AcquisitionSource = {
  kind: AcquisitionKind;
  ref: string;
  quantity: number;
};
export type InventoryItem = {
  itemId: number;
  quantity: number;
  metadataRef: string;
  acquisitionSources: AcquisitionSource[];
};
export type InventoryState = {
  items: InventoryItem[];
  equipped: Record<EquipmentSlot, number | null>;
};
export type ClassFamily = 'swordsman' | 'wizard';
export type ItemMetadata = {
  itemId: number;
  name: string;
  description: string;
  metadataRef: string;
  slot: EquipmentSlot;
  classRestriction: ClassFamily;
  textEvidence: 'VERIFIED' | string;
  compatibilityEvidence: 'UNVERIFIED' | string;
};

const MAX_ITEM_TYPES = 256;
const MAX_QUANTITY = 9999;
const MAX_SOURCES_PER_ITEM = 32;
const catalog = catalogData.items as Array<{
  item_id: number;
  name: string;
  description: string;
  text_evidence: string;
  training: { slot: EquipmentSlot; role: ClassFamily; evidence: string };
}>;

const metadata = new Map<number, ItemMetadata>(catalog.map(item => [item.item_id, {
  itemId: item.item_id,
  name: item.name,
  description: item.description,
  metadataRef: `itemtbl:${item.item_id}`,
  slot: item.training.slot,
  classRestriction: item.training.role,
  textEvidence: item.text_evidence,
  compatibilityEvidence: item.training.evidence,
}]));

const integerIn = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

function validateSource(raw: unknown): AcquisitionSource {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid acquisition source');
  const source = raw as Partial<AcquisitionSource>;
  if (!['starter', 'battle', 'quest', 'migration', 'system'].includes(String(source.kind))) throw new Error('Invalid acquisition source kind');
  if (typeof source.ref !== 'string' || source.ref.length < 1 || source.ref.length > 128) throw new Error('Invalid acquisition source ref');
  if (!integerIn(source.quantity, 1, MAX_QUANTITY)) throw new Error('Invalid acquisition quantity');
  return {kind: source.kind as AcquisitionKind, ref: source.ref, quantity: source.quantity};
}

export function itemMetadata(itemId: number): ItemMetadata {
  const item = metadata.get(itemId);
  if (!item) throw new Error(`Unknown item ${itemId}`);
  return {...item};
}

export function knownItemIds(): number[] {
  return [...metadata.keys()].sort((a, b) => a - b);
}

export function emptyInventory(): InventoryState {
  return {items: [], equipped: {weapon: null, armor: null}};
}

export function validateInventory(raw: unknown): InventoryState {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid inventory');
  const input = raw as Partial<InventoryState>;
  if (!Array.isArray(input.items) || input.items.length > MAX_ITEM_TYPES) throw new Error('Invalid inventory items');
  if (!input.equipped || typeof input.equipped !== 'object') throw new Error('Invalid equipment state');
  const seen = new Set<number>();
  const items = input.items.map(rawItem => {
    if (!rawItem || typeof rawItem !== 'object') throw new Error('Invalid inventory item');
    const item = rawItem as Partial<InventoryItem>;
    if (!integerIn(item.itemId, 0, Number.MAX_SAFE_INTEGER) || seen.has(item.itemId)) throw new Error('Invalid inventory item id');
    seen.add(item.itemId);
    const meta = itemMetadata(item.itemId);
    if (!integerIn(item.quantity, 1, MAX_QUANTITY)) throw new Error('Invalid inventory item quantity');
    if (item.metadataRef !== meta.metadataRef) throw new Error('Invalid inventory metadata reference');
    if (!Array.isArray(item.acquisitionSources) || item.acquisitionSources.length < 1 || item.acquisitionSources.length > MAX_SOURCES_PER_ITEM) throw new Error('Invalid acquisition sources');
    const acquisitionSources = item.acquisitionSources.map(validateSource);
    return {itemId: item.itemId, quantity: item.quantity, metadataRef: item.metadataRef, acquisitionSources};
  }).sort((a, b) => a.itemId - b.itemId);
  const equipped = input.equipped as Record<EquipmentSlot, unknown>;
  const resultEquipped = {weapon: null as number | null, armor: null as number | null};
  for (const slot of ['weapon', 'armor'] as const) {
    const itemId = equipped[slot];
    if (itemId === null) continue;
    if (!integerIn(itemId, 0, Number.MAX_SAFE_INTEGER) || !seen.has(itemId) || itemMetadata(itemId).slot !== slot) throw new Error('Invalid equipped item');
    resultEquipped[slot] = itemId;
  }
  return {items, equipped: resultEquipped};
}

export function createInventory(entries: Array<{itemId: number; quantity?: number; source: Omit<AcquisitionSource, 'quantity'>}> = []): InventoryState {
  let state = emptyInventory();
  for (const entry of entries) state = grantItem(state, entry.itemId, entry.quantity ?? 1, entry.source);
  return state;
}

export function quantityOf(inventory: InventoryState, itemId: number): number {
  return validateInventory(inventory).items.find(item => item.itemId === itemId)?.quantity ?? 0;
}

export function grantItem(inventory: InventoryState, itemId: number, quantity: number, source: Omit<AcquisitionSource, 'quantity'>): InventoryState {
  itemMetadata(itemId);
  if (!integerIn(quantity, 1, MAX_QUANTITY)) throw new Error('Invalid grant quantity');
  const base = validateInventory(inventory);
  const next: InventoryState = {items: base.items.map(item => ({...item, acquisitionSources: item.acquisitionSources.map(entry => ({...entry}))})), equipped: {...base.equipped}};
  const existing = next.items.find(item => item.itemId === itemId);
  if (existing) {
    if (existing.quantity + quantity > MAX_QUANTITY) throw new Error('Inventory quantity overflow');
    existing.quantity += quantity;
    const sameSource = existing.acquisitionSources.find(entry => entry.kind === source.kind && entry.ref === source.ref);
    if (sameSource) sameSource.quantity += quantity;
    else {
      if (existing.acquisitionSources.length >= MAX_SOURCES_PER_ITEM) throw new Error('Too many acquisition sources');
      existing.acquisitionSources.push({...source, quantity});
    }
  } else {
    if (next.items.length >= MAX_ITEM_TYPES) throw new Error('Inventory item type limit exceeded');
    next.items.push({itemId, quantity, metadataRef: itemMetadata(itemId).metadataRef, acquisitionSources: [{...source, quantity}]});
    next.items.sort((a, b) => a.itemId - b.itemId);
  }
  return validateInventory(next);
}

export function consumeItem(inventory: InventoryState, itemId: number, quantity: number): InventoryState {
  if (!integerIn(quantity, 1, MAX_QUANTITY)) throw new Error('Invalid consume quantity');
  const base = validateInventory(inventory);
  const item = base.items.find(entry => entry.itemId === itemId);
  if (!item || item.quantity < quantity) throw new Error('Insufficient item quantity');
  const remaining = item.quantity - quantity;
  if (remaining === 0 && Object.values(base.equipped).includes(itemId)) throw new Error('Cannot remove equipped item');
  const next = {items: base.items.map(entry => ({...entry, acquisitionSources: entry.acquisitionSources.map(source => ({...source}))})), equipped: {...base.equipped}};
  const target = next.items.find(entry => entry.itemId === itemId)!;
  if (remaining === 0) next.items = next.items.filter(entry => entry.itemId !== itemId);
  else target.quantity = remaining;
  return validateInventory(next);
}

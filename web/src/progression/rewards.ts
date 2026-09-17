import {grantItem, validateInventory} from './inventory.ts';
import type {InventoryState} from './inventory.ts';
import {applyExperience, validateProgression} from './progression.ts';
import type {LevelUpEvent, ProgressionState} from './progression.ts';

export type RewardSource = { kind: 'battle' | 'quest' | 'system'; ref: string };
export type RewardItem = { itemId: number; quantity: number };
export type RewardBundle = {
  receiptId: string;
  source: RewardSource;
  gold?: number;
  items?: RewardItem[];
  questFlags?: string[];
  exp?: number;
};
export type RewardState = {
  gold: number;
  inventory: InventoryState;
  progression: ProgressionState;
  questFlags: Record<string, true>;
  rewardReceipts: string[];
};
export type RewardEvent =
  | {type: 'gold'; amount: number; source: RewardSource}
  | {type: 'item'; itemId: number; quantity: number; source: RewardSource}
  | {type: 'quest_flag'; flag: string; source: RewardSource}
  | {type: 'exp'; amount: number; source: RewardSource}
  | LevelUpEvent;
export type RewardApplication = { state: RewardState; events: RewardEvent[]; applied: boolean };

const integerIn = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const validToken = (value: unknown, max = 128): value is string =>
  typeof value === 'string' && value.length >= 1 && value.length <= max && /^[A-Za-z0-9._:/-]+$/.test(value);

function validateSource(source: RewardSource): RewardSource {
  if (!source || !['battle', 'quest', 'system'].includes(source.kind) || !validToken(source.ref)) throw new Error('Invalid reward source');
  return {...source};
}

export function validateRewardState(raw: RewardState): RewardState {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid reward state');
  if (!integerIn(raw.gold, 0, Number.MAX_SAFE_INTEGER)) throw new Error('Invalid gold');
  const inventory = validateInventory(raw.inventory);
  const progression = validateProgression(raw.progression);
  if (!raw.questFlags || typeof raw.questFlags !== 'object' || Array.isArray(raw.questFlags)) throw new Error('Invalid quest flags');
  const questFlags: Record<string, true> = {};
  for (const [flag, value] of Object.entries(raw.questFlags)) {
    if (!validToken(flag) || value !== true) throw new Error('Invalid quest flag');
    questFlags[flag] = true;
  }
  if (!Array.isArray(raw.rewardReceipts) || raw.rewardReceipts.length > 512 || new Set(raw.rewardReceipts).size !== raw.rewardReceipts.length || !raw.rewardReceipts.every(id => validToken(id))) throw new Error('Invalid reward receipts');
  return {gold: raw.gold, inventory, progression, questFlags, rewardReceipts: [...raw.rewardReceipts]};
}

export function validateRewardBundle(bundle: RewardBundle): RewardBundle {
  if (!bundle || typeof bundle !== 'object' || !validToken(bundle.receiptId)) throw new Error('Invalid reward receipt');
  const source = validateSource(bundle.source);
  const gold = bundle.gold ?? 0;
  const exp = bundle.exp ?? 0;
  if (!integerIn(gold, 0, Number.MAX_SAFE_INTEGER) || !integerIn(exp, 0, Number.MAX_SAFE_INTEGER)) throw new Error('Invalid reward amount');
  const items = (bundle.items ?? []).map(item => {
    if (!item || !integerIn(item.itemId, 0, Number.MAX_SAFE_INTEGER) || !integerIn(item.quantity, 1, 9999)) throw new Error('Invalid reward item');
    return {...item};
  });
  const questFlags = [...(bundle.questFlags ?? [])];
  if (questFlags.length > 64 || new Set(questFlags).size !== questFlags.length || !questFlags.every(flag => validToken(flag))) throw new Error('Invalid reward flags');
  return {receiptId: bundle.receiptId, source, gold, exp, items, questFlags};
}

export function applyRewardBundle(state: RewardState, bundle: RewardBundle): RewardApplication {
  const current = validateRewardState(state);
  const reward = validateRewardBundle(bundle);
  if (current.rewardReceipts.includes(reward.receiptId)) return {state: current, events: [], applied: false};
  if (current.gold + (reward.gold ?? 0) > Number.MAX_SAFE_INTEGER) throw new Error('Gold overflow');
  let inventory = current.inventory;
  const events: RewardEvent[] = [];
  for (const item of reward.items ?? []) {
    inventory = grantItem(inventory, item.itemId, item.quantity, {kind: reward.source.kind === 'battle' ? 'battle' : reward.source.kind === 'quest' ? 'quest' : 'system', ref: reward.source.ref});
    events.push({type: 'item', itemId: item.itemId, quantity: item.quantity, source: reward.source});
  }
  const expResult = applyExperience(current.progression, reward.exp ?? 0);
  if ((reward.gold ?? 0) > 0) events.push({type: 'gold', amount: reward.gold!, source: reward.source});
  if ((reward.exp ?? 0) > 0) events.push({type: 'exp', amount: reward.exp!, source: reward.source});
  for (const flag of reward.questFlags ?? []) events.push({type: 'quest_flag', flag, source: reward.source});
  events.push(...expResult.levelUps);
  const questFlags = {...current.questFlags};
  for (const flag of reward.questFlags ?? []) questFlags[flag] = true;
  const next: RewardState = {
    gold: current.gold + (reward.gold ?? 0),
    inventory,
    progression: expResult.state,
    questFlags,
    rewardReceipts: [...current.rewardReceipts, reward.receiptId],
  };
  return {state: validateRewardState(next), events, applied: true};
}

export function applyBattleReward(state: RewardState, battleRef: string, receiptId: string, reward: Omit<RewardBundle, 'source' | 'receiptId'>): RewardApplication {
  return applyRewardBundle(state, {...reward, source: {kind: 'battle', ref: battleRef}, receiptId});
}

export function applyQuestReward(state: RewardState, questRef: string, receiptId: string, reward: Omit<RewardBundle, 'source' | 'receiptId'>): RewardApplication {
  return applyRewardBundle(state, {...reward, source: {kind: 'quest', ref: questRef}, receiptId});
}

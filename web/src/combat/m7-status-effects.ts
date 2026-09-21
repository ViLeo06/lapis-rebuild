export type M7StatusEvidence = 'RECONSTRUCTION_POLICY';

export type M7StatusKind =
  | 'stun'
  | 'physical-damage-reduction'
  | 'attack-modifier'
  | 'max-hp-modifier'
  | 'incoming-physical-damage-penalty'
  | 'periodic-self-damage'
  | 'command-range-modifier'
  | 'readiness-efficiency-modifier'
  | 'composite';

export type M7PeriodicSelfDamage = Readonly<{
  amount: number;
  intervalMs: number;
  elapsedMs: number;
  minimumHp: number;
}>;

export type M7StatusModifiers = Readonly<{
  attackMultiplier?: number;
  physicalDamageReduction?: number;
  maxHpMultiplier?: number;
  incomingPhysicalDamageMultiplier?: number;
  commandRangeFlat?: number;
  readinessEfficiencyMultiplier?: number;
  periodicSelfDamage?: M7PeriodicSelfDamage;
}>;

export type M7StatusEffect = Readonly<{
  id: string;
  kind: M7StatusKind;
  sourceSkillKey: string;
  sourceSkillLevel: number;
  remainingMs: number | null;
  blockedActions: number;
  stacking: 'refresh';
  modifiers: M7StatusModifiers;
  provenance: M7StatusEvidence;
}>;

export type M7StatusAdvanceEvent = Readonly<{
  type: 'periodic-self-damage';
  sourceSkillKey: string;
  ticks: number;
  hpLost: number;
}>;

export type M7StatusAdvanceResult = Readonly<{
  currentHp: number;
  statuses: readonly M7StatusEffect[];
  events: readonly M7StatusAdvanceEvent[];
}>;

const TOKEN = /^[A-Za-z0-9._:/-]+$/;

function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${label}`);
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) < 0) throw new Error(`Invalid ${label}`);
  return value as number;
}

function positive(value: unknown, label: string): number {
  const number = finite(value, label);
  if (number <= 0) throw new Error(`Invalid ${label}`);
  return number;
}

function optionalUnitFraction(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  const number = finite(value, label);
  if (number < 0 || number > 1) throw new Error(`Invalid ${label}`);
  return number;
}

function validateModifiers(raw: unknown): M7StatusModifiers {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid status modifiers');
  const value = raw as Record<string, unknown>;
  const allowed = new Set([
    'attackMultiplier',
    'physicalDamageReduction',
    'maxHpMultiplier',
    'incomingPhysicalDamageMultiplier',
    'commandRangeFlat',
    'readinessEfficiencyMultiplier',
    'periodicSelfDamage',
  ]);
  if (Object.keys(value).some(key => !allowed.has(key))) throw new Error('Unknown status modifier');

  const attackMultiplier = value.attackMultiplier === undefined
    ? undefined : positive(value.attackMultiplier, 'attack multiplier');
  const physicalDamageReduction = optionalUnitFraction(value.physicalDamageReduction, 'physical damage reduction');
  const maxHpMultiplier = value.maxHpMultiplier === undefined
    ? undefined : positive(value.maxHpMultiplier, 'max HP multiplier');
  const incomingPhysicalDamageMultiplier = value.incomingPhysicalDamageMultiplier === undefined
    ? undefined : positive(value.incomingPhysicalDamageMultiplier, 'incoming physical damage multiplier');
  const commandRangeFlat = value.commandRangeFlat === undefined
    ? undefined : finite(value.commandRangeFlat, 'command range modifier');
  const readinessEfficiencyMultiplier = value.readinessEfficiencyMultiplier === undefined
    ? undefined : positive(value.readinessEfficiencyMultiplier, 'readiness efficiency multiplier');

  let periodicSelfDamage: M7PeriodicSelfDamage | undefined;
  if (value.periodicSelfDamage !== undefined) {
    const rawPeriodic = value.periodicSelfDamage;
    if (!rawPeriodic || typeof rawPeriodic !== 'object' || Array.isArray(rawPeriodic)) {
      throw new Error('Invalid periodic self damage');
    }
    const periodic = rawPeriodic as Record<string, unknown>;
    const periodicKeys = new Set(['amount', 'intervalMs', 'elapsedMs', 'minimumHp']);
    if (Object.keys(periodic).some(key => !periodicKeys.has(key))) throw new Error('Unknown periodic self damage field');
    const amount = positive(periodic.amount, 'periodic self damage amount');
    const intervalMs = positive(periodic.intervalMs, 'periodic self damage interval');
    const elapsedMs = finite(periodic.elapsedMs, 'periodic self damage elapsed');
    const minimumHp = finite(periodic.minimumHp, 'periodic self damage minimum HP');
    if (elapsedMs < 0 || elapsedMs >= intervalMs) throw new Error('Invalid periodic self damage elapsed');
    if (minimumHp < 0) throw new Error('Invalid periodic self damage minimum HP');
    periodicSelfDamage = Object.freeze({amount, intervalMs, elapsedMs, minimumHp});
  }

  return Object.freeze({
    ...(attackMultiplier === undefined ? {} : {attackMultiplier}),
    ...(physicalDamageReduction === undefined ? {} : {physicalDamageReduction}),
    ...(maxHpMultiplier === undefined ? {} : {maxHpMultiplier}),
    ...(incomingPhysicalDamageMultiplier === undefined ? {} : {incomingPhysicalDamageMultiplier}),
    ...(commandRangeFlat === undefined ? {} : {commandRangeFlat}),
    ...(readinessEfficiencyMultiplier === undefined ? {} : {readinessEfficiencyMultiplier}),
    ...(periodicSelfDamage === undefined ? {} : {periodicSelfDamage}),
  });
}

export function validateM7StatusEffect(raw: unknown): M7StatusEffect {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid M7 status effect');
  const value = raw as Record<string, unknown>;
  const allowed = new Set([
    'id', 'kind', 'sourceSkillKey', 'sourceSkillLevel', 'remainingMs',
    'blockedActions', 'stacking', 'modifiers', 'provenance',
  ]);
  if (Object.keys(value).some(key => !allowed.has(key))) throw new Error('Unknown M7 status field');
  if (typeof value.id !== 'string' || !value.id.length || value.id.length > 96 || !TOKEN.test(value.id)) throw new Error('Invalid status id');
  const kinds: readonly M7StatusKind[] = [
    'stun', 'physical-damage-reduction', 'attack-modifier', 'max-hp-modifier',
    'incoming-physical-damage-penalty', 'periodic-self-damage', 'command-range-modifier',
    'readiness-efficiency-modifier', 'composite',
  ];
  if (!kinds.includes(value.kind as M7StatusKind)) throw new Error('Invalid status kind');
  if (typeof value.sourceSkillKey !== 'string' || !value.sourceSkillKey.length || value.sourceSkillKey.length > 64 || !TOKEN.test(value.sourceSkillKey)) throw new Error('Invalid status source skill');
  if (!Number.isInteger(value.sourceSkillLevel) || (value.sourceSkillLevel as number) < 1 || (value.sourceSkillLevel as number) > 6) throw new Error('Invalid status source skill level');
  let remainingMs: number | null;
  if (value.remainingMs === null) remainingMs = null;
  else {
    remainingMs = finite(value.remainingMs, 'status remaining time');
    if (remainingMs <= 0) throw new Error('Invalid status remaining time');
  }
  const blockedActions = nonNegativeInteger(value.blockedActions, 'blocked actions');
  if (blockedActions > 16) throw new Error('Invalid blocked actions');
  if (remainingMs === null && blockedActions === 0) throw new Error('Status must have a time or action lifetime');
  if (value.stacking !== 'refresh' || value.provenance !== 'RECONSTRUCTION_POLICY') throw new Error('Unsupported status policy');
  const modifiers = validateModifiers(value.modifiers);
  return Object.freeze({
    id: value.id,
    kind: value.kind as M7StatusKind,
    sourceSkillKey: value.sourceSkillKey,
    sourceSkillLevel: value.sourceSkillLevel as number,
    remainingMs,
    blockedActions,
    stacking: 'refresh',
    modifiers,
    provenance: 'RECONSTRUCTION_POLICY',
  });
}

export function upsertM7Status(
  statuses: readonly M7StatusEffect[],
  effect: M7StatusEffect,
): readonly M7StatusEffect[] {
  const validated = validateM7StatusEffect(effect);
  const next = statuses
    .map(validateM7StatusEffect)
    .filter(status => status.id !== validated.id);
  next.push(validated);
  return Object.freeze(next);
}

export function m7AttackMultiplier(statuses: readonly M7StatusEffect[]): number {
  return statuses.map(validateM7StatusEffect).reduce(
    (multiplier, status) => multiplier * (status.modifiers.attackMultiplier ?? 1),
    1,
  );
}

export function m7MaxHpMultiplier(statuses: readonly M7StatusEffect[]): number {
  return statuses.map(validateM7StatusEffect).reduce(
    (multiplier, status) => multiplier * (status.modifiers.maxHpMultiplier ?? 1),
    1,
  );
}

export function m7EffectiveMaxHp(baseMaxHp: number, statuses: readonly M7StatusEffect[]): number {
  positive(baseMaxHp, 'base max HP');
  return Math.max(1, Math.round(baseMaxHp * m7MaxHpMultiplier(statuses)));
}

export function m7EffectivePhysicalAttack(baseAttack: number, statuses: readonly M7StatusEffect[]): number {
  if (finite(baseAttack, 'base attack') < 0) throw new Error('Invalid base attack');
  return Math.max(0, Math.round(baseAttack * m7AttackMultiplier(statuses)));
}

export function m7EffectiveCommandRange(baseRange: number, statuses: readonly M7StatusEffect[]): number {
  if (finite(baseRange, 'base command range') < 0) throw new Error('Invalid base command range');
  const bonus = statuses.map(validateM7StatusEffect).reduce(
    (sum, status) => sum + (status.modifiers.commandRangeFlat ?? 0),
    0,
  );
  return Math.max(0, baseRange + bonus);
}

export function m7ReadinessEfficiencyMultiplier(statuses: readonly M7StatusEffect[]): number {
  return statuses.map(validateM7StatusEffect).reduce(
    (multiplier, status) => multiplier * (status.modifiers.readinessEfficiencyMultiplier ?? 1),
    1,
  );
}

export function m7AdjustIncomingDamage(
  amount: number,
  kind: 'physical' | 'magic',
  statuses: readonly M7StatusEffect[],
): number {
  if (finite(amount, 'incoming damage') < 0) throw new Error('Invalid incoming damage');
  if (kind === 'magic') return Math.round(amount);
  const valid = statuses.map(validateM7StatusEffect);
  const reduction = valid.reduce(
    (best, status) => Math.max(best, status.modifiers.physicalDamageReduction ?? 0),
    0,
  );
  const penalty = valid.reduce(
    (multiplier, status) => multiplier * (status.modifiers.incomingPhysicalDamageMultiplier ?? 1),
    1,
  );
  return Math.max(0, Math.round(amount * (1 - reduction) * penalty));
}

export function m7IsStunned(statuses: readonly M7StatusEffect[]): boolean {
  return statuses.map(validateM7StatusEffect).some(status => status.kind === 'stun' && status.blockedActions > 0);
}

export function consumeM7BlockedAction(statuses: readonly M7StatusEffect[]): Readonly<{
  blocked: boolean;
  statuses: readonly M7StatusEffect[];
}> {
  const valid = statuses.map(validateM7StatusEffect);
  const index = valid.findIndex(status => status.kind === 'stun' && status.blockedActions > 0);
  if (index < 0) return Object.freeze({blocked: false, statuses: Object.freeze(valid)});
  const selected = valid[index]!;
  const remaining = selected.blockedActions - 1;
  const next = valid.slice();
  if (remaining === 0 && selected.remainingMs === null) next.splice(index, 1);
  else next[index] = validateM7StatusEffect({...selected, blockedActions: remaining});
  return Object.freeze({blocked: true, statuses: Object.freeze(next)});
}

export function advanceM7Statuses(
  currentHp: number,
  baseMaxHp: number,
  statuses: readonly M7StatusEffect[],
  elapsedMs: number,
): M7StatusAdvanceResult {
  positive(baseMaxHp, 'base max HP');
  if (finite(currentHp, 'current HP') < 0) throw new Error('Invalid current HP');
  if (finite(elapsedMs, 'elapsed status time') < 0) throw new Error('Invalid elapsed status time');
  let hp = currentHp;
  const next: M7StatusEffect[] = [];
  const events: M7StatusAdvanceEvent[] = [];

  for (const original of statuses.map(validateM7StatusEffect)) {
    const activeElapsed = original.remainingMs === null ? elapsedMs : Math.min(elapsedMs, original.remainingMs);
    let modifiers: M7StatusModifiers = original.modifiers;
    const periodic = original.modifiers.periodicSelfDamage;
    if (periodic && activeElapsed > 0) {
      const totalElapsed = periodic.elapsedMs + activeElapsed;
      const ticks = Math.floor(totalElapsed / periodic.intervalMs);
      const updatedElapsed = totalElapsed % periodic.intervalMs;
      if (ticks > 0) {
        const available = Math.max(0, hp - periodic.minimumHp);
        const requested = ticks * periodic.amount;
        const lost = Math.min(available, requested);
        hp -= lost;
        events.push(Object.freeze({
          type: 'periodic-self-damage',
          sourceSkillKey: original.sourceSkillKey,
          ticks,
          hpLost: lost,
        }));
      }
      modifiers = Object.freeze({
        ...original.modifiers,
        periodicSelfDamage: Object.freeze({...periodic, elapsedMs: updatedElapsed}),
      });
    }

    if (original.remainingMs === null) {
      next.push(validateM7StatusEffect({...original, modifiers}));
      continue;
    }
    const remainingMs = original.remainingMs - elapsedMs;
    if (remainingMs > 0) next.push(validateM7StatusEffect({...original, remainingMs, modifiers}));
  }

  const effectiveMax = m7EffectiveMaxHp(baseMaxHp, next);
  hp = Math.min(hp, effectiveMax);
  return Object.freeze({
    currentHp: hp,
    statuses: Object.freeze(next),
    events: Object.freeze(events),
  });
}

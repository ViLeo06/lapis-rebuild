export const PROGRESSION_PROVENANCE = 'RECONSTRUCTION_POLICY' as const;
export const RECONSTRUCTION_PROGRESSION_POLICY = Object.freeze({
  id: 'm4-linear-100x-level-v1',
  provenance: PROGRESSION_PROVENANCE,
  maxLevel: 99,
  note: 'No retail EXP/level-up formula is currently recovered; this replaceable curve exists only for offline M4 play.',
});

export type ProgressionState = { level: number; exp: number; policyId: string };
export type LevelUpEvent = {
  type: 'level_up';
  fromLevel: number;
  toLevel: number;
  totalExp: number;
  provenance: typeof PROGRESSION_PROVENANCE;
};
export type ExperienceResult = { state: ProgressionState; levelUps: LevelUpEvent[] };

const integerIn = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

export function totalExpForLevel(level: number): number {
  if (!integerIn(level, 1, RECONSTRUCTION_PROGRESSION_POLICY.maxLevel)) throw new Error('Invalid level');
  return 50 * (level - 1) * level;
}

export function levelForExperience(exp: number): number {
  if (!integerIn(exp, 0, Number.MAX_SAFE_INTEGER)) throw new Error('Invalid experience');
  let level = 1;
  while (level < RECONSTRUCTION_PROGRESSION_POLICY.maxLevel && exp >= totalExpForLevel(level + 1)) level += 1;
  return level;
}

export function initialProgression(): ProgressionState {
  return {level: 1, exp: 0, policyId: RECONSTRUCTION_PROGRESSION_POLICY.id};
}

export function validateProgression(raw: unknown): ProgressionState {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid progression');
  const state = raw as Partial<ProgressionState>;
  if (state.policyId !== RECONSTRUCTION_PROGRESSION_POLICY.id) throw new Error('Unknown progression policy');
  if (!integerIn(state.exp, 0, Number.MAX_SAFE_INTEGER)) throw new Error('Invalid experience');
  const expectedLevel = levelForExperience(state.exp);
  if (state.level !== expectedLevel) throw new Error('Progression level/experience mismatch');
  return {level: expectedLevel, exp: state.exp, policyId: state.policyId};
}

export function applyExperience(state: ProgressionState, amount: number): ExperienceResult {
  const current = validateProgression(state);
  if (!integerIn(amount, 0, Number.MAX_SAFE_INTEGER - current.exp)) throw new Error('Invalid experience reward');
  const exp = current.exp + amount;
  const level = levelForExperience(exp);
  const levelUps: LevelUpEvent[] = [];
  for (let next = current.level + 1; next <= level; next += 1) {
    levelUps.push({type: 'level_up', fromLevel: next - 1, toLevel: next, totalExp: totalExpForLevel(next), provenance: PROGRESSION_PROVENANCE});
  }
  return {state: {level, exp, policyId: current.policyId}, levelUps};
}

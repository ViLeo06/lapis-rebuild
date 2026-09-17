import {playableClassById} from '../content/classes/class-catalog.ts';
import {skillById} from '../content/skills/skill-catalog.ts';
import type {ClassFamily, ProvenanceLevel} from '../content/content-types.ts';

export const COMBAT_BALANCE_PROVENANCE = 'RECONSTRUCTION_POLICY' as const;

export type DamageKind = 'physical' | 'magic';
export type EnemyRank = 'normal' | 'elite' | 'boss';
export type EnemyRole = 'melee' | 'ranged' | 'caster';

export type EquipmentCombatBonuses = Readonly<{
  maxHp?: number;
  maxMp?: number;
  attack?: number;
  defense?: number;
  magicAttack?: number;
  magicDefense?: number;
  accuracy?: number;
  magicAccuracy?: number;
  evasion?: number;
  criticalChance?: number;
}>;

export type AuthoredCombatAnchors = Readonly<{
  hp: number;
  mp: number;
  hit: number;
  magicHit: number;
  provenance: ProvenanceLevel;
}>;

export type CombatantStats = Readonly<{
  id: string;
  side: 'player' | 'enemy';
  family: ClassFamily | null;
  rank: EnemyRank | null;
  role: EnemyRole | null;
  level: number;
  maxHp: number;
  maxMp: number;
  attack: number;
  defense: number;
  magicAttack: number;
  magicDefense: number;
  accuracy: number;
  magicAccuracy: number;
  evasion: number;
  criticalChance: number;
  criticalResistance: number;
  criticalMultiplier: number;
  authoredAnchors: AuthoredCombatAnchors | null;
  provenance: typeof COMBAT_BALANCE_PROVENANCE;
}>;

export type SkillBalance = Readonly<{
  skillId: number;
  mpCost: number;
  kind: DamageKind | 'support';
  multiplier: number;
  hits: number;
  accuracyModifier: number;
  criticalBonus: number;
  dot: Readonly<{ticks: number; multiplierPerTick: number}> | null;
  support: Readonly<{
    defenseMultiplier?: number;
    enemyAccuracyPenalty?: number;
    manaOnHit?: number;
    durationActions: number;
  }> | null;
  authoredMpProvenance: ProvenanceLevel;
  provenance: typeof COMBAT_BALANCE_PROVENANCE;
}>;

export type AttackProfile = Readonly<{
  kind: DamageKind;
  multiplier: number;
  hits: number;
  accuracyModifier?: number;
  criticalBonus?: number;
}>;

export type StrikeResult = Readonly<{
  hit: boolean;
  critical: boolean;
  damage: number;
  hitChance: number;
  criticalChance: number;
}>;

export type AttackResolution = Readonly<{
  strikes: readonly StrikeResult[];
  totalDamage: number;
  dotDamagePerTick: number;
  dotTicks: number;
  provenance: typeof COMBAT_BALANCE_PROVENANCE;
}>;

export type EnemyBuildInput = Readonly<{
  id?: string;
  level?: number;
  rank?: EnemyRank;
  role?: EnemyRole;
}>;

export type EnemyRewardInput = Readonly<{level: number; rank: EnemyRank}>;

export type CombatReward = Readonly<{
  gold: number;
  exp: number;
  provenance: typeof COMBAT_BALANCE_PROVENANCE;
}>;

type FamilyBase = Readonly<{
  attack: number;
  defense: number;
  magicAttack: number;
  magicDefense: number;
  evasion: number;
  criticalChance: number;
  criticalResistance: number;
}>;

type EnemyRankTuning = Readonly<{
  hp: number;
  offense: number;
  defense: number;
  reward: number;
}>;

type EnemyRoleTuning = Readonly<{
  hp: number;
  attack: number;
  defense: number;
  magicAttack: number;
  magicDefense: number;
  evasion: number;
}>;

export type CombatBalanceTuning = Readonly<{
  id: string;
  provenance: typeof COMBAT_BALANCE_PROVENANCE;
  level: Readonly<{
    min: number;
    max: number;
    playerHpGrowth: number;
    playerMpFlatGrowth: number;
    playerStatGrowth: number;
    playerAccuracyFlatGrowth: number;
    enemyHpGrowth: number;
    enemyStatGrowth: number;
    enemyAccuracyFlatGrowth: number;
  }>;
  bounds: Readonly<{
    minHitChance: number;
    maxHitChance: number;
    maxCriticalChance: number;
    maxSingleStrikeHpRatio: number;
    minDamage: number;
    maxStat: number;
  }>;
  damage: Readonly<{
    defenseConstant: number;
    baseHitChance: number;
    accuracyPointValue: number;
    criticalMultiplier: number;
  }>;
  cadence: Readonly<{
    playerActionSeconds: number;
    enemyActionSeconds: number;
    staggerPerEnemy: number;
    simulationTimeoutSeconds: number;
  }>;
  player: Readonly<Record<ClassFamily, FamilyBase>>;
  enemy: Readonly<{
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseMagicAttack: number;
    baseMagicDefense: number;
    baseAccuracy: number;
    baseMagicAccuracy: number;
    baseEvasion: number;
    baseCriticalChance: number;
    baseCriticalResistance: number;
    ranks: Readonly<Record<EnemyRank, EnemyRankTuning>>;
    roles: Readonly<Record<EnemyRole, EnemyRoleTuning>>;
  }>;
  reward: Readonly<{
    baseGold: number;
    baseExp: number;
    goldGrowthPerLevel: number;
    expGrowthPerLevel: number;
  }>;
}>;

export const RECONSTRUCTION_COMBAT_BALANCE_TUNING: CombatBalanceTuning = Object.freeze({
  id: 'm5-reconstruction-combat-balance-v1',
  provenance: COMBAT_BALANCE_PROVENANCE,
  level: Object.freeze({
    min: 1,
    max: 99,
    playerHpGrowth: 0.06,
    playerMpFlatGrowth: 4,
    playerStatGrowth: 0.04,
    playerAccuracyFlatGrowth: 2,
    enemyHpGrowth: 0.08,
    enemyStatGrowth: 0.05,
    enemyAccuracyFlatGrowth: 1.5,
  }),
  bounds: Object.freeze({
    minHitChance: 0.65,
    maxHitChance: 0.97,
    maxCriticalChance: 0.35,
    maxSingleStrikeHpRatio: 0.45,
    minDamage: 1,
    maxStat: 99999,
  }),
  damage: Object.freeze({
    defenseConstant: 4,
    baseHitChance: 0.84,
    accuracyPointValue: 0.002,
    criticalMultiplier: 1.5,
  }),
  cadence: Object.freeze({
    playerActionSeconds: 1.45,
    enemyActionSeconds: 1.9,
    staggerPerEnemy: 0.07,
    simulationTimeoutSeconds: 120,
  }),
  player: Object.freeze({
    swordsman: Object.freeze({
      attack: 28,
      defense: 16,
      magicAttack: 12,
      magicDefense: 12,
      evasion: 158,
      criticalChance: 0.10,
      criticalResistance: 0.02,
    }),
    wizard: Object.freeze({
      attack: 18,
      defense: 10,
      magicAttack: 36,
      magicDefense: 19,
      evasion: 162,
      criticalChance: 0.08,
      criticalResistance: 0.03,
    }),
  }),
  enemy: Object.freeze({
    baseHp: 82,
    baseAttack: 20,
    baseDefense: 11,
    baseMagicAttack: 18,
    baseMagicDefense: 11,
    baseAccuracy: 154,
    baseMagicAccuracy: 154,
    baseEvasion: 150,
    baseCriticalChance: 0.05,
    baseCriticalResistance: 0,
    ranks: Object.freeze({
      normal: Object.freeze({hp: 1, offense: 1, defense: 1, reward: 1}),
      elite: Object.freeze({hp: 1.55, offense: 1.20, defense: 1.15, reward: 2}),
      boss: Object.freeze({hp: 2.60, offense: 1.35, defense: 1.25, reward: 4.5}),
    }),
    roles: Object.freeze({
      melee: Object.freeze({hp: 1, attack: 1, defense: 1.05, magicAttack: 0.75, magicDefense: 0.95, evasion: 1}),
      ranged: Object.freeze({hp: 0.92, attack: 0.95, defense: 0.92, magicAttack: 0.90, magicDefense: 1, evasion: 1.03}),
      caster: Object.freeze({hp: 0.86, attack: 0.72, defense: 0.86, magicAttack: 1.25, magicDefense: 1.18, evasion: 1.02}),
    }),
  }),
  reward: Object.freeze({
    baseGold: 4,
    baseExp: 35,
    goldGrowthPerLevel: 0.15,
    expGrowthPerLevel: 0.18,
  }),
});

const SKILL_POLICY: Readonly<Record<number, Omit<SkillBalance, 'mpCost' | 'authoredMpProvenance'>>> = Object.freeze({
  1101: Object.freeze({skillId:1101, kind:'physical', multiplier:1.55, hits:1, accuracyModifier:-0.03, criticalBonus:0.04, dot:null, support:null, provenance:COMBAT_BALANCE_PROVENANCE}),
  1201: Object.freeze({skillId:1201, kind:'physical', multiplier:0.84, hits:2, accuracyModifier:0, criticalBonus:0, dot:null, support:null, provenance:COMBAT_BALANCE_PROVENANCE}),
  1301: Object.freeze({skillId:1301, kind:'support', multiplier:0, hits:0, accuracyModifier:0, criticalBonus:0, dot:null, support:Object.freeze({defenseMultiplier:1.45,durationActions:3}), provenance:COMBAT_BALANCE_PROVENANCE}),
  19101: Object.freeze({skillId:19101, kind:'magic', multiplier:0.45, hits:1, accuracyModifier:0.04, criticalBonus:0, dot:null, support:Object.freeze({enemyAccuracyPenalty:0.15,durationActions:3}), provenance:COMBAT_BALANCE_PROVENANCE}),
  19201: Object.freeze({skillId:19201, kind:'magic', multiplier:0.75, hits:1, accuracyModifier:0, criticalBonus:0, dot:Object.freeze({ticks:3,multiplierPerTick:0.18}), support:null, provenance:COMBAT_BALANCE_PROVENANCE}),
  19301: Object.freeze({skillId:19301, kind:'support', multiplier:0, hits:0, accuracyModifier:0, criticalBonus:0, dot:null, support:Object.freeze({manaOnHit:6,durationActions:3}), provenance:COMBAT_BALANCE_PROVENANCE}),
});

function finite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${label}`);
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function validateLevel(level: number, tuning: CombatBalanceTuning): number {
  if (!Number.isInteger(level) || level < tuning.level.min || level > tuning.level.max) throw new Error('Invalid combat level');
  return level;
}

function stat(value: number, tuning: CombatBalanceTuning): number {
  return clamp(Math.round(value), 0, tuning.bounds.maxStat);
}

function optionalBonus(value: number | undefined, label: string, min = -1000, max = 1000): number {
  if (value === undefined) return 0;
  finite(value, label);
  if (value < min || value > max) throw new Error(`Invalid ${label}`);
  return value;
}

function normalizeEquipment(input: EquipmentCombatBonuses | undefined): Required<EquipmentCombatBonuses> {
  const source = input ?? {};
  return {
    maxHp: optionalBonus(source.maxHp, 'equipment maxHp'),
    maxMp: optionalBonus(source.maxMp, 'equipment maxMp'),
    attack: optionalBonus(source.attack, 'equipment attack'),
    defense: optionalBonus(source.defense, 'equipment defense'),
    magicAttack: optionalBonus(source.magicAttack, 'equipment magicAttack'),
    magicDefense: optionalBonus(source.magicDefense, 'equipment magicDefense'),
    accuracy: optionalBonus(source.accuracy, 'equipment accuracy'),
    magicAccuracy: optionalBonus(source.magicAccuracy, 'equipment magicAccuracy'),
    evasion: optionalBonus(source.evasion, 'equipment evasion'),
    criticalChance: optionalBonus(source.criticalChance, 'equipment criticalChance', -0.25, 0.25),
  };
}

function levelScale(growth: number, level: number): number {
  return 1 + growth * (level - 1);
}

function randomUnit(random: () => number): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('Random source must return [0, 1)');
  return value;
}

function mitigation(defense: number, tuning: CombatBalanceTuning): number {
  return 100 / (100 + Math.max(0, defense) * tuning.damage.defenseConstant);
}

export class ReconstructionCombatBalance {
  readonly tuning: CombatBalanceTuning;
  readonly id: string;
  readonly provenance = COMBAT_BALANCE_PROVENANCE;

  constructor(tuning: CombatBalanceTuning = RECONSTRUCTION_COMBAT_BALANCE_TUNING) {
    if (tuning.provenance !== COMBAT_BALANCE_PROVENANCE) throw new Error('Combat balance tuning must remain RECONSTRUCTION_POLICY');
    this.tuning = tuning;
    this.id = tuning.id;
  }

  playerStats(classId: string | number, level = 1, equipment?: EquipmentCombatBonuses): CombatantStats {
    const definition = playableClassById(classId);
    validateLevel(level, this.tuning);
    const family = definition.family;
    const base = this.tuning.player[family];
    const bonus = normalizeEquipment(equipment);
    const scale = levelScale(this.tuning.level.playerStatGrowth, level);
    const authored = definition.baseAuthoredStats;
    return Object.freeze({
      id: `class-${definition.classId}`,
      side: 'player' as const,
      family,
      rank: null,
      role: null,
      level,
      maxHp: stat(authored.hp * levelScale(this.tuning.level.playerHpGrowth, level) + bonus.maxHp, this.tuning),
      maxMp: stat(authored.mp + this.tuning.level.playerMpFlatGrowth * (level - 1) + bonus.maxMp, this.tuning),
      attack: stat((base.attack + bonus.attack) * scale, this.tuning),
      defense: stat((base.defense + bonus.defense) * scale, this.tuning),
      magicAttack: stat((base.magicAttack + bonus.magicAttack) * scale, this.tuning),
      magicDefense: stat((base.magicDefense + bonus.magicDefense) * scale, this.tuning),
      accuracy: stat(authored.hit + this.tuning.level.playerAccuracyFlatGrowth * (level - 1) + bonus.accuracy, this.tuning),
      magicAccuracy: stat(authored.magicHit + this.tuning.level.playerAccuracyFlatGrowth * (level - 1) + bonus.magicAccuracy, this.tuning),
      evasion: stat(base.evasion + this.tuning.level.playerAccuracyFlatGrowth * (level - 1) + bonus.evasion, this.tuning),
      criticalChance: clamp(base.criticalChance + bonus.criticalChance, 0, this.tuning.bounds.maxCriticalChance),
      criticalResistance: base.criticalResistance,
      criticalMultiplier: this.tuning.damage.criticalMultiplier,
      authoredAnchors: Object.freeze({
        hp: authored.hp,
        mp: authored.mp,
        hit: authored.hit,
        magicHit: authored.magicHit,
        provenance: definition.provenance.classRow.level,
      }),
      provenance: COMBAT_BALANCE_PROVENANCE,
    });
  }

  enemyStats(input: EnemyBuildInput = {}): CombatantStats {
    const level = validateLevel(input.level ?? 1, this.tuning);
    const rank = input.rank ?? 'normal';
    const role = input.role ?? 'melee';
    const rankTuning = this.tuning.enemy.ranks[rank];
    const roleTuning = this.tuning.enemy.roles[role];
    if (!rankTuning || !roleTuning) throw new Error('Invalid enemy reconstruction profile');
    const hpScale = levelScale(this.tuning.level.enemyHpGrowth, level);
    const statScale = levelScale(this.tuning.level.enemyStatGrowth, level);
    const accuracyGrowth = this.tuning.level.enemyAccuracyFlatGrowth * (level - 1);
    return Object.freeze({
      id: input.id ?? `enemy-${role}-${rank}-l${level}`,
      side: 'enemy' as const,
      family: null,
      rank,
      role,
      level,
      maxHp: stat(this.tuning.enemy.baseHp * hpScale * rankTuning.hp * roleTuning.hp, this.tuning),
      maxMp: 0,
      attack: stat(this.tuning.enemy.baseAttack * statScale * rankTuning.offense * roleTuning.attack, this.tuning),
      defense: stat(this.tuning.enemy.baseDefense * statScale * rankTuning.defense * roleTuning.defense, this.tuning),
      magicAttack: stat(this.tuning.enemy.baseMagicAttack * statScale * rankTuning.offense * roleTuning.magicAttack, this.tuning),
      magicDefense: stat(this.tuning.enemy.baseMagicDefense * statScale * rankTuning.defense * roleTuning.magicDefense, this.tuning),
      accuracy: stat(this.tuning.enemy.baseAccuracy + accuracyGrowth, this.tuning),
      magicAccuracy: stat(this.tuning.enemy.baseMagicAccuracy + accuracyGrowth, this.tuning),
      evasion: stat((this.tuning.enemy.baseEvasion + accuracyGrowth) * roleTuning.evasion, this.tuning),
      criticalChance: this.tuning.enemy.baseCriticalChance,
      criticalResistance: this.tuning.enemy.baseCriticalResistance,
      criticalMultiplier: this.tuning.damage.criticalMultiplier,
      authoredAnchors: null,
      provenance: COMBAT_BALANCE_PROVENANCE,
    });
  }

  skill(skillId: number): SkillBalance {
    const policy = SKILL_POLICY[skillId];
    if (!policy) throw new Error(`Missing reconstruction skill balance for ${skillId}`);
    const authored = skillById(skillId);
    return Object.freeze({
      ...policy,
      mpCost: authored.mpCost,
      authoredMpProvenance: authored.provenance.authoredRow.level,
    });
  }

  hitChance(attacker: CombatantStats, defender: CombatantStats, kind: DamageKind, modifier = 0): number {
    finite(modifier, 'accuracy modifier');
    const accuracy = kind === 'physical' ? attacker.accuracy : attacker.magicAccuracy;
    return clamp(
      this.tuning.damage.baseHitChance + (accuracy - defender.evasion) * this.tuning.damage.accuracyPointValue + modifier,
      this.tuning.bounds.minHitChance,
      this.tuning.bounds.maxHitChance,
    );
  }

  criticalChance(attacker: CombatantStats, defender: CombatantStats, bonus = 0): number {
    finite(bonus, 'critical bonus');
    return clamp(attacker.criticalChance - defender.criticalResistance + bonus, 0, this.tuning.bounds.maxCriticalChance);
  }

  deterministicDamage(attacker: CombatantStats, defender: CombatantStats, kind: DamageKind, multiplier = 1, critical = false): number {
    finite(multiplier, 'damage multiplier');
    if (multiplier < 0 || multiplier > 20) throw new Error('Invalid damage multiplier');
    const offense = kind === 'physical' ? attacker.attack : attacker.magicAttack;
    const defense = kind === 'physical' ? defender.defense : defender.magicDefense;
    let damage = Math.round(offense * multiplier * mitigation(defense, this.tuning));
    damage = Math.max(this.tuning.bounds.minDamage, damage);
    if (critical) damage = Math.round(damage * attacker.criticalMultiplier);
    const cap = Math.max(this.tuning.bounds.minDamage, Math.floor(defender.maxHp * this.tuning.bounds.maxSingleStrikeHpRatio));
    return Math.min(damage, cap);
  }

  periodicDamage(attacker: CombatantStats, defender: CombatantStats, kind: DamageKind, multiplier: number): number {
    const raw = this.deterministicDamage(attacker, defender, kind, multiplier, false);
    const periodicCap = Math.max(this.tuning.bounds.minDamage, Math.floor(defender.maxHp * 0.20));
    return Math.min(raw, periodicCap);
  }

  resolveAttack(attacker: CombatantStats, defender: CombatantStats, profile: AttackProfile, random: () => number): AttackResolution {
    if (!Number.isInteger(profile.hits) || profile.hits < 1 || profile.hits > 16) throw new Error('Invalid hit count');
    const accuracyModifier = profile.accuracyModifier ?? 0;
    const criticalBonus = profile.criticalBonus ?? 0;
    const hitChance = this.hitChance(attacker, defender, profile.kind, accuracyModifier);
    const criticalChance = this.criticalChance(attacker, defender, criticalBonus);
    const strikes: StrikeResult[] = [];
    let totalDamage = 0;
    for (let index = 0; index < profile.hits; index += 1) {
      if (randomUnit(random) >= hitChance) {
        strikes.push(Object.freeze({hit:false,critical:false,damage:0,hitChance,criticalChance}));
        continue;
      }
      const critical = randomUnit(random) < criticalChance;
      const damage = this.deterministicDamage(attacker, defender, profile.kind, profile.multiplier, critical);
      totalDamage += damage;
      strikes.push(Object.freeze({hit:true,critical,damage,hitChance,criticalChance}));
    }
    return Object.freeze({
      strikes: Object.freeze(strikes),
      totalDamage,
      dotDamagePerTick: 0,
      dotTicks: 0,
      provenance: COMBAT_BALANCE_PROVENANCE,
    });
  }

  resolveSkillAttack(attacker: CombatantStats, defender: CombatantStats, skillId: number, random: () => number): AttackResolution {
    const skill = this.skill(skillId);
    if (skill.kind === 'support' || skill.hits < 1) {
      return Object.freeze({strikes:Object.freeze([]),totalDamage:0,dotDamagePerTick:0,dotTicks:0,provenance:COMBAT_BALANCE_PROVENANCE});
    }
    const resolution = this.resolveAttack(attacker, defender, {
      kind: skill.kind,
      multiplier: skill.multiplier,
      hits: skill.hits,
      accuracyModifier: skill.accuracyModifier,
      criticalBonus: skill.criticalBonus,
    }, random);
    const landed = resolution.strikes.some(strike => strike.hit);
    const dotDamagePerTick = landed && skill.dot
      ? this.periodicDamage(attacker, defender, skill.kind, skill.dot.multiplierPerTick)
      : 0;
    return Object.freeze({
      ...resolution,
      dotDamagePerTick,
      dotTicks: dotDamagePerTick > 0 ? skill.dot?.ticks ?? 0 : 0,
    });
  }

  rewardForEnemy(input: EnemyRewardInput): CombatReward {
    const level = validateLevel(input.level, this.tuning);
    const rank = this.tuning.enemy.ranks[input.rank];
    if (!rank) throw new Error('Invalid enemy rank');
    const gold = Math.max(1, Math.round(this.tuning.reward.baseGold * (1 + this.tuning.reward.goldGrowthPerLevel * (level - 1)) * rank.reward));
    const exp = Math.max(1, Math.round(this.tuning.reward.baseExp * (1 + this.tuning.reward.expGrowthPerLevel * (level - 1)) * rank.reward));
    return Object.freeze({gold,exp,provenance:COMBAT_BALANCE_PROVENANCE});
  }

  rewardForEncounter(enemies: readonly EnemyRewardInput[]): CombatReward {
    if (!Array.isArray(enemies) || enemies.length < 1 || enemies.length > 64) throw new Error('Invalid enemy reward list');
    let gold = 0;
    let exp = 0;
    for (const enemy of enemies) {
      const reward = this.rewardForEnemy(enemy);
      gold += reward.gold;
      exp += reward.exp;
    }
    return Object.freeze({gold,exp,provenance:COMBAT_BALANCE_PROVENANCE});
  }
}

export const DEFAULT_RECONSTRUCTION_COMBAT_BALANCE = Object.freeze(new ReconstructionCombatBalance());

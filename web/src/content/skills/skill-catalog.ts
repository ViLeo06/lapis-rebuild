import skillData from '../../../../data/skills/mvp.json' with { type: 'json' };
import type {ClassFamily, PlayableSkillDefinition, SkillTargetType} from '../content-types.ts';

const AUTHORED_SKILL_ROW = Object.freeze({
  level: 'VERIFIED',
  source: 'Set.lib/Magictbl.atr + data/skills/mvp.json',
  note: 'MP, Dist, Area, MagicPtn and the remaining exported columns are preserved authored values; EA/EB/EC are not promoted to a universal formula.',
} as const);

const AUTHORED_PATTERN = Object.freeze({
  level: 'VERIFIED',
  source: 'Set.lib/Magicptn.atr + data/skills/mvp.json',
  note: 'Pattern/resource references are presentation data recovered from the fixed table.',
} as const);

const RANGE_USE = Object.freeze({
  level: 'RECOVERED_SECONDARY',
  source: 'Magictbl.atr Dist consumed by the reconstruction battle runtime',
  note: 'The authored distance value is exact; treating it as the current Web cell range is secondary runtime evidence, not a recovered retail server rule.',
} as const);

const TARGET_POLICY = Object.freeze({
  level: 'RECONSTRUCTION_POLICY',
  source: 'S11 target interpretation',
  note: 'Target categories are explicit offline gameplay policy layered over authored Team/Unit/Att fields and localized skill descriptions.',
} as const);

const BEHAVIOR_POLICY = Object.freeze({
  level: 'RECONSTRUCTION_POLICY',
  source: 'S6 training battle behavior carried into S11 content definitions',
  note: 'Numeric retail effect/damage formulas remain unrecovered; these behaviors describe the offline playable substitute only.',
} as const);

type Policy = Readonly<{
  family: ClassFamily;
  targetType: SkillTargetType;
  behaviorKind: string;
  behaviorNote: string;
}>;

const POLICIES: Readonly<Record<number, Policy>> = Object.freeze({
  1101: {family:'swordsman', targetType:'enemy', behaviorKind:'heavy-strike', behaviorNote:'Single-target melee showcase. Damage amount remains delegated to the reconstruction damage authority.'},
  1201: {family:'swordsman', targetType:'enemy', behaviorKind:'multi-hit', behaviorNote:'Single-target multi-hit showcase. Iteration is authored; final retail damage arithmetic remains unknown.'},
  1301: {family:'swordsman', targetType:'self', behaviorKind:'defence-buff', behaviorNote:'Self-buff showcase using the existing offline training semantics; retail buff arithmetic is not claimed.'},
  19101: {family:'wizard', targetType:'enemy', behaviorKind:'accuracy-debuff', behaviorNote:'Single-target debuff showcase; exact retail hit-rate arithmetic remains unknown.'},
  19201: {family:'wizard', targetType:'enemy-area', behaviorKind:'poison-area', behaviorNote:'Ranged area/status showcase; poison timing and damage remain reconstruction policy.'},
  19301: {family:'wizard', targetType:'self', behaviorKind:'mana-on-hit', behaviorNote:'Self-buff showcase for staff mana absorption; returned MP behavior remains reconstruction policy.'},
});

function buildSkill(row: (typeof skillData)[number]): PlayableSkillDefinition {
  const policy=POLICIES[row.skill_id];
  if(!policy)throw new Error(`Missing S11 policy for skill ${row.skill_id}`);
  if(!row.magic_pattern || row.magic_pattern.pattern_id!==row.magic_pattern_id)throw new Error(`Missing Magicptn row for skill ${row.skill_id}`);
  const magicResourceIds=[...new Set(row.magic_pattern.magic_resources.map(r=>r.magic_resource_id))];
  return Object.freeze({
    skillId: row.skill_id,
    displayName: row.name,
    family: policy.family,
    mpCost: row.mp_cost,
    range: row.distance,
    area: row.area,
    targetType: policy.targetType,
    effectReference: Object.freeze({
      magicPatternId: row.magic_pattern_id,
      magicResourceIds: Object.freeze(magicResourceIds),
      soundId: Number.isInteger(row.magic_pattern.sound_id)?row.magic_pattern.sound_id:null,
      provenance: AUTHORED_PATTERN,
    }),
    authored: Object.freeze({
      attackType: row.attack_type,
      distance: row.distance,
      area: row.area,
      mpCost: row.mp_cost,
      timeRaw: row.time_raw,
      teamMask: row.team_mask,
      unitMask: row.unit_mask,
      effectA: row.effect_a,
      effectB: row.effect_b,
      effectC: row.effect_c,
      tick: row.tick,
      skillLevel: row.skill_level,
      magicPatternId: row.magic_pattern_id,
      iconIndex: row.icon_index,
      iteration: row.iteration,
      explanation: row.explanation,
    }),
    reconstructionBehavior: Object.freeze({kind:policy.behaviorKind,note:policy.behaviorNote}),
    provenance: Object.freeze({
      authoredRow: AUTHORED_SKILL_ROW,
      rangeUse: RANGE_USE,
      targetType: TARGET_POLICY,
      gameplayBehavior: BEHAVIOR_POLICY,
    }),
  });
}

const definitions=skillData.map(buildSkill);

export const SKILL_CATALOG: Readonly<Record<number, PlayableSkillDefinition>> = Object.freeze(
  Object.fromEntries(definitions.map(skill=>[skill.skillId,skill])) as Record<number, PlayableSkillDefinition>,
);

export const SWORDSMAN_SHOWCASE_SKILL_IDS = Object.freeze([1101,1201,1301] as const);
export const WIZARD_SHOWCASE_SKILL_IDS = Object.freeze([19101,19201,19301] as const);

export function skillById(skillId:number):PlayableSkillDefinition {
  if(!Number.isInteger(skillId))throw new Error('Invalid skill id');
  const skill=SKILL_CATALOG[skillId];
  if(!skill)throw new Error(`Unknown S11 skill ${skillId}`);
  return skill;
}

export function skillsForFamily(family:ClassFamily):readonly PlayableSkillDefinition[] {
  return Object.freeze(definitions.filter(skill=>skill.family===family));
}

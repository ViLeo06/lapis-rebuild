import classRows from '../../../data/classes/swordsman.json' with { type: 'json' };
import {skillById} from '../content/skills/skill-catalog.ts';
import {
  legacyTrainingCompatibility,
  reconcileEquipmentForCharacter,
  validateEquipment,
} from '../progression/equipment.ts';
import {
  createInventory,
  itemMetadata,
  knownItemIds,
  validateInventory,
} from '../progression/inventory.ts';
import type {InventoryState} from '../progression/inventory.ts';
import {
  applyExperience,
  initialProgression,
  validateProgression,
} from '../progression/progression.ts';
import type {LevelUpEvent, ProgressionState} from '../progression/progression.ts';

export type M6EvidenceLevel =
  | 'VERIFIED'
  | 'VERIFIED-STATIC-ORIGINAL'
  | 'VERIFIED-HISTORICAL'
  | 'RECOVERED_SECONDARY'
  | 'INFERRED'
  | 'SERVER-BOUNDARY'
  | 'RECONSTRUCTION_POLICY'
  | 'UNVERIFIED';

export type M6EvidenceRef = Readonly<{
  level: M6EvidenceLevel;
  source: string;
  note: string;
}>;

export const SWORDSMAN_STAGE_IDS = Object.freeze([
  100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
] as const);
export type SwordsmanStageId = (typeof SWORDSMAN_STAGE_IDS)[number];

export const SWORDSMAN_REPRESENTATIVE_SKILL_IDS = Object.freeze([1101, 1201, 1301] as const);
export type SwordsmanRepresentativeSkillId = (typeof SWORDSMAN_REPRESENTATIVE_SKILL_IDS)[number];

export type SwordsmanActionSlot = '00' | '01' | '02' | '03' | '05';

export type SwordsmanStageDefinition = Readonly<{
  stageId: SwordsmanStageId;
  stageIndex: number;
  displayName: string;
  descriptionRaw: string;
  authored: Readonly<{
    portraitId: number;
    hp: number;
    mp: number;
    move: number;
    hit: number;
    magicHit: number;
    range: number;
    stageEntrySkillId: number;
  }>;
  visual: Readonly<{
    family: string;
    bodyPrefix: 'Body_';
    actionSlots: readonly Readonly<{
      slot: SwordsmanActionSlot;
      aniPath: string;
      sprPath: string;
      semantic: 'idle' | 'move' | 'attack-or-cast' | 'hit-reaction' | 'unknown-special';
      semanticEvidence: M6EvidenceRef;
    }>[];
    provenance: M6EvidenceRef;
  }>;
  provenance: Readonly<{
    classRow: M6EvidenceRef;
    stageEntrySkillId: M6EvidenceRef;
  }>;
}>;

type AuthoredSwordsmanRow = Readonly<{
  class_id: number;
  portrait_id: number;
  hp: number;
  mp: number;
  move: number;
  hit: number;
  magic_hit: number;
  range: number;
  class_name_raw: string;
  class_description_raw: string;
  stage_entry_skill_id: number;
}>;

const CLASS_ROW_EVIDENCE = Object.freeze({
  level: 'VERIFIED-STATIC-ORIGINAL',
  source: 'fixed-hash 2.2 Set.lib/ability.atr -> data/classes/swordsman.json',
  note: 'The ten swordsman rows and exported HP/MP/move/hit/magic-hit/range/name/stage-entry-skill fields are authored client data.',
} as const satisfies M6EvidenceRef);

const VISUAL_FAMILY_EVIDENCE = Object.freeze({
  level: 'VERIFIED-STATIC-ORIGINAL',
  source: 'lapis-rebuild-assets/30_parsed/animations/ani-index.csv + 30_parsed/tables/client-files-verified-20260915.csv',
  note: 'For B100..B190 every _00/_01/_02/_03/_05 ANI and matching SPR resource exists in the fixed-hash 2.2 client inventory.',
} as const satisfies M6EvidenceRef);

const SECONDARY_ACTION_EVIDENCE = Object.freeze({
  level: 'RECOVERED_SECONDARY',
  source: 'S5 visual runtime recovery + existing compatibility runtime',
  note: 'The resource slot is original; idle/move/attack-or-cast labels for _00/_01/_02 remain secondary semantics.',
} as const satisfies M6EvidenceRef);

const HIT_ACTION_EVIDENCE = Object.freeze({
  level: 'VERIFIED-STATIC-ORIGINAL',
  source: 'S5 authoritative HP-decrease consumer',
  note: 'Character action state 3 selects _03 and is runtime-linked to hit reaction.',
} as const satisfies M6EvidenceRef);

const SPECIAL_ACTION_EVIDENCE = Object.freeze({
  level: 'UNVERIFIED',
  source: 'fixed-hash B100..B190 _05 resource inventory',
  note: 'The _05 resources exist, but S5 did not establish a universal semantic such as death.',
} as const satisfies M6EvidenceRef);

const STAGE_ENTRY_SKILL_EVIDENCE = Object.freeze({
  level: 'VERIFIED-STATIC-ORIGINAL',
  source: 'fixed-hash 2.2 levelabl.atr/ability export -> data/classes/swordsman.json',
  note: 'The numeric stage-entry skill reference is preserved exactly, including zero values; it is not by itself proof of complete retail unlock conditions.',
} as const satisfies M6EvidenceRef);

export const SWORDSMAN_EQUIPMENT_PROVENANCE = Object.freeze({
  level: 'RECONSTRUCTION_POLICY',
  source: 'data/items/training-catalog.json training.role/training.slot',
  note: 'Item rows/text are retail-derived, but the current swordsman weapon/armor compatibility assignment is the replaceable offline training policy. No stage-specific retail restriction is claimed.',
} as const satisfies M6EvidenceRef);

export const SWORDSMAN_SKILL_AVAILABILITY_PROVENANCE = Object.freeze({
  level: 'RECONSTRUCTION_POLICY',
  source: 'S26 staged adapter over the existing S11 representative skill roster',
  note: 'Only the three already-modeled S11 skills are staged for offline progression. This is not a retail skill-unlock-level claim.',
} as const satisfies M6EvidenceRef);

const ACTION_SLOTS = Object.freeze(['00', '01', '02', '03', '05'] as const);
const ACTION_SEMANTICS: Readonly<Record<SwordsmanActionSlot, Readonly<{
  semantic: SwordsmanStageDefinition['visual']['actionSlots'][number]['semantic'];
  evidence: M6EvidenceRef;
}>>> = Object.freeze({
  '00': Object.freeze({semantic: 'idle', evidence: SECONDARY_ACTION_EVIDENCE}),
  '01': Object.freeze({semantic: 'move', evidence: SECONDARY_ACTION_EVIDENCE}),
  '02': Object.freeze({semantic: 'attack-or-cast', evidence: SECONDARY_ACTION_EVIDENCE}),
  '03': Object.freeze({semantic: 'hit-reaction', evidence: HIT_ACTION_EVIDENCE}),
  '05': Object.freeze({semantic: 'unknown-special', evidence: SPECIAL_ACTION_EVIDENCE}),
});

const rowById = new Map<number, AuthoredSwordsmanRow>(
  (classRows as AuthoredSwordsmanRow[]).map(row => [row.class_id, row]),
);

if (rowById.size !== SWORDSMAN_STAGE_IDS.length ||
    !SWORDSMAN_STAGE_IDS.every(id => rowById.has(id))) {
  throw new Error('Incomplete authored swordsman ten-stage table');
}

function stageIndex(stageId: SwordsmanStageId): number {
  return SWORDSMAN_STAGE_IDS.indexOf(stageId);
}

function buildStage(stageId: SwordsmanStageId): SwordsmanStageDefinition {
  const row = rowById.get(stageId);
  if (!row) throw new Error(`Missing authored swordsman stage ${stageId}`);
  const family = `B${stageId}`;
  return Object.freeze({
    stageId,
    stageIndex: stageIndex(stageId),
    displayName: row.class_name_raw,
    descriptionRaw: row.class_description_raw,
    authored: Object.freeze({
      portraitId: row.portrait_id,
      hp: row.hp,
      mp: row.mp,
      move: row.move,
      hit: row.hit,
      magicHit: row.magic_hit,
      range: row.range,
      stageEntrySkillId: row.stage_entry_skill_id,
    }),
    visual: Object.freeze({
      family,
      bodyPrefix: 'Body_' as const,
      actionSlots: Object.freeze(ACTION_SLOTS.map(slot => Object.freeze({
        slot,
        aniPath: `Char/${family}_${slot}.ani`,
        sprPath: `Char/${family}_${slot}.spr`,
        semantic: ACTION_SEMANTICS[slot].semantic,
        semanticEvidence: ACTION_SEMANTICS[slot].evidence,
      }))),
      provenance: VISUAL_FAMILY_EVIDENCE,
    }),
    provenance: Object.freeze({
      classRow: CLASS_ROW_EVIDENCE,
      stageEntrySkillId: STAGE_ENTRY_SKILL_EVIDENCE,
    }),
  });
}

export const SWORDSMAN_STAGES: readonly SwordsmanStageDefinition[] = Object.freeze(
  SWORDSMAN_STAGE_IDS.map(buildStage),
);
const STAGE_BY_ID = new Map<SwordsmanStageId, SwordsmanStageDefinition>(
  SWORDSMAN_STAGES.map(stage => [stage.stageId, stage]),
);

export function isSwordsmanStageId(value: number): value is SwordsmanStageId {
  return Number.isInteger(value) && (SWORDSMAN_STAGE_IDS as readonly number[]).includes(value);
}

export function swordsmanStageById(value: string | number): SwordsmanStageDefinition {
  const stageId = Number(value);
  if (!isSwordsmanStageId(stageId)) throw new Error(`Unsupported swordsman stage ${String(value)}`);
  return STAGE_BY_ID.get(stageId)!;
}

export type ReconstructionSwordsmanProgressionPolicy = Readonly<{
  id: string;
  provenance: 'RECONSTRUCTION_POLICY';
  promotionRequiredLevelByStage: Readonly<Record<SwordsmanStageId, number | null>>;
  representativeSkillUnlockStageBySkillId: Readonly<Record<SwordsmanRepresentativeSkillId, SwordsmanStageId>>;
  notes: readonly string[];
}>;

export const RECONSTRUCTION_SWORDSMAN_PROGRESSION_POLICY: ReconstructionSwordsmanProgressionPolicy =
  Object.freeze({
    id: 'm6-swordsman-ten-stage-v1',
    provenance: 'RECONSTRUCTION_POLICY',
    promotionRequiredLevelByStage: Object.freeze({
      100: 10,
      110: 20,
      120: 30,
      130: 40,
      140: 50,
      150: 60,
      160: 70,
      170: 80,
      180: 90,
      190: null,
    }),
    representativeSkillUnlockStageBySkillId: Object.freeze({
      1101: 100,
      1201: 110,
      1301: 120,
    }),
    notes: Object.freeze([
      'The retired server promotion levels and promotion predicates are not recovered.',
      'Ten-level promotion intervals are a centralized offline reconstruction policy and may be replaced without changing authored stage rows.',
      'Representative skill staging uses only S11 skills already backed by authored Magictbl rows; authored entry references 1401/1501 remain preserved but are not promoted to playable skills without their full data contract.',
    ]),
  });

export type SwordsmanPromotionRequirement = Readonly<{
  fromStageId: SwordsmanStageId;
  toStageId: SwordsmanStageId;
  requiredLevel: number;
  provenance: 'RECONSTRUCTION_POLICY';
}>;

export function promotionRequirementForStage(
  value: string | number,
): SwordsmanPromotionRequirement | null {
  const stage = swordsmanStageById(value);
  const requiredLevel =
    RECONSTRUCTION_SWORDSMAN_PROGRESSION_POLICY.promotionRequiredLevelByStage[stage.stageId];
  if (requiredLevel === null) return null;
  const next = SWORDSMAN_STAGE_IDS[stage.stageIndex + 1];
  if (next === undefined) throw new Error('Missing next swordsman stage');
  return Object.freeze({
    fromStageId: stage.stageId,
    toStageId: next,
    requiredLevel,
    provenance: 'RECONSTRUCTION_POLICY',
  });
}

function isRepresentativeSkillId(skillId: number): skillId is SwordsmanRepresentativeSkillId {
  return Number.isInteger(skillId) &&
    (SWORDSMAN_REPRESENTATIVE_SKILL_IDS as readonly number[]).includes(skillId);
}

export function availableSwordsmanSkillIds(value: string | number): readonly SwordsmanRepresentativeSkillId[] {
  const stage = swordsmanStageById(value);
  return Object.freeze(SWORDSMAN_REPRESENTATIVE_SKILL_IDS.filter(skillId => {
    const unlockStage =
      RECONSTRUCTION_SWORDSMAN_PROGRESSION_POLICY.representativeSkillUnlockStageBySkillId[skillId];
    return stage.stageIndex >= swordsmanStageById(unlockStage).stageIndex;
  }));
}

export function swordsmanSkillAvailable(value: string | number, skillId: number): boolean {
  if (!isRepresentativeSkillId(skillId)) return false;
  return availableSwordsmanSkillIds(value).includes(skillId);
}

export function swordsmanSkillMpCost(skillId: number): number {
  if (!isRepresentativeSkillId(skillId)) throw new Error(`Unsupported S26 representative skill ${skillId}`);
  return skillById(skillId).mpCost;
}

export function isSwordsmanEquipmentEligible(value: string | number, itemId: number): boolean {
  const stage = swordsmanStageById(value);
  try {
    return legacyTrainingCompatibility(String(stage.stageId), itemMetadata(itemId));
  } catch {
    return false;
  }
}

export function swordsmanEligibleEquipmentIds(value: string | number): readonly number[] {
  swordsmanStageById(value);
  return Object.freeze(knownItemIds().filter(itemId => isSwordsmanEquipmentEligible(value, itemId)));
}

export type SwordsmanProgressionState = Readonly<{
  family: 'swordsman';
  stageId: SwordsmanStageId;
  progression: ProgressionState;
  inventory: InventoryState;
}>;

export type SwordsmanExperienceResult = Readonly<{
  state: SwordsmanProgressionState;
  levelUps: readonly LevelUpEvent[];
}>;

export type SwordsmanPromotionEvent = Readonly<{
  type: 'stage_promotion';
  fromStageId: SwordsmanStageId;
  toStageId: SwordsmanStageId;
  requiredLevel: number;
  provenance: 'RECONSTRUCTION_POLICY';
}>;

export type SwordsmanPromotionResult = Readonly<{
  state: SwordsmanProgressionState;
  event: SwordsmanPromotionEvent;
}>;

export function validateSwordsmanProgressionState(raw: unknown): SwordsmanProgressionState {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid swordsman progression state');
  const input = raw as {
    family?: unknown;
    stageId?: unknown;
    progression?: unknown;
    inventory?: unknown;
  };
  if (input.family !== 'swordsman') throw new Error('Invalid swordsman family');
  const stage = swordsmanStageById(String(input.stageId));
  const progression = validateProgression(input.progression);
  const inventory = validateEquipment(
    validateInventory(input.inventory),
    String(stage.stageId),
  );
  return Object.freeze({
    family: 'swordsman' as const,
    stageId: stage.stageId,
    progression,
    inventory,
  });
}

export function createInitialSwordsmanState(
  inventory: InventoryState = createInventory(),
): SwordsmanProgressionState {
  return validateSwordsmanProgressionState({
    family: 'swordsman',
    stageId: 100,
    progression: initialProgression(),
    inventory,
  });
}

export function applySwordsmanExperience(
  state: SwordsmanProgressionState,
  amount: number,
): SwordsmanExperienceResult {
  const current = validateSwordsmanProgressionState(state);
  const applied = applyExperience(current.progression, amount);
  return Object.freeze({
    state: validateSwordsmanProgressionState({
      ...current,
      progression: applied.state,
    }),
    levelUps: Object.freeze([...applied.levelUps]),
  });
}

export function canPromoteSwordsman(state: SwordsmanProgressionState): boolean {
  const current = validateSwordsmanProgressionState(state);
  const requirement = promotionRequirementForStage(current.stageId);
  return requirement !== null && current.progression.level >= requirement.requiredLevel;
}

export function promoteSwordsman(state: SwordsmanProgressionState): SwordsmanPromotionResult {
  const current = validateSwordsmanProgressionState(state);
  const requirement = promotionRequirementForStage(current.stageId);
  if (!requirement) throw new Error('Swordsman is already at maximum stage');
  if (current.progression.level < requirement.requiredLevel) {
    throw new Error(
      `Swordsman stage ${current.stageId} requires level ${requirement.requiredLevel} for promotion`,
    );
  }
  const reconciled = reconcileEquipmentForCharacter(
    current.inventory,
    String(requirement.toStageId),
  );
  const next = validateSwordsmanProgressionState({
    family: 'swordsman',
    stageId: requirement.toStageId,
    progression: current.progression,
    inventory: reconciled.inventory,
  });
  return Object.freeze({
    state: next,
    event: Object.freeze({
      type: 'stage_promotion' as const,
      fromStageId: requirement.fromStageId,
      toStageId: requirement.toStageId,
      requiredLevel: requirement.requiredLevel,
      provenance: 'RECONSTRUCTION_POLICY' as const,
    }),
  });
}

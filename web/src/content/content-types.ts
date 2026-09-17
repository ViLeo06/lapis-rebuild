export type ProvenanceLevel = 'VERIFIED' | 'RECOVERED_SECONDARY' | 'RECONSTRUCTION_POLICY' | 'UNVERIFIED';

export type ClassFamily = 'swordsman' | 'wizard';
export type EquipmentSlot = 'weapon' | 'armor';
export type SkillTargetType = 'enemy' | 'enemy-area' | 'self';
export type ActionSemantic = 'idle' | 'move' | 'attack-or-cast' | 'hit-reaction' | 'special';

export type EvidenceRef = Readonly<{
  level: ProvenanceLevel;
  source: string;
  note: string;
}>;

export type AuthoredClassStats = Readonly<{
  hp: number;
  mp: number;
  move: number;
  hit: number;
  magicHit: number;
  range: number;
  stageEntrySkillId: number;
}>;

export type ActionAnimationBinding = Readonly<{
  semantic: ActionSemantic;
  slot: '00' | '01' | '02' | '03' | '05';
  slotMapping: EvidenceRef;
  semanticEvidence: EvidenceRef;
}>;

export type NormalAttackProfile = Readonly<{
  rangeCells: number;
  identity: 'melee' | 'staff-melee';
  animationSlot: '02';
  damageFormula: null;
  damageAuthority: 'retail-server-authority-offline-reconstruction-required';
  provenance: Readonly<{
    range: EvidenceRef;
    animation: EvidenceRef;
    damageBoundary: EvidenceRef;
  }>;
}>;

export type SkillEffectReference = Readonly<{
  magicPatternId: number;
  magicResourceIds: readonly number[];
  soundId: number | null;
  provenance: EvidenceRef;
}>;

export type PlayableSkillDefinition = Readonly<{
  skillId: number;
  displayName: string;
  family: ClassFamily;
  mpCost: number;
  range: number;
  area: number;
  targetType: SkillTargetType;
  effectReference: SkillEffectReference;
  authored: Readonly<{
    attackType: number;
    distance: number;
    area: number;
    mpCost: number;
    timeRaw: number;
    teamMask: number;
    unitMask: number;
    effectA: number;
    effectB: number;
    effectC: number;
    tick: number;
    skillLevel: number;
    magicPatternId: number;
    iconIndex: number;
    iteration: number;
    explanation: string;
  }>;
  reconstructionBehavior: Readonly<{
    kind: string;
    note: string;
  }>;
  provenance: Readonly<{
    authoredRow: EvidenceRef;
    rangeUse: EvidenceRef;
    targetType: EvidenceRef;
    gameplayBehavior: EvidenceRef;
  }>;
}>;

export type EquipmentCompatibility = Readonly<{
  weapon: readonly number[];
  armor: readonly number[];
  provenance: EvidenceRef;
}>;

export type PlayableClassDefinition = Readonly<{
  classId: number;
  displayName: string;
  family: ClassFamily;
  baseAuthoredStats: AuthoredClassStats;
  allowedEquipment: EquipmentCompatibility;
  actionAnimationMapping: readonly ActionAnimationBinding[];
  normalAttackProfile: NormalAttackProfile;
  availableSkillIds: readonly number[];
  provenance: Readonly<{
    classRow: EvidenceRef;
    skillAvailability: EvidenceRef;
    equipmentCompatibility: EvidenceRef;
  }>;
}>;

export type EquipmentSelection = Readonly<{
  weapon: number | null;
  armor: number | null;
}>;

import type {ActionAnimationBinding, AuthoredClassStats, ClassFamily, NormalAttackProfile, PlayableClassDefinition} from '../content-types.ts';
import {equipmentCompatibilityForFamily} from './equipment-compatibility.ts';

export type AuthoredClassRow = Readonly<{
  class_id:number;
  portrait_id:number;
  hp:number;
  mp:number;
  move:number;
  hit:number;
  magic_hit:number;
  range:number;
  class_name_raw:string;
  class_description_raw:string;
  stage_entry_skill_id:number;
}>;

const SLOT_MAPPING=Object.freeze({
  level:'VERIFIED',
  source:'S5 fixed-hash ANI consumer / B%03d_%02d.ani',
  note:'Character action state number selects the matching action-slot ANI resource.',
} as const);

const SECONDARY_SEMANTIC=Object.freeze({
  level:'RECOVERED_SECONDARY',
  source:'existing Web/compatibility action naming',
  note:'Idle/move/attack-or-cast labels are retained as secondary recovered semantics rather than promoted to stronger retail truth.',
} as const);

const HIT_SEMANTIC=Object.freeze({
  level:'VERIFIED',
  source:'S5 authoritative HP-decrease consumer',
  note:'State 3 / _03 is runtime-verified as the hit-reaction animation.',
} as const);

const SPECIAL_SEMANTIC=Object.freeze({
  level:'UNVERIFIED',
  source:'B100/B109 action slot inventory',
  note:'The _05 resource exists for target classes, but no universal retail semantic is asserted here.',
} as const);

const CLASS_ROW=Object.freeze({
  level:'VERIFIED',
  source:'Set.lib/ability.atr + data/classes/*.json',
  note:'Values are exact exported authored fields. Their presence is verified; this model does not reinterpret them as percentages or a damage formula.',
} as const);

const SKILL_AVAILABILITY=Object.freeze({
  level:'RECONSTRUCTION_POLICY',
  source:'S11 showcase roster',
  note:'Three representative family skills are exposed for the current offline slice. This is not a claim that the base retail class stage learned all three simultaneously.',
} as const);

const NORMAL_ATTACK_RANGE=Object.freeze({
  level:'RECOVERED_SECONDARY',
  source:'ability.atr range field + current battle profile consumption',
  note:'The authored range value is exact; using it as Web battle-cell reach is secondary runtime evidence.',
} as const);

const ATTACK_ANIMATION=Object.freeze({
  level:'RECOVERED_SECONDARY',
  source:'B100/B109 _02 action usage in the current compatibility runtime',
  note:'Slot mapping is exact, while the universal semantic label attack-or-cast remains secondary evidence.',
} as const);

const DAMAGE_BOUNDARY=Object.freeze({
  level:'VERIFIED',
  source:'S3 6A/82 uplink + 6A/05 absolute-HP downlink boundary',
  note:'No exact retail hit/damage/critical/defence formula is supplied by S11; offline damage must stay behind a reconstruction authority.',
} as const);

export function authoredStats(row:AuthoredClassRow):AuthoredClassStats {
  return Object.freeze({
    hp:row.hp,mp:row.mp,move:row.move,hit:row.hit,magicHit:row.magic_hit,range:row.range,stageEntrySkillId:row.stage_entry_skill_id,
  });
}

export function commonActionAnimationMapping():readonly ActionAnimationBinding[] {
  return Object.freeze([
    Object.freeze({semantic:'idle',slot:'00',slotMapping:SLOT_MAPPING,semanticEvidence:SECONDARY_SEMANTIC}),
    Object.freeze({semantic:'move',slot:'01',slotMapping:SLOT_MAPPING,semanticEvidence:SECONDARY_SEMANTIC}),
    Object.freeze({semantic:'attack-or-cast',slot:'02',slotMapping:SLOT_MAPPING,semanticEvidence:SECONDARY_SEMANTIC}),
    Object.freeze({semantic:'hit-reaction',slot:'03',slotMapping:SLOT_MAPPING,semanticEvidence:HIT_SEMANTIC}),
    Object.freeze({semantic:'special',slot:'05',slotMapping:SLOT_MAPPING,semanticEvidence:SPECIAL_SEMANTIC}),
  ] as const);
}

export function normalAttackProfile(row:AuthoredClassRow,family:ClassFamily):NormalAttackProfile {
  return Object.freeze({
    rangeCells:row.range,
    identity:family==='swordsman'?'melee':'staff-melee',
    animationSlot:'02',
    damageFormula:null,
    damageAuthority:'retail-server-authority-offline-reconstruction-required',
    provenance:Object.freeze({range:NORMAL_ATTACK_RANGE,animation:ATTACK_ANIMATION,damageBoundary:DAMAGE_BOUNDARY}),
  });
}

export function buildPlayableClass(row:AuthoredClassRow,family:ClassFamily,skillIds:readonly number[]):PlayableClassDefinition {
  return Object.freeze({
    classId:row.class_id,
    displayName:row.class_name_raw,
    family,
    baseAuthoredStats:authoredStats(row),
    allowedEquipment:equipmentCompatibilityForFamily(family),
    actionAnimationMapping:commonActionAnimationMapping(),
    normalAttackProfile:normalAttackProfile(row,family),
    availableSkillIds:Object.freeze([...skillIds]),
    provenance:Object.freeze({classRow:CLASS_ROW,skillAvailability:SKILL_AVAILABILITY,equipmentCompatibility:equipmentCompatibilityForFamily(family).provenance}),
  });
}

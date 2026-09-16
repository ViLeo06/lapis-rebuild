export type LegacyBattleProfile = {
  classFamily:'swordsman'|'wizard';
  movementRange:number;
  basicAttackRange:number;
  movementProfile:number;
  movementReadinessCost:number;
  attackReadinessCost:number;
  restReadinessCost:number;
  magicReadinessRate:number;
  commandRange:number;
};

// Values below are exact authored rows recovered from Set.lib/ability.atr for
// the target sword/wizard class families. The mapping from these columns to
// battle semantics is secondary static evidence from the recovered compatibility
// runtime and therefore is kept separate from retail-dynamic facts.
export const SWORDSMAN_BATTLE_PROFILE:LegacyBattleProfile=Object.freeze({
  classFamily:'swordsman',
  movementRange:5,
  basicAttackRange:1,
  movementProfile:0,
  movementReadinessCost:6,
  attackReadinessCost:4,
  restReadinessCost:5,
  magicReadinessRate:100,
  commandRange:4,
});

export const WIZARD_BATTLE_PROFILE:LegacyBattleProfile=Object.freeze({
  classFamily:'wizard',
  movementRange:4,
  basicAttackRange:1,
  movementProfile:9,
  movementReadinessCost:6,
  attackReadinessCost:4,
  restReadinessCost:5,
  magicReadinessRate:100,
  commandRange:4,
});

export function battleProfileForClass(classId:string|number):LegacyBattleProfile {
  const id=Number(classId);
  if(!Number.isInteger(id))throw new Error('Invalid class id');
  return id%10===9?WIZARD_BATTLE_PROFILE:SWORDSMAN_BATTLE_PROFILE;
}

// Secondary recovered native/transport behavior:
// - the commander readiness ring has 20 segments;
// - battle tick increments readiness by exactly one point up to maximum;
// - the compatibility transport observes a 500ms tick cadence.
// The 20-point ring/increment behavior is substantially stronger evidence than
// the cadence. RETAIL_TICK_MS must remain visually labelled as inferred until
// an isolated original-client capture confirms it.
export const RECOVERED_READINESS=Object.freeze({
  maximum:20,
  incrementPerTick:1,
  inferredTickMs:500,
  evidence:'RECOVERED_SECONDARY' as const,
});

export function magicReadinessCost(profile:LegacyBattleProfile,maximum:number):number {
  if(!Number.isFinite(maximum)||maximum<=0)throw new Error('Invalid readiness maximum');
  const resourceScale=Math.min(maximum,10);
  return Math.max(1,Math.ceil(resourceScale*profile.magicReadinessRate/100));
}

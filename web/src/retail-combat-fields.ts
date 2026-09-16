export const RETAIL_ABILITY_FIELDS=Object.freeze({
  hit:18,
  evasion:19,
  criticalLike:20,
  magicHit:21,
  magicEvasion:22,
  hitReactionCry:25,
  attribute:35,
  weaponDamage:36,
  defence:37,
  magicDamage:38,
  magicDefence:39,
} as const);

export const RETAIL_ITEM_FIELDS=Object.freeze({
  minimumDamage:21,
  maximumDamage:22,
  defence:23,
  attackRange:24,
  magicPower:25,
  minimumMagicDamage:26,
  maximumMagicDamage:27,
  magicDefence:28,
  magicRange:29,
  accuracyRate:31,
  evasionRate:32,
  criticalRate:33,
  magicAccuracyRate:34,
  magicEvasionRate:35,
  damage:44,
  damageType:45,
} as const);

export const RETAIL_COMBAT_FIELD_EVIDENCE='VERIFIED_AUTHORED_FIELDS_FORMULA_UNKNOWN' as const;
export const RETAIL_DAMAGE_FORMULA_STATUS='NOT_RECOVERED' as const;

// Intentionally no calculateDamage() exists here. S3 recovered the authored
// inputs and the server-authority boundary, not the retired-server equation.

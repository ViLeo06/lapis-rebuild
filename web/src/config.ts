export const PROVISIONAL = Object.freeze({
  evidence: 'UNVERIFIED' as const,
  frameDurationMs: 160,
  movementPixelsPerSecond: 96,
  attackDamage: 18,
  attackCooldownMs: 700,
  enemyDamage: 7,
  enemyIntervalMs: 1600,
  enemyHp: 90,
  meleeRadiusPx: 95,
  rangedRadiusPx: 300,
  effectDurationMs: 600,
  revision: 'training-policy-1',
});
export const ACTIONS: Record<string,string> = { '00':'\u5f85\u673a', '01':'\u79fb\u52a8', '02':'\u653b\u51fb / \u65bd\u6cd5', '03':'\u53d7\u51fb', '05':'\u7279\u6b8a\u5e8f\u5217' };
export const DIRECTIONS = ['\u5357','\u4e1c\u5357','\u4e1c','\u4e1c\u5317','\u5317','\u897f\u5317','\u897f','\u897f\u5357'];

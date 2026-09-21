export type M7Profession='swordsman'|'wizard';

export const M7_STAGE_RANGES=Object.freeze([
  Object.freeze({stage:1,minLevel:1,maxLevel:5}),
  Object.freeze({stage:2,minLevel:6,maxLevel:15}),
  Object.freeze({stage:3,minLevel:16,maxLevel:25}),
  Object.freeze({stage:4,minLevel:26,maxLevel:35}),
  Object.freeze({stage:5,minLevel:36,maxLevel:45}),
  Object.freeze({stage:6,minLevel:46,maxLevel:55}),
  Object.freeze({stage:7,minLevel:56,maxLevel:65}),
] as const);

export const M7_PROMOTION_LEVELS=Object.freeze([6,16,26,36,46,56] as const);
export const M7_TRAINING_RECOMMENDED_LEVELS=Object.freeze([2,5,6,10,15,16,25,26,35,36,45,46,55,56,65] as const);

export const M7_STAGE_IDS=Object.freeze({
  swordsman:Object.freeze([100,110,120,130,140,150,160] as const),
  wizard:Object.freeze([109,119,129,139,149,159,169] as const),
});

export const M7_SWORDSMAN_SKILL_KEYS=Object.freeze(['1101','1201','1301','1401','1501','battle-command','stun-strike'] as const);
export const M7_SWORDSMAN_AUTHORED_SKILL_IDS=Object.freeze([1101,1201,1301,1401,1501,null,null] as const);
export const M7_WIZARD_SKILL_KEYS=Object.freeze(['dark-veil','poison-mist','nature-force','ashes','curse-eye','blindness','cursed-sword'] as const);
export const M7_WIZARD_AUTHORED_SKILL_IDS=Object.freeze([19101,19201,19301,19401,19501,null,null] as const);

export const M7_INFINITE_TRAINING_RECOVERY_POLICY=Object.freeze({
  id:'M7InfiniteTrainingRecoveryPolicy',
  provenance:'RECONSTRUCTION_POLICY' as const,
  hpAmount:200,
  mpAmount:200,
  readinessCostCandidate:10,
  infinite:true,
});

export function resolveM7StageIndex(level:number):number{
  if(!Number.isInteger(level)||level<1||level>65)throw new Error(`M7 level must be an integer in 1..65, got ${String(level)}`);
  const index=M7_STAGE_RANGES.findIndex(range=>level>=range.minLevel&&level<=range.maxLevel);
  if(index<0)throw new Error(`No M7 stage for level ${level}`);
  return index;
}

export function resolveM7StageId(profession:M7Profession,level:number):number{
  return M7_STAGE_IDS[profession][resolveM7StageIndex(level)];
}

export function isM7PromotionLevel(level:number):boolean{
  return (M7_PROMOTION_LEVELS as readonly number[]).includes(level);
}

export function isM7TrainingRecommendedLevel(level:number):boolean{
  return (M7_TRAINING_RECOMMENDED_LEVELS as readonly number[]).includes(level);
}

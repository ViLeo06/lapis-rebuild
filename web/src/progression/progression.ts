import {M71_EXPERIENCE_POLICY,m71AuthoredExperienceValue,m71LevelForExperience,m71TotalExpForLevel} from './m7-1-experience-policy.ts';
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

function knownPolicy(policyId:string):boolean{
  return policyId===RECONSTRUCTION_PROGRESSION_POLICY.id||policyId===M71_EXPERIENCE_POLICY.id;
}

export function totalExpForLevel(level:number,policyId:string=RECONSTRUCTION_PROGRESSION_POLICY.id):number{
  if(policyId===M71_EXPERIENCE_POLICY.id)return m71TotalExpForLevel(level);
  if(policyId!==RECONSTRUCTION_PROGRESSION_POLICY.id)throw new Error('Unknown progression policy');
  if(!integerIn(level,1,RECONSTRUCTION_PROGRESSION_POLICY.maxLevel))throw new Error('Invalid level');
  return 50*(level-1)*level;
}

export function levelForExperience(exp:number,policyId:string=RECONSTRUCTION_PROGRESSION_POLICY.id):number{
  if(!integerIn(exp,0,Number.MAX_SAFE_INTEGER))throw new Error('Invalid experience');
  if(policyId===M71_EXPERIENCE_POLICY.id)return m71LevelForExperience(exp);
  if(policyId!==RECONSTRUCTION_PROGRESSION_POLICY.id)throw new Error('Unknown progression policy');
  let level=1;
  while(level<RECONSTRUCTION_PROGRESSION_POLICY.maxLevel&&exp>=totalExpForLevel(level+1,policyId))level+=1;
  return level;
}

export function initialProgression():ProgressionState{
  return{level:1,exp:0,policyId:RECONSTRUCTION_PROGRESSION_POLICY.id};
}

export function initialM71Progression():ProgressionState{
  return{level:1,exp:0,policyId:M71_EXPERIENCE_POLICY.id};
}

export function migrateProgressionToM71(state:ProgressionState):ProgressionState{
  const current=validateProgression(state);
  if(current.policyId===M71_EXPERIENCE_POLICY.id||current.level>M71_EXPERIENCE_POLICY.maxLevel)return current;
  const legacyStart=totalExpForLevel(current.level,RECONSTRUCTION_PROGRESSION_POLICY.id);
  const legacyNext=totalExpForLevel(current.level+1,RECONSTRUCTION_PROGRESSION_POLICY.id);
  const legacyRequirement=legacyNext-legacyStart;
  const legacyProgress=current.exp-legacyStart;
  const authoredRequirement=m71AuthoredExperienceValue(current.level);
  const scaledProgress=Math.floor((legacyProgress/legacyRequirement)*authoredRequirement);
  const exp=m71TotalExpForLevel(current.level)+Math.min(authoredRequirement-1,Math.max(0,scaledProgress));
  return validateProgression({level:current.level,exp,policyId:M71_EXPERIENCE_POLICY.id});
}

export function validateProgression(raw: unknown): ProgressionState {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid progression');
  const state = raw as Partial<ProgressionState>;
  if(typeof state.policyId!=='string'||!knownPolicy(state.policyId))throw new Error('Unknown progression policy');
  if(!integerIn(state.exp,0,Number.MAX_SAFE_INTEGER))throw new Error('Invalid experience');
  const expectedLevel=levelForExperience(state.exp,state.policyId);
  if (state.level !== expectedLevel) throw new Error('Progression level/experience mismatch');
  return {level: expectedLevel, exp: state.exp, policyId: state.policyId};
}

export function applyExperience(state: ProgressionState, amount: number): ExperienceResult {
  const current = validateProgression(state);
  if (!integerIn(amount, 0, Number.MAX_SAFE_INTEGER - current.exp)) throw new Error('Invalid experience reward');
  const exp = current.exp + amount;
  const level=levelForExperience(exp,current.policyId);
  const levelUps: LevelUpEvent[] = [];
  for (let next = current.level + 1; next <= level; next += 1) {
    levelUps.push({type:'level_up',fromLevel:next-1,toLevel:next,totalExp:totalExpForLevel(next,current.policyId),provenance:PROGRESSION_PROVENANCE});
  }
  return {state: {level, exp, policyId: current.policyId}, levelUps};
}

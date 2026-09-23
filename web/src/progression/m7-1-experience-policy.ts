export const M71_LEVELABL_SOURCE=Object.freeze({
  file:'levelabl.atr',
  sha256:'0766b9ab5c357e1e830708ca90589cbe715bf02265e185a4c6ae900eefe287dc',
  field:'experience_value',
  rawValueEvidence:'VERIFIED-STATIC-ORIGINAL' as const,
  globalLevelMappingEvidence:'INFERRED' as const,
  oldServerConsumptionEvidence:'SERVER-BOUNDARY' as const,
});

export const M71_LEVELABL_EXPERIENCE_VALUES:readonly number[]=Object.freeze([
  500,1000,2250,4125,6300,
  8505,10206,11510,13319,14429,
  18036,22545,28181,35226,44033,
  55042,68801,86002,107503,134378,
  167973,209966,262457,328072,410090,
  512612,640765,698434,761293,829810,
  904492,985897,1074627,1171344,1276765,
  1391674,1516924,1653448,1802257,1964461,
  2141263,2333976,2544034,2772997,3022566,
  3294598,3591112,3914311,4266600,4650593,
  5069147,5525370,6022654,6564692,7155515,
  7799511,8501467,9266598,10100593,11009646,
  12000515,13080560,14257811,15541015,16939705,
]);

export const M71_EXPERIENCE_POLICY=Object.freeze({
  id:'m7-1-levelabl-experience-v1',
  provenance:'RECONSTRUCTION_POLICY' as const,
  maxLevel:65,
  authoredValueEvidence:'VERIFIED-STATIC-ORIGINAL' as const,
  globalLevelMappingEvidence:'INFERRED' as const,
  consumptionRuleEvidence:'RECONSTRUCTION_POLICY' as const,
  oldServerFormulaEvidence:'SERVER-BOUNDARY' as const,
  note:'M7.1 consumes each mapped levelabl.atr experience_value as the EXP required to advance from that global level. The values are original static data; this consumption meaning is an explicit offline reconstruction, not a recovered retail-server formula.',
});

if(M71_LEVELABL_EXPERIENCE_VALUES.length!==M71_EXPERIENCE_POLICY.maxLevel){
  throw new Error('M7.1 authored EXP table must cover Lv1..65 exactly');
}
for(let index=0;index<M71_LEVELABL_EXPERIENCE_VALUES.length;index+=1){
  const value=M71_LEVELABL_EXPERIENCE_VALUES[index]!;
  if(!Number.isSafeInteger(value)||value<=0)throw new Error('Invalid M7.1 authored EXP value');
  if(index>0&&value<=M71_LEVELABL_EXPERIENCE_VALUES[index-1]!)throw new Error('M7.1 authored EXP values must be strictly increasing');
}

const TOTAL_EXP_THRESHOLDS:readonly number[]=Object.freeze((()=>{
  const totals=[0];
  let total=0;
  for(let level=1;level<M71_EXPERIENCE_POLICY.maxLevel;level+=1){
    total+=M71_LEVELABL_EXPERIENCE_VALUES[level-1]!;
    totals.push(total);
  }
  return totals;
})());

function validLevel(level:number):void{
  if(!Number.isInteger(level)||level<1||level>M71_EXPERIENCE_POLICY.maxLevel)throw new Error('M7.1 level must be 1..65');
}

export function m71AuthoredExperienceValue(level:number):number{
  validLevel(level);
  return M71_LEVELABL_EXPERIENCE_VALUES[level-1]!;
}

export function m71TotalExpForLevel(level:number):number{
  validLevel(level);
  return TOTAL_EXP_THRESHOLDS[level-1]!;
}

export function m71LevelForExperience(exp:number):number{
  if(!Number.isSafeInteger(exp)||exp<0)throw new Error('Invalid M7.1 experience');
  let level=1;
  while(level<M71_EXPERIENCE_POLICY.maxLevel&&exp>=m71TotalExpForLevel(level+1))level+=1;
  return level;
}

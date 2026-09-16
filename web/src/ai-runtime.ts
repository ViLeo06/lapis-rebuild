import type{RuntimeProvenance}from'./runtime-boundaries.ts';
export const RETAIL_FALLBACK_AI='ODNORMAL REST(20),ATTACK(80)';
export type AiBindingSource='network'|'roster'|'fallback'|'alternate'|'reconstruction';
export type AiBinding={source:AiBindingSource;program:string|null;provenance:RuntimeProvenance};
export type NetworkAiProgram={id:number;program:string;provenance:RuntimeProvenance};
export function resolveAiBinding(unitId:number,category:number,rosterProgram:string|undefined,networkPrograms:readonly NetworkAiProgram[],rosterProvenance:RuntimeProvenance='UNVERIFIED'):AiBinding{
  const network=networkPrograms.find(p=>p.id===unitId);
  if(network)return{source:'network',program:network.program,provenance:network.provenance};
  if(category===7||category===8){
    const program=(rosterProgram??'').trim();
    return program?{source:'roster',program,provenance:rosterProvenance}:{source:'fallback',program:RETAIL_FALLBACK_AI,provenance:'VERIFIED'};
  }
  return{source:'alternate',program:null,provenance:'VERIFIED'};
}
export type WeightedAiAction='REST'|'ATTACK'|'MAGIC';
export type WeightedAiRow={action:WeightedAiAction;weight:number};
export function chooseWeightedAiAction(rows:readonly WeightedAiRow[],roll:number):WeightedAiAction|null{
  if(!Number.isInteger(roll)||roll<0||roll>=100)throw new Error('AI roll must be 0..99');
  let cumulative=0;
  for(const row of rows){if(!Number.isFinite(row.weight)||row.weight<0)throw new Error('Invalid AI weight');cumulative+=row.weight;if(roll<=cumulative)return row.action;}
  return null;
}
export function selectAiCandidate<T>(candidates:readonly T[],rawRand:number):T|null{
  if(!candidates.length)return null;
  if(!Number.isFinite(rawRand))throw new Error('Invalid AI random value');
  const n=Math.trunc(rawRand);const index=((n%candidates.length)+candidates.length)%candidates.length;
  return candidates[index]??null;
}
export const trainingAiBinding=():AiBinding=>({source:'reconstruction',program:RETAIL_FALLBACK_AI,provenance:'RECONSTRUCTION_POLICY'});

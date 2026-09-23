import {m6PromotionRuleForCharacter} from '../m6-runtime-content.ts';
import type {M6PromotionRequirement} from '../progression/m6-stage-promotion.ts';
import {M7_STAGE_RANGES} from './m7-level-axis.ts';

export const M7_FRONT_SEVEN_PROMOTION_POLICY=Object.freeze({
  id:'M7FrontSevenPromotionPolicy',
  provenance:'RECONSTRUCTION_POLICY' as const,
  levels:Object.freeze([6,16,26,36,46,56] as const),
});

export function integratedPromotionRuleForCharacter(characterId:string|number):M6PromotionRequirement|null{
  const base=m6PromotionRuleForCharacter(characterId);
  if(!base)return null;
  const numeric=Number(characterId);
  const current=M7_STAGE_RANGES.find(row=>row.swordsmanStageId===numeric||row.wizardStageId===numeric);
  if(!current||current.stage>=7)return base;
  const next=M7_STAGE_RANGES.find(row=>row.stage===current.stage+1);
  if(!next)throw new Error(`Missing M7 promotion target after stage ${current.stage}`);
  const expectedTo=current.swordsmanStageId===numeric?next.swordsmanStageId:next.wizardStageId;
  if(base.toStageId!==expectedTo)throw new Error(`M6/M7 promotion target mismatch for ${String(characterId)}`);
  return Object.freeze({
    ...base,
    id:`m7-front-seven-${base.fromStageId}-${base.toStageId}`,
    minimumLevel:next.minimumLevel,
    provenance:'RECONSTRUCTION_POLICY' as const,
  });
}

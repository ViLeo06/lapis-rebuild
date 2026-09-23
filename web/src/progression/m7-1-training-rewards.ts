import {m71AuthoredExperienceValue} from './m7-1-experience-policy.ts';

export type M71TrainingDifficultyBand='Normal'|'Hard'|'Elite'|'Boss';
export type M71BattleOutcome='victory'|'retreat'|'failure';

export const M71_TRAINING_EXP_POLICY=Object.freeze({
  id:'m7-1-training-exp-v1',
  provenance:'RECONSTRUCTION_POLICY' as const,
  ratioPercent:Object.freeze({
    Normal:35,
    Hard:45,
    Elite:55,
    Boss:80,
  }),
  noRewardOutcomes:Object.freeze(['retreat','failure'] as const),
  note:'Victory EXP is a reconstruction percentage of the fixed-hash authored experience_value mapped to the training battle recommended level. Enemy levels remain fixed.',
});

export function m71TrainingExpReward(
  recommendedLevel:number,
  difficultyBand:M71TrainingDifficultyBand,
):number{
  const ratio=M71_TRAINING_EXP_POLICY.ratioPercent[difficultyBand];
  if(!ratio)throw new Error('Unknown M7.1 training difficulty band');
  return Math.round(m71AuthoredExperienceValue(recommendedLevel)*ratio/100);
}

export function m71TrainingExpForOutcome(
  recommendedLevel:number,
  difficultyBand:M71TrainingDifficultyBand,
  outcome:M71BattleOutcome,
):number{
  if(outcome==='retreat'||outcome==='failure')return 0;
  if(outcome!=='victory')throw new Error('Unknown M7.1 battle outcome');
  return m71TrainingExpReward(recommendedLevel,difficultyBand);
}

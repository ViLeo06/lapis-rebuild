import type{RuntimeProvenance}from'./runtime-boundaries.ts';

export type Point={x:number;y:number};
export type VisualPolicy={
  readonly id:string;
  readonly provenance:RuntimeProvenance;
  readonly foregroundOcclusion:'disabled-until-recovered';
  effectOrigin(actor:Point,target:Point|null,buff:boolean):Point;
  terminalPlayerAlpha(phase:'safe'|'active'|'won'|'lost'):number;
};

// These choices keep the current preview playable while making the unrecovered
// semantics replaceable. S5 did not recover MagicRes placement/blend/stage
// composition, universal death state, or SMF foreground occlusion.
export const TRAINING_VISUAL_POLICY:VisualPolicy=Object.freeze({
  id:'offline-visual-policy-v1',
  provenance:'RECONSTRUCTION_POLICY' as const,
  foregroundOcclusion:'disabled-until-recovered' as const,
  effectOrigin(actor:Point,target:Point|null,buff:boolean):Point{return buff||!target?{...actor}:{...target};},
  terminalPlayerAlpha(phase:'safe'|'active'|'won'|'lost'):number{return phase==='lost'?.3:1;},
});

import type{RuntimeProvenance}from'../runtime-boundaries.ts';

export type DeathPresentationTarget='player'|'enemy';
export type DeathPresentationCue={
  kind:'freeze'|'fade'|'terminal-hold'|'remove';
  atMs:number;
  alpha?:number;
  provenance:RuntimeProvenance;
  note:string;
};

export type DeathPresentationPlan={
  policyId:string;
  target:DeathPresentationTarget;
  provenance:RuntimeProvenance;
  cues:readonly DeathPresentationCue[];
};

export interface DeathPresentationPolicy{
  readonly id:string;
  readonly provenance:RuntimeProvenance;
  plan(target:DeathPresentationTarget):DeathPresentationPlan;
}

// S5 did not recover a universal death action state. In particular, `_05`
// must not be promoted to a universal death animation. This low-key fade keeps
// a terminal unit readable while remaining replaceable by future evidence.
export const RECONSTRUCTION_DEATH_PRESENTATION:DeathPresentationPolicy=Object.freeze({
  id:'battle-death-fade-v1',
  provenance:'RECONSTRUCTION_POLICY' as const,
  plan(target:DeathPresentationTarget):DeathPresentationPlan{
    const terminalAlpha=target==='player'?0.3:0;
    const cues:DeathPresentationCue[]=[
      {kind:'freeze',atMs:0,provenance:'RECONSTRUCTION_POLICY',note:'Stop active locomotion/action without assigning an unrecovered death ANI state.'},
      {kind:'fade',atMs:120,alpha:terminalAlpha,provenance:'RECONSTRUCTION_POLICY',note:'Short fade is a temporary readability policy, not retail evidence.'},
      {kind:'terminal-hold',atMs:420,alpha:terminalAlpha,provenance:'RECONSTRUCTION_POLICY',note:'Hold terminal player silhouette; dead enemies may be removed after the fade.'},
    ];
    if(target==='enemy')cues.push({kind:'remove',atMs:520,alpha:0,provenance:'RECONSTRUCTION_POLICY',note:'Enemy removal timing is reconstruction policy.'});
    return Object.freeze({policyId:this.id,target,provenance:this.provenance,cues:Object.freeze(cues)});
  },
});

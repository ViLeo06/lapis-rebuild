import{sequenceDurationMs}from'../animation-policy.ts';
import type{RuntimeProvenance}from'../runtime-boundaries.ts';

export type Point={x:number;y:number};
export type MagicAttachment='caster'|'target'|'cell'|'screen'|'world';
export type MagicSpace='world'|'screen';

export type MagicEffectResourceInput={
  resourceId:number;
  rawTiming:number;
  frameCount:number;
  role?:string;
  rawStartTick?:number;
  focusRow?:number;
};

export type MagicEffectContext={
  caster:Point;
  target?:Point|null;
  cell?:Point|null;
  screen?:Point|null;
  world?:Point|null;
};

export type MagicEffectStage={
  resourceId:number;
  role:string|null;
  attachment:MagicAttachment;
  space:MagicSpace;
  origin:Point;
  focusRow:number|null;
  focusSemantic:'raw-row-unlabelled';
  rawStartTick:number|null;
  rawStartTickProvenance:'UNVERIFIED';
  startMs:number;
  durationMs:number;
  timingPolicy:'RETAIL_COMMON';
  timingProvenance:RuntimeProvenance;
  anchor:'origin-plus-authored-frame-bounds';
  anchorProvenance:'RECONSTRUCTION_POLICY';
  blend:'runtime-default';
  blendProvenance:'UNVERIFIED';
  provenance:'RECONSTRUCTION_POLICY';
};

export type MagicEffectPlan={
  policyId:string;
  provenance:'RECONSTRUCTION_POLICY';
  stages:readonly MagicEffectStage[];
  totalDurationMs:number;
};

export interface MagicEffectPlacementPolicy{
  readonly id:string;
  readonly provenance:'RECONSTRUCTION_POLICY';
  plan(resources:readonly MagicEffectResourceInput[],context:MagicEffectContext):MagicEffectPlan;
}

function point(value:Point|undefined|null,name:string):Point{
  if(!value||![value.x,value.y].every(Number.isFinite))throw new Error(`Missing ${name} placement point`);
  return{x:value.x,y:value.y};
}

function attachmentFor(role:string|undefined,context:MagicEffectContext):{attachment:MagicAttachment;space:MagicSpace;origin:Point}{
  const key=(role??'').trim().toLowerCase();
  if(key.includes('caster')||key.includes('self')||key.includes('buff'))return{attachment:'caster',space:'world',origin:point(context.caster,'caster')};
  if(key.includes('screen'))return{attachment:'screen',space:'screen',origin:point(context.screen,'screen')};
  if(key.includes('world'))return{attachment:'world',space:'world',origin:point(context.world,'world')};
  if(key.includes('cell'))return{attachment:'cell',space:'world',origin:point(context.cell,'cell')};
  if(context.target)return{attachment:'target',space:'world',origin:point(context.target,'target')};
  if(context.cell)return{attachment:'cell',space:'world',origin:point(context.cell,'cell')};
  return{attachment:'caster',space:'world',origin:point(context.caster,'caster')};
}

function validateResource(resource:MagicEffectResourceInput):void{
  if(!Number.isInteger(resource.resourceId)||resource.resourceId<0)throw new Error('Invalid MagicRes resource id');
  if(!Number.isFinite(resource.rawTiming)||resource.rawTiming<=0)throw new Error('Invalid MagicRes raw timing');
  if(!Number.isInteger(resource.frameCount)||resource.frameCount<1)throw new Error('Invalid MagicRes frame count');
  if(resource.rawStartTick!==undefined&&(!Number.isFinite(resource.rawStartTick)||resource.rawStartTick<0))throw new Error('Invalid raw magic start tick');
  if(resource.focusRow!==undefined&&(!Number.isInteger(resource.focusRow)||resource.focusRow<0||resource.focusRow>7))throw new Error('Invalid raw FOCUS row');
}

// Placement, FOCUS semantics, stage transition, anchor and blend are not
// recovered. The policy deliberately keeps them together so S13 can replace
// the whole decision surface instead of spreading guesses through scene code.
export const RECONSTRUCTION_MAGIC_EFFECT_PLACEMENT:MagicEffectPlacementPolicy=Object.freeze({
  id:'magic-effect-placement-v1',
  provenance:'RECONSTRUCTION_POLICY' as const,
  plan(resources:readonly MagicEffectResourceInput[],context:MagicEffectContext):MagicEffectPlan{
    if(!resources.length)return Object.freeze({policyId:this.id,provenance:this.provenance,stages:Object.freeze([]),totalDurationMs:0});
    point(context.caster,'caster');
    let cursor=0;
    const stages=resources.map(resource=>{
      validateResource(resource);
      const placement=attachmentFor(resource.role,context);
      // `rawStartTick` is preserved but intentionally not converted to ms: its
      // unit and stage consumer are still unresolved. Sequential playback is a
      // reconstruction fallback until that conversion is evidenced.
      const duration=sequenceDurationMs(resource.rawTiming,resource.frameCount);
      const stage:MagicEffectStage={
        resourceId:resource.resourceId,
        role:resource.role??null,
        attachment:placement.attachment,
        space:placement.space,
        origin:placement.origin,
        focusRow:resource.focusRow??null,
        focusSemantic:'raw-row-unlabelled',
        rawStartTick:resource.rawStartTick??null,
        rawStartTickProvenance:'UNVERIFIED',
        startMs:cursor,
        durationMs:duration,
        timingPolicy:'RETAIL_COMMON',
        timingProvenance:'RECONSTRUCTION_POLICY',
        anchor:'origin-plus-authored-frame-bounds',
        anchorProvenance:'RECONSTRUCTION_POLICY',
        blend:'runtime-default',
        blendProvenance:'UNVERIFIED',
        provenance:'RECONSTRUCTION_POLICY',
      };
      cursor+=duration;
      return Object.freeze(stage);
    });
    return Object.freeze({policyId:this.id,provenance:this.provenance,stages:Object.freeze(stages),totalDurationMs:cursor});
  },
});

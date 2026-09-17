import type{RuntimeProvenance}from'../runtime-boundaries.ts';
import{buildAttackTimeline,buildAuthoritativeHitFeedback}from'./attack-timeline.ts';
import type{AttackTimeline}from'./attack-timeline.ts';
import{RECONSTRUCTION_DEATH_PRESENTATION}from'./death-policy.ts';
import type{DeathPresentationPlan,DeathPresentationPolicy,DeathPresentationTarget}from'./death-policy.ts';
import{RECONSTRUCTION_MAGIC_EFFECT_PLACEMENT}from'./magic-effect-policy.ts';
import type{MagicEffectContext,MagicEffectPlan,MagicEffectPlacementPolicy,MagicEffectResourceInput}from'./magic-effect-policy.ts';
import{BattleAudioRouter}from'./audio-router.ts';
import type{BattleAudioRoute}from'./audio-router.ts';

export type BattlePresentationKind='battle-start'|'move'|'selection'|'attack'|'hit'|'magic'|'death'|'victory'|'defeat';
export type BattleVisualCue={
  kind:
    |'battle-enter'
    |'move-start'
    |'move-end'
    |'target-selected'
    |'attack-phase'
    |'hit-reaction'
    |'damage-number'
    |'hp-bar-tween'
    |'camera-nudge'
    |'magic-stage'
    |'death-phase'
    |'victory-banner'
    |'defeat-banner';
  atMs:number;
  durationMs?:number;
  targetId?:string;
  amount?:number;
  actionState?:number;
  resourceId?:number;
  provenance:RuntimeProvenance;
  note:string;
};

export type BattlePresentationBatch={
  kind:BattlePresentationKind;
  visual:readonly BattleVisualCue[];
  audio:readonly BattleAudioRoute[];
  attackTimeline?:AttackTimeline;
  magicPlan?:MagicEffectPlan;
  deathPlan?:DeathPresentationPlan;
};

export class BattlePresentation{
  readonly audio:BattleAudioRouter;
  readonly death:DeathPresentationPolicy;
  readonly magic:MagicEffectPlacementPolicy;
  constructor(input:{audio?:BattleAudioRouter;death?:DeathPresentationPolicy;magic?:MagicEffectPlacementPolicy}={}){
    this.audio=input.audio??new BattleAudioRouter();
    this.death=input.death??RECONSTRUCTION_DEATH_PRESENTATION;
    this.magic=input.magic??RECONSTRUCTION_MAGIC_EFFECT_PLACEMENT;
  }

  battleStart(input:{zoneId:number;metadataTrackId?:number|null;liveModeTrack?:7|8}):BattlePresentationBatch{
    return Object.freeze({
      kind:'battle-start' as const,
      visual:Object.freeze<BattleVisualCue[]>([
        {kind:'battle-enter',atMs:0,durationMs:180,provenance:'RECONSTRUCTION_POLICY',note:'Short battle-enter settle; camera ownership remains with the scene.'},
      ]),
      audio:Object.freeze([this.audio.route({kind:'battle-bgm',...input})]),
    });
  }

  move(input:{targetId?:string;durationMs:number}):BattlePresentationBatch{
    if(!Number.isFinite(input.durationMs)||input.durationMs<0)throw new Error('Invalid move presentation duration');
    return Object.freeze({
      kind:'move' as const,
      visual:Object.freeze<BattleVisualCue[]>([
        {kind:'move-start',atMs:0,targetId:input.targetId,provenance:'RECONSTRUCTION_POLICY',note:'Presentation boundary only; movement legality and readiness stay in battle runtime.'},
        {kind:'move-end',atMs:input.durationMs,targetId:input.targetId,provenance:'RECONSTRUCTION_POLICY',note:'Presentation completion cue; does not spend readiness.'},
      ]),
      audio:Object.freeze([]),
    });
  }

  selection(targetId:string):BattlePresentationBatch{
    if(!targetId)throw new Error('Invalid target id');
    return Object.freeze({
      kind:'selection' as const,
      visual:Object.freeze<BattleVisualCue[]>([
        {kind:'target-selected',atMs:0,targetId,durationMs:160,provenance:'RECONSTRUCTION_POLICY',note:'Low-key selection pulse; no gameplay state mutation.'},
      ]),
      audio:Object.freeze([]),
    });
  }

  attack(input:{rawTiming:number;frameCount:number;impactFrame?:number;impactProvenance?:RuntimeProvenance}):BattlePresentationBatch{
    const timeline=buildAttackTimeline(input);
    const visual=timeline.cues.map(cue=>Object.freeze<BattleVisualCue>({
      kind:cue.phase==='defender-hit-reaction'?'hit-reaction':cue.phase==='damage-display'?'damage-number':'attack-phase',
      atMs:cue.atMs,
      actionState:cue.actionState,
      provenance:cue.provenance,
      note:cue.note,
    }));
    return Object.freeze({
      kind:'attack' as const,
      visual:Object.freeze(visual),
      audio:Object.freeze([this.audio.route({kind:'attack-sfx'})]),
      attackTimeline:timeline,
    });
  }

  hit(input:{targetId:string;amount:number;resultingHp:number;maxHp:number}):BattlePresentationBatch{
    if(!Number.isFinite(input.maxHp)||input.maxHp<=0||input.resultingHp>input.maxHp)throw new Error('Invalid HP range');
    const hit=buildAuthoritativeHitFeedback(input);
    const visual:BattleVisualCue[]=[
      {kind:'hit-reaction',atMs:0,targetId:input.targetId,actionState:3,provenance:'VERIFIED',note:hit.cues[0].note},
      {kind:'damage-number',atMs:0,targetId:input.targetId,amount:input.amount,durationMs:520,provenance:'RECONSTRUCTION_POLICY',note:'Render the authoritative HP delta as restrained floating combat text.'},
      {kind:'hp-bar-tween',atMs:0,targetId:input.targetId,amount:input.amount,durationMs:180,provenance:'RECONSTRUCTION_POLICY',note:'Animate from previous HP to authoritative resulting HP without changing combat authority.'},
      {kind:'camera-nudge',atMs:0,targetId:input.targetId,durationMs:70,provenance:'RECONSTRUCTION_POLICY',note:'Subtle camera feedback only; deliberately avoids modern heavy shake.'},
    ];
    return Object.freeze({kind:'hit' as const,visual:Object.freeze(visual),audio:Object.freeze([this.audio.route({kind:'hit-sfx'})])});
  }

  magicEffect(input:{resources:readonly MagicEffectResourceInput[];context:MagicEffectContext;magicSoundId?:number}):BattlePresentationBatch{
    const plan=this.magic.plan(input.resources,input.context);
    const visual=plan.stages.map(stage=>Object.freeze<BattleVisualCue>({
      kind:'magic-stage',atMs:stage.startMs,durationMs:stage.durationMs,resourceId:stage.resourceId,
      provenance:stage.provenance,
      note:`${stage.attachment}/${stage.space}; FOCUS row remains raw/unlabelled; anchor/blend/stage timing are explicit policy.`,
    }));
    return Object.freeze({
      kind:'magic' as const,
      visual:Object.freeze(visual),
      audio:Object.freeze([this.audio.route({kind:'magic-sfx',magicSoundId:input.magicSoundId})]),
      magicPlan:plan,
    });
  }

  deathOf(target:DeathPresentationTarget,targetId:string):BattlePresentationBatch{
    if(!targetId)throw new Error('Invalid death target id');
    const plan=this.death.plan(target);
    const visual=plan.cues.map(cue=>Object.freeze<BattleVisualCue>({
      kind:'death-phase',atMs:cue.atMs,durationMs:cue.kind==='fade'?300:undefined,targetId,
      provenance:cue.provenance,note:cue.note,
    }));
    return Object.freeze({
      kind:'death' as const,visual:Object.freeze(visual),
      audio:Object.freeze([this.audio.route({kind:'death-sfx'})]),deathPlan:plan,
    });
  }

  terminal(phase:'won'|'lost'):BattlePresentationBatch{
    const won=phase==='won';
    return Object.freeze({
      kind:won?'victory' as const:'defeat' as const,
      visual:Object.freeze<BattleVisualCue[]>([
        {
          kind:won?'victory-banner':'defeat-banner',atMs:180,durationMs:1200,
          provenance:'RECONSTRUCTION_POLICY',
          note:won?'Restrained victory banner after combat settles.':'Restrained defeat banner; death animation semantics remain separate and unresolved.',
        },
      ]),
      audio:Object.freeze(won?[this.audio.route({kind:'victory'})]:[]),
    });
  }
}

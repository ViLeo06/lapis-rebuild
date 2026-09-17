import {frameIntervalMs,sequenceDurationMs} from '../animation-policy.ts';
import type{RuntimeProvenance}from'../runtime-boundaries.ts';

export type AttackPresentationPhase=
  |'attacker-start'
  |'impact'
  |'defender-hit-reaction'
  |'damage-display'
  |'recovery'
  |'action-end';

export type AttackTimelineCue={
  phase:AttackPresentationPhase;
  atMs:number;
  provenance:RuntimeProvenance;
  timingProvenance:RuntimeProvenance;
  actionState?:number;
  actionStateProvenance?:RuntimeProvenance;
  note:string;
};

export type AttackTimeline={
  readonly id:'attack-presentation-v1';
  readonly rawTiming:number;
  readonly frameCount:number;
  readonly frameIntervalMs:number;
  readonly durationMs:number;
  readonly impactFrame:number;
  readonly impactProvenance:RuntimeProvenance;
  readonly cues:readonly AttackTimelineCue[];
};

export type AttackTimelineInput={
  rawTiming:number;
  frameCount:number;
  impactFrame?:number;
  impactProvenance?:RuntimeProvenance;
};

function defaultImpactFrame(frameCount:number):number{
  if(frameCount===1)return 0;
  return Math.max(1,Math.min(frameCount-1,Math.round((frameCount-1)*0.6)));
}

export function buildAttackTimeline(input:AttackTimelineInput):AttackTimeline{
  if(!Number.isInteger(input.frameCount)||input.frameCount<1)throw new Error('Invalid attack frame count');
  const interval=frameIntervalMs(input.rawTiming);
  const duration=sequenceDurationMs(input.rawTiming,input.frameCount);
  const impactFrame=input.impactFrame??defaultImpactFrame(input.frameCount);
  if(!Number.isInteger(impactFrame)||impactFrame<0||impactFrame>=input.frameCount)throw new Error('Invalid attack impact frame');
  const impactProvenance=input.impactProvenance??'RECONSTRUCTION_POLICY';
  const impactAt=impactFrame*interval;
  const recoveryAt=Math.min(duration,impactAt+Math.max(interval,100));
  const cues:AttackTimelineCue[]=[
    {
      phase:'attacker-start',atMs:0,
      provenance:'RECONSTRUCTION_POLICY',timingProvenance:'VERIFIED',
      note:'Current Web battle uses an attacker transient action; a universal retail attack-state binding is not claimed.',
    },
    {
      phase:'impact',atMs:impactAt,
      provenance:impactProvenance,timingProvenance:impactProvenance,
      note:'No universal retail impact frame has been recovered. Replace this cue when authoritative/effect timing is available.',
    },
    {
      phase:'defender-hit-reaction',atMs:impactAt,
      provenance:'RECONSTRUCTION_POLICY',timingProvenance:impactProvenance,
      actionState:3,actionStateProvenance:'VERIFIED',
      note:'Action state 3 / _03 is VERIFIED for HP-loss hit reaction; synchronizing it to this predicted impact frame is reconstruction.',
    },
    {
      phase:'damage-display',atMs:impactAt,
      provenance:'RECONSTRUCTION_POLICY',timingProvenance:impactProvenance,
      note:'Floating damage feedback is a presentation reconstruction and is not a recovered retail UI rule.',
    },
    {
      phase:'recovery',atMs:recoveryAt,
      provenance:'RECONSTRUCTION_POLICY',timingProvenance:'RECONSTRUCTION_POLICY',
      note:'Recovery hold is intentionally lightweight and replaceable.',
    },
    {
      phase:'action-end',atMs:duration,
      provenance:'RECOVERED_SECONDARY',timingProvenance:'VERIFIED',
      note:'State 2 is transient in the recovered action-end handling; exact command lock duration remains a runtime policy.',
    },
  ];
  return Object.freeze({
    id:'attack-presentation-v1' as const,
    rawTiming:input.rawTiming,
    frameCount:input.frameCount,
    frameIntervalMs:interval,
    durationMs:duration,
    impactFrame,
    impactProvenance,
    cues:Object.freeze(cues),
  });
}

export type AuthoritativeHitFeedback={
  readonly trigger:'authoritative-hp-loss';
  readonly targetId:string;
  readonly amount:number;
  readonly resultingHp:number;
  readonly cues:readonly AttackTimelineCue[];
};

export function buildAuthoritativeHitFeedback(input:{targetId:string;amount:number;resultingHp:number}):AuthoritativeHitFeedback{
  if(!input.targetId||!Number.isFinite(input.amount)||input.amount<=0||!Number.isFinite(input.resultingHp)||input.resultingHp<0)throw new Error('Invalid HP-loss feedback');
  return Object.freeze({
    trigger:'authoritative-hp-loss' as const,
    targetId:input.targetId,
    amount:input.amount,
    resultingHp:input.resultingHp,
    cues:Object.freeze<AttackTimelineCue[]>([
      {
        phase:'defender-hit-reaction',atMs:0,
        provenance:'VERIFIED',timingProvenance:'VERIFIED',
        actionState:3,actionStateProvenance:'VERIFIED',
        note:'Positive authoritative HP loss selects hit presentation and action state 3 in the recovered retail consumer.',
      },
      {
        phase:'damage-display',atMs:0,
        provenance:'RECONSTRUCTION_POLICY',timingProvenance:'VERIFIED',
        note:'Display the already-authoritative HP delta; the number rendering itself is reconstruction feedback.',
      },
    ]),
  });
}

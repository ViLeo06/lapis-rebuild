# S5 Visual Fidelity → S6 integration notes

> Branch scope: `codex/visual-fidelity`, baseline `f9c96fc68b7bae7ff1793fc423875d43a08d6cb4`.
>
> S5 deliberately does not modify `web/src/scene.ts`, `web/src/main.ts` or `web/src/battle.ts`. Runtime application belongs to S6.

## Safe facts to integrate

### 1. ANI cadence

Keep the authored ANI timing float in data. For the normal recovered consumers:

`frame_interval_ms = 1000.0 / raw_timing`

The clock compared against that threshold is milliseconds derived from `QueryPerformanceCounter/Frequency`.

Examples: raw `5` → 200 ms/frame, `10` → 100 ms/frame, `30` → ~33.33 ms/frame.

Do **not** destructively convert the parser field into a single duration. At least one verified caller computes `1000 / (raw_timing - 1)`, so the runtime/model should allow a consumer-specific timing policy.

### 2. Character action state / ANI suffix

The original loader formats the numeric state directly into `B%03d_%02d.ani`.

Runtime state setup resets frame index and selects the initial frame from the active ANI row. End behavior is recovered for states 2..8:

- 2, 3, 5: transient; return to 0 and optionally movement state 1;
- 4, 6: continue/wrap;
- 7: return to 0;
- 8: terminal/active-clear path.

Do not attach unsupported gameplay names to 4..8. `_05` is not universally death.

### 3. Hit reaction

When an authoritative signed absolute HP update reduces HP, the retail consumer:

`positive HP loss -> choose/play hit SFX -> set action state 3 -> write incoming absolute HP`

State 3 therefore runtime-binds `_03` as hit reaction.

For attack/hit synchronization, use the authoritative/effect event as the hit trigger. S5 did not recover a universal attacker frame number that locally triggers the defender reaction.

### 4. Audio

Safe resource/trigger facts:

- HP-loss hit path uses the `NDS-000%d.wav`, `NDS-001%d.wav`, `NDS-0030.wav`, `NDS-0040.wav`, `NDS-0050.wav` families.
- BGM filename family exists as `Sound\NDS-8%03d.mid`.
- Magic/effect code contains `NDS-4%03d.wav` near the MagicRes resource path.

Only the first item currently has a full gameplay trigger chain. Map/BGM selection and exact magic stage/SFX association still require evidence.

### 5. MagicRes

Preserve `FOCUS/_FOCUS` ANI rows exactly as authored. Do not reuse character direction labels for those rows.

Safe templates:

- `%sMagicRes\%s`
- `magic-%03d.ani`
- `magic-%03d.spr`

Placement, anchor, blend mode, FOCUS row meaning and multi-stage composition remain unresolved.

### 6. Map layering

All 178,227 parsed SMF object records have signed `layer=-1`; the byte `flags` varies 0..4, with 60,560 nonzero records.

Therefore S6 must not implement foreground occlusion as `z = smf.layer`. Preserve both fields, but keep any temporary occlusion rule explicitly labelled reconstruction policy until the retail consumer is linked.

## S6 model recommendation

A minimal evidence-compatible representation is:

```text
AnimationClip
  resource/state id
  8 raw row frame lists
  rawTiming
  timingPolicy

CharacterPresentationState
  actionState
  directionRow
  frameIndex
  lastFrameAdvanceMs

EffectPresentation
  MagicRes resource id
  raw focus row index
  frame index
  timing policy
  placement/blend policy = UNVERIFIED until recovered
```

This keeps recovered data lossless and prevents today’s unknown semantics from being baked into the parser.

## Validation inputs

- `tools/probe_visual_fidelity.py`: full ANI/MagicRes/SMF/audio inventory and PE import/string evidence.
- `tools/probe_visual_semantics.py`: fixed-hash exact-byte verifier for ANI timing, character action transitions, HP-loss hit reaction and resource/audio templates.
- `tests/parsers/test_visual_fidelity_probe.py`
- `tests/parsers/test_visual_semantics.py`
- `tools/build_s5_visual_preview.py`: private human-checkable visual strips.
- `.github/workflows/static-visual-recovery.yml`: fixed installer/hash static-only reconstruction and artifact generation.

## Explicitly unresolved — do not promote to VERIFIED in S6

- exact state/death binding;
- exact attack impact frame before the authoritative HP effect arrives;
- MagicRes placement/anchor/blend/direction/stage-transition semantics;
- multi-effect composition order;
- SMF flags → foreground occlusion/object z-order semantics;
- BGM selection/fade/restart rules;
- exact magic/death/attack SFX trigger tables beyond the recovered hit path.

If S6 needs temporary behavior for any of the above, mark it `RECONSTRUCTION_POLICY` and keep it replaceable.

# S10 Battle Presentation & Feedback -> S13 integration notes

> Branch: `codex/battle-presentation`  
> Baseline: `6452effb0d6a9d26b3b285fc5fe4ead3e8b68ce7`  
> Scope: presentation only. No damage formula, enemy AI, readiness, targeting legality, reward, save, or encounter authority changes.

## Result

S10 adds a replaceable battle-presentation layer under `web/src/presentation/` and deliberately leaves `web/src/main.ts`, `web/src/scene.ts`, and `web/src/battle.ts` untouched for S13 integration.

New modules:

- `attack-timeline.ts` — ANI-cadence-aware attack phases plus an authoritative HP-loss hit-feedback path.
- `battle-presentation.ts` — single coordinator for battle start, move, selection, attack, hit, magic, death, victory, and defeat feedback.
- `death-policy.ts` — explicit reconstruction death presentation that does **not** claim `_05` is a retail death state.
- `magic-effect-policy.ts` — caster/target/cell/screen/world placement policy, raw FOCUS row preservation, multi-stage plan, anchor/blend/timing provenance.
- `audio-router.ts` — event-to-audio routing; no scattered `play()` calls and no silent guessing across evidence gaps.
- `web/tests/battle-presentation.test.ts` — pure logic coverage.
- `web/e2e/s10-presentation-harness.spec.ts` — deterministic synthetic screenshot harness for the eight requested presentation states.

## Evidence boundary

### VERIFIED

- Common ANI consumer cadence: `frame_interval_ms = 1000 / raw_timing`.
- Action state `3` / `_03` is the HP-loss hit reaction when an authoritative signed absolute HP update reduces HP.
- BGM normal selection chain: `zoneId -> metadata track / fallback -> Sound/NDS-8NNN.mid`, including the recovered special-zone live-mode branch.
- Hit SFX comes from the recovered `NDS-000%d.wav`, `NDS-001%d.wav`, `NDS-0030.wav`, `NDS-0040.wav`, `NDS-0050.wav` family.
- `NDS-4%03d.wav` is recovered near the MagicRes path as a magic/effect audio template.
- MagicRes FOCUS rows must be retained raw; they are not character direction labels.

### RECOVERED_SECONDARY

- State `2` is transient in the recovered action-end handling and returns to state `0` (optionally movement state `1`). S10 uses this only as an action-end presentation boundary, not as proof of a universal gameplay command lock.

### RECONSTRUCTION_POLICY

- Default attack impact frame (60% through the current attack clip when no stronger event timing exists).
- Synchronizing predicted impact to a defender hit before an authoritative HP-loss event arrives.
- Floating damage number, HP-bar tween, selection pulse, short camera nudge, battle-enter settle, victory/defeat banner.
- Generic Web hit-sound fallback member (`Sound/NDS-0030.wav`) even though the HP-loss family itself is verified.
- Death freeze/fade/remove presentation.
- Magic attachment-role interpretation, sequential multi-stage fallback, frame-bounds anchor application.
- Caller-supplied magic sound id binding.

### UNVERIFIED

- Universal retail attack impact frame.
- Universal death action state; `_05` is explicitly **not** promoted to death.
- MagicRes placement formula, anchor origin, blend mode, FOCUS semantics, stage transition rule, `rawStartTick` unit.
- Exact attack/death/victory SFX trigger tables.
- Exact magic resource/stage -> `NDS-4xxx.wav` mapping.

## Attack presentation contract

`buildAttackTimeline()` always exposes:

1. attacker start
2. impact
3. defender hit reaction
4. damage display
5. recovery
6. action end

The deterministic predicted timeline exists for visual continuity and screenshot harnessing. Runtime integration should prefer `buildAuthoritativeHitFeedback()` when the actual battle runtime emits positive HP loss. That path marks `_03` semantics as VERIFIED while keeping damage-number rendering as reconstruction.

Do not move damage authority into this layer. Presentation consumes results; it does not calculate them.

## Death policy

`RECONSTRUCTION_DEATH_PRESENTATION` avoids assigning an ANI state that has not been recovered. It freezes active presentation, applies a short fade, then removes an enemy or leaves a dim player silhouette.

This is intentionally plain and early-PC-like. When a retail death binding is recovered, replace the policy rather than adding a second special case in `scene.ts`.

## MagicRes policy

`RECONSTRUCTION_MAGIC_EFFECT_PLACEMENT` accepts a list of effect resources and produces stage plans with:

- resource id
- raw role string
- caster / target / cell / screen / world attachment
- world/screen space
- raw FOCUS row (`0..7`) without direction labels
- raw `start_tick` retained without unit conversion
- stage start/duration
- anchor and blend evidence labels

The current fallback plays stages sequentially. `rawStartTick` remains visible in the plan but is **not** interpreted as milliseconds or ANI frames until its consumer/unit is recovered.

Applying the common ANI cadence to MagicRes stage duration is also marked reconstruction at the stage level because S5 did not link the specific MagicRes consumer strongly enough to universalize that timing rule.

## Audio router

`BattleAudioRouter` is the only S10 component that turns presentation events into audio resource requests. It never calls WebAudio/Phaser `play()` itself.

Supported events:

- battle BGM
- attack SFX
- hit SFX
- magic SFX
- death SFX
- victory

Behavior across evidence gaps is explicit:

- BGM with required recovered metadata/live mode -> ready/VERIFIED route.
- BGM without required metadata/live mode -> `unresolved`, no guessed track.
- Hit SFX -> verified family, reconstruction fallback member by default.
- Magic SFX -> verified `NDS-4%03d.wav` template only when a sound id is supplied; binding remains reconstruction.
- Attack/death/victory -> unresolved unless S13 supplies explicit reconstruction paths.

S13 should have one small adapter that consumes `BattleAudioRoute` and talks to Phaser/WebAudio. Do not scatter event-specific `play()` calls around battle business logic.

## S13 minimal integration recipe

Keep the integration narrow:

1. Construct one `BattlePresentation` beside the scene runtime.
2. On battle entry, call `battleStart()` and route its BGM request through the audio adapter.
3. On target selection, consume `selection()` only for visual highlight.
4. On a legal movement already accepted by battle/tactics code, consume `move()`; never let presentation decide reachability or spend readiness.
5. On attack command acceptance, consume `attack()` using the active ANI raw timing/frame count.
6. When `useAttack()` or `updateBattle()` emits `hp-loss`, call `hit()` immediately. This authoritative event owns `_03` hit timing and damage-number value.
7. For skills, pass the full `magic_resources[]` list into `magicEffect()` rather than only the first resource. Preserve each raw `start_tick` and FOCUS row.
8. When HP reaches zero, call `deathOf()`; do not set `_05` unless future evidence proves that binding.
9. On phase change, call `terminal('won'|'lost')` after active actions settle.
10. Let existing battle state remain the single authority for HP, MP, AI, phase, readiness, rewards, and legal commands.

## Feedback style guardrails

S10 deliberately avoids modern mobile-combat effects:

- no full-screen flashes
- no large combo text
- no long camera shakes
- no bloom-heavy particles
- no oversized damage numbers

The intended integration is a short selection pulse, compact damage number, ~180 ms HP-bar tween, ~70 ms camera nudge, restrained terminal banner, and authored sprite/MagicRes art remaining visually dominant.

## Validation

Local pure-module validation performed before commit:

```text
node --experimental-strip-types --test tests/battle-presentation.test.ts
# 6 tests passed

tsc --noEmit
# passed against an isolated strict TS harness using the repository tsconfig options
```

The unit tests prove:

- common ANI cadence is consumed while impact remains reconstruction;
- authoritative HP loss maps to VERIFIED `_03` semantics;
- death policy does not claim `_05`;
- MagicRes retains raw FOCUS row and raw start tick;
- audio gaps remain unresolved/reconstruction rather than guessed as retail;
- all eight requested presentation categories are exposed without changing combat rules.

### Screenshot harness

`web/e2e/s10-presentation-harness.spec.ts` generates deterministic 960x540 synthetic screenshots:

1. `s10-01-battle-start.png`
2. `s10-02-move.png`
3. `s10-03-attack.png`
4. `s10-04-hit.png`
5. `s10-05-magic.png`
6. `s10-06-death.png`
7. `s10-07-victory.png`
8. `s10-08-defeat.png`

The harness intentionally labels itself **not retail visual proof**. Its purpose is to lock the presentation/event contract before S13 wires it to private-original art. After S13 integration, repeat the same eight checkpoints against the fixed-hash private-original build and perform human visual review.

## Files intentionally not modified

- `Plan.md`
- `Backlog.md`
- `AGENTS.md`
- `docs/evidence-ledger.md`
- `web/src/main.ts`
- `web/src/scene.ts`
- `web/src/battle.ts`

This keeps S10 mergeable alongside S8/S9/S11/S12 and leaves shared-entry wiring to S13 as requested.

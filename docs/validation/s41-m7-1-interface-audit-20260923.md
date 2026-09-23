# S41 M7.1 Interface Audit — 2026-09-23

Branch: `codex/s41-m7-1-integration-acceptance`  
Scope: read-only parallel-worker interface audit.

## S37 early delta

Observed branch:

`codex/s37-m7-1-wizard-skill-fidelity`

At audit time it is **6 commits ahead** of the M7.1 baseline and has no stable PR handoff yet.

Changed files:

- `manifests/m7-wizard-seven-stage-skills.json`
- `web/src/combat/m7-battle-skills.ts`
- `web/src/content/skills/wizard-seven-stage-runtime.ts`
- `web/src/content/skills/wizard-seven-stage.ts`
- `web/tests/s32-wizard-skills.test.ts`
- `web/tests/s37-wizard-skill-fidelity.test.ts`

No S41-owned shared core file is changed by this early S37 delta.

## Useful event contract already present

S37's early `m7-battle-skills.ts` exposes wizard feedback with:

- `kind`
- `skillKey`
- `skillLevel`
- `targetId`
- `targetCell`
- optional `damageAmount`
- `eventTimeMs`
- `provenance`

Poison battle events also expose:

- target actor ID through the existing battle event target;
- `effect = POISON_INITIAL_DAMAGE | POISON_TICK`;
- `targetCell`;
- deterministic `eventTimeMs`.

This is compatible with the S41 requirement that S40 bind floating damage/status feedback to the affected actor rather than the player anchor.

## Confirmed S37 gameplay direction from the early tests

The branch tests currently lock:

- all 42 wizard skill-level states change gameplay status;
- Poison initial damage is immediate;
- follow-up Poison damage is fixed at 50% of the initial hit;
- Poison candidate cadence is 6000 ms;
- Poison can affect multiple targets from an explicit target cell;
- high-level Dark Veil grows into area accuracy denial;
- Nature Force remains battle-persistent and uses a small MP drain rather than the modern 20–70/strike interpretation.

These are worker-domain claims until the S37 PR/handoff stabilizes; S41 does not upgrade their provenance.

## Integration risk

`web/src/combat/m7-battle-skills.ts` is now a proven shared hotspot.

S36 is also expected to modify this file. S41 must not merge S37 into the integration branch before S35/S36 are stable merely because S37 is currently ahead.

When both S36 and S37 are stable:

1. compare both exact heads to the common baseline;
2. preserve S36 swordsman behavior;
3. preserve S37 wizard behavior;
4. resolve only shared types/result/event plumbing;
5. add a regression proving both class paths survive the resolution;
6. do not let presentation code recompute skill effects.

## Current decision

No integration mutation from S37 is performed during Phase 1.

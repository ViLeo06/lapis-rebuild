# S37 — M7.1 Wizard Skill Fidelity / S41 Handoff

Branch: `codex/s37-m7-1-wizard-skill-fidelity`  
Baseline: `main@6094aae3c4ff0a04af5dd4376f2b59b8b342d430`  
PR base: `codex/m7-1-gameplay-skill-integration`

## Scope

S37 owns the M7.1 wizard skill domain only. It does not modify `scene.ts`, `battle.ts`, `m4-runtime-integration.ts`, HUD ownership, progression authority, Plan, Backlog, or the evidence ledger.

The seven exposed wizard skills remain data-driven at six levels each: **42 skill-level states**.

## Delivered behavior

### 黑暗之帐 / Dark Veil

- fixed-client role remains accuracy reduction;
- six levels increase magnitude and duration;
- M7.1 rows also provide cast distance / area growth so higher levels can move from single target to area denial;
- battle consumer remains `m7EnemyAccuracyModifier(...)`.

The Lv1 identity and fixed-client fields are `VERIFIED-STATIC-ORIGINAL`. The higher-level geometry used here is `RECONSTRUCTION_POLICY` until S35 fixed-hash cross-validation supplies a stronger row-level authority.

### 毒雾 / Poison Mist

Original grid authority is unchanged:

| Skill Lv | Cast Dist | Area | Diamond cells |
| ---: | ---: | ---: | ---: |
| 1 | 4 | 1 | 5 |
| 2 | 4 | 1 | 5 |
| 3 | 5 | 2 | 13 |
| 4 | 5 | 2 | 13 |
| 5 | 6 | 2 | 13 |
| 6 | 6 | 3 | 25 |

The target center can remain empty and every legal enemy inside the area is processed independently.

M7.1 damage contract:

1. cast applies poison and immediately deals the first poison hit;
2. later DOT hits are fixed at 50% of the first hit after rounding;
3. later hits do not recursively decay;
4. M7.1 uses a 6000 ms follow-up cadence;
5. six follow-up ticks are retained as reconstruction policy and are **not** claimed to be an `EC` interpretation.

The raw `TICK=12` is original static data. Interpreting it through the existing approximately 500 ms battle cadence as approximately 6 seconds remains `RECOVERED_SECONDARY` / runtime interpretation, not recovered server truth.

Poison damage events carry:

- target actor ID;
- target grid cell;
- damage amount;
- deterministic battle event time;
- `POISON_INITIAL_DAMAGE` or `POISON_TICK` effect marker.

This is the S40/S41 anchor contract for per-monster floating damage.

### 自然力量 / Nature Force

- self buff;
- battle-persistent in M7.1 rather than displaying the secondary sentinel-like 16383.5 seconds;
- only a successful staff ordinary physical hit drains MP;
- drain remains the small historical range used by S32 (1–3 MP), never the modern secondary 20–70 MP per hit values.

Battle consumer remains `applyM7NatureForceStaffHit(...)`.

### 灰烬 / Ashes

- semantics remain **Healing Block**;
- it never becomes an action lock;
- area targeting is preserved and can grow by skill level;
- HP healing routes consume `applyM7WizardHealing(...)`.

The fixed-client explanation and 2003 historical evidence both take priority over conflicting modern “cannot act” interpretations.

### 诅咒之眼 / Curse Eye

- Petrify;
- target cannot act;
- ordinary-attack targetability follows the existing historical contract;
- duration, cast range, and area grow by level in the M7.1 reconstruction;
- already-applied poison continues while petrified.

### 失明 / Blindness

- physical hit penalty;
- magic hit penalty;
- effective range reduction;
- active status is exposed for S40 compact UI feedback.

Stage-6 numeric client ID remains unverified.

### 诅咒之剑 / Cursed Sword

- creates a timed curse window;
- the next qualifying physical attack is multiplied by 2 under the existing M7 reconstruction;
- the window is consumed by that hit or expires by time;
- active status is exposed for S40 feedback.

Stage-7 numeric client ID and ×2 retail exactness remain unverified / reconstruction policy.

## Event / feedback contract

`web/src/combat/m7-battle-skills.ts` exposes wizard feedback events for:

- `DARK_VEIL_APPLIED`
- `POISON_INITIAL_DAMAGE`
- `NATURE_FORCE_APPLIED`
- `HEALING_BLOCK_APPLIED`
- `PETRIFY_APPLIED`
- `BLIND_APPLIED`
- `CURSE_WINDOW_APPLIED`

Poison HP-loss events additionally expose `POISON_INITIAL_DAMAGE` / `POISON_TICK`, target cell, and event time.

S40 should present these effects. S41 should glue the returned event stream into shared scene/HUD presentation; S37 intentionally does not edit the shared integration files.

## Evidence boundary

At S37 implementation time, the S35 branch/output was not yet available.

Therefore:

- Lv1 IDs/names/static fields already joined by S25: `VERIFIED-STATIC-ORIGINAL`;
- documented 2003 high-level semantics: `VERIFIED-HISTORICAL`;
- user-supplied higher-rank MP rows not yet re-cross-validated by S35: `RECOVERED_SECONDARY`;
- non-poison higher-level geometry, durations, poison follow-up ratio, curse ×2 and related runtime arithmetic: `RECONSTRUCTION_POLICY`;
- retired-server formula, status resist/stacking and exact `TICK` wall-clock interpretation: `SERVER-BOUNDARY` where unresolved.

S35 should be merged before S37 during final integration. If S35 proves exact Lv2–Lv6 rows that differ from the provisional secondary values, S41 should update the S37 manifest data while preserving this runtime/effect contract.

## Conflict / merge notes

Likely shared hotspot:

- `web/src/combat/m7-battle-skills.ts`

S36 may also touch this shared combat adapter. Preserve S36 swordsman authority and S37 wizard authority separately; do not resolve by replacing either domain wholesale.

Low-conflict S37-owned files:

- `manifests/m7-wizard-seven-stage-skills.json`
- `web/src/content/skills/wizard-seven-stage.ts`
- `web/src/content/skills/wizard-seven-stage-runtime.ts`
- `web/tests/s37-wizard-skill-fidelity.test.ts`

Regression test updates are limited to wizard poison cadence/contracts.

## S41 acceptance hooks

S41 should verify after shared glue:

1. Poison cast immediately changes every in-area target HP.
2. Every later poison hit is fixed at 50% of that target's initial poison damage.
3. Poison events are rendered at each target actor, not at the player.
4. Dark Veil and Blindness materially alter enemy combat calculations.
5. Nature Force drains MP only on valid staff ordinary hits.
6. Ashes blocks healer HP recovery and does not block action.
7. Curse Eye blocks action / ordinary targeting according to the existing historical contract.
8. Cursed Sword boosts and consumes exactly one qualifying physical-hit window.
9. All seven active wizard statuses have player-readable S40 feedback.
10. All 42 skill-level rows remain testable after S35/S36/S40 integration.

# S41 — M7.1 Integration / Acceptance / Conflict Audit

Date: 2026-09-23  
Branch: `codex/s41-m7-1-integration-acceptance`  
Baseline: `main@6094aae3c4ff0a04af5dd4376f2b59b8b342d430`  
Integration target: `codex/m7-1-gameplay-skill-integration`

## Status

**PHASE 1 PREFLIGHT / ACCEPTANCE HARNESS READY / S35–S40 NOT YET INTEGRATED / NO FINAL PASS CLAIMED.**

S41 is the integration coordinator only. It does not replace S35–S40 domain implementation.

The target integration branch and the S41 worker branch were both created from the exact user-approved M7.1 baseline. Current GitHub `main` is ahead of that baseline by documentation/validation commits, but the M7.1 work remains intentionally pinned to the user-specified SHA. S41 must not merge current `main` into the worker graph.

## Phase-1 deliverables

- `web/src/integration/m7-1-acceptance-contract.ts`
- `web/tests/s41-m7-1-acceptance-contract.test.ts`
- `web/e2e/s41-m7-1-acceptance.spec.ts`
- `manifests/m7-1-integration-acceptance-contract.json`
- this integration/conflict note
- `docs/validation/s41-m7-1-playtest-checklist.md`

The final E2E suite is gated by `S41_M7_1_FINAL=1`. A normal run where these tests are skipped is **not** M7.1 acceptance evidence.

## Worker authority

| Worker | Authority | S41 rule |
| --- | --- | --- |
| S35 | skill provenance / field-level evidence | consume, do not reinterpret |
| S36 | swordsman 7×6 skill behavior | consume events/state, do not recreate numbers |
| S37 | wizard 7×6 skill behavior | consume events/state, do not recreate numbers |
| S38 | EXP / level / rewards / skill points | shared runtime calls this authority |
| S39 | training NPC / main-world UX | shared runtime provides launch glue only |
| S40 | `scene.ts`, camera, minimaps, range and presentation | shared runtime feeds presentation/events only |
| S41 | shared runtime / integration / Save glue / final acceptance | no second domain authority |

## Intake snapshot

At preflight time:

- S36 branch exists but is still identical to baseline.
- S37 branch exists but is still identical to baseline.
- S40 branch exists but is still identical to baseline.
- S35/S38/S39 branches are not yet available through the connected GitHub view.
- no stable M7.1 worker PR has been integrated.

Therefore S41 has not modified shared runtime files in Phase 1.

## Conflict map

### Critical shared-core freeze until Phase 2

Only S41 final glue may modify:

- `web/src/m4-runtime-integration.ts`
- `web/src/battle.ts`
- necessary `web/src/main.ts`
- necessary `web/src/m4-main.ts`
- `Plan.md`
- `Backlog.md`
- `docs/evidence-ledger.md`

### High-risk worker overlap to audit before merge

1. **S36 vs S37**
   - both may touch `web/src/combat/m7-battle-skills.ts`;
   - status/event contracts can collide even when class-domain data is separate;
   - integration rule: preserve S36 swordsman authority and S37 wizard authority; resolve only shared type/event wiring.

2. **S39 vs S40**
   - both can affect UI shell/types/CSS even though ownership differs;
   - S39 owns field training UX and fullscreen entry;
   - S40 owns battle HUD/range/minimap/presentation and `scene.ts`;
   - integration rule: do not let a broad UI replacement erase either worker's controls.

3. **S38 vs S41**
   - S38 owns progression/reward/Save domain;
   - S41 owns runtime reward hookup and SaveV2 integration;
   - integration rule: runtime calls S38 APIs; S41 does not duplicate EXP curves or skill-point arithmetic.

4. **S36/S37 vs S40**
   - S36/S37 produce effect events;
   - S40 consumes target actor/status events for floating text/icons;
   - integration rule: presentation cannot recalculate damage/status semantics.

5. **S39 vs S41**
   - S39 owns training manager intent and S33 registry reuse;
   - S41 owns NPC intent → production training launch glue;
   - integration rule: one launch path, no second 15-stage registry.

## Provisional merge order

Default order remains:

1. S35
2. S36
3. S37
4. S38
5. S39
6. S40
7. S41 final glue

S41 may adjust only after exact changed-file review. Any deviation must be recorded with the conflict reason and exact source SHAs.

## Required shared integration interfaces

### Skill event → presentation

S36/S37 should expose state-changing events with enough information for S40/S41 to present them without recomputation.

Minimum integration payload for target-bound damage/status events:

- event type
- source actor ID when relevant
- target actor ID
- target cell
- numeric amount when relevant
- event time / deterministic ordering key
- status identifier
- duration/expiry metadata when relevant

Poison requires an independent event per target for both initial damage and DOT.

### Progression → runtime/HUD

S38 remains authoritative for:

- current EXP
- EXP threshold
- level
- skill points
- multi-level resolution
- reward eligibility
- SaveV2 migration

S41 supplies those values to HUD/presentation and triggers reward settlement only on victory. Retreat/failure must remain 0 EXP.

### Training NPC → launch

S39 supplies one interaction intent for mouse/touch/E and one selected training battle ID from the existing S33 registry.

S41 must route that ID into the existing production battle-entry authority. It must not construct a second roster/zone registry.

### Presentation observables

Final browser acceptance requires observable state sufficient to verify, without screenshot-only guessing:

- range mode: movement / skill targeting
- camera mode: `FOLLOW_PLAYER` / `MANUAL_VIEW`
- battle minimap placement and pointer-consumption behavior
- world minimap visibility
- all living enemy markers
- target-bound floating/status events
- monster movement in-progress / destination state
- progression EXP/level/skill-point changes

Acceptance-only hooks must be webdriver-only and must not become player controls.

## Final acceptance matrix

### A. Range
- no independent Range button required for normal play;
- normal actionable state shows movement range;
- selected skill shows cast distance + AoE;
- cancel returns to movement range.

### B. Poison
- immediate initial damage;
- later fixed DOT at 50% of initial damage;
- empty center remains legal;
- multi-target damage/status;
- floating numbers bind to each target actor.

### C. Skills
- swordsman 7/7 and wizard 7/7 produce actual gameplay state change;
- all 84 skill-level states testable;
- non-damage skills must expose understandable feedback.

### D. Camera
- default `FOLLOW_PLAYER`;
- smooth delayed catch-up and edge clamp;
- minimap/manual pan enters `MANUAL_VIEW`;
- only a real player movement command restores follow;
- attack/skill alone does not restore follow.

### E. Minimap
- battle: bottom-right, player + all living enemies + viewport;
- world: top-left, player marker, real-time update;
- battle minimap pointer/touch cannot leak to movement/attack/cast.

### F. Monster movement
- no logic-coordinate teleport followed by cosmetic animation;
- `_01` movement sequence + continuous interpolation;
- destination reached before attack.

### G. Training NPC
- Settings is not the primary selector;
- world Training Manager opens exactly the existing 15-stage S33 registry;
- mouse/touch/E share one intent.

### H. Progression
- victory EXP only;
- retreat/failure 0 EXP;
- multi-level rewards supported;
- +1 skill point per level;
- Save/Load and profession isolation.

### I. HUD
- HP / MP / EXP / ATK / DEF visible in battle;
- EXP bar under HP/MP;
- UI simplification must not delete lower-level authored combat fields.

### J. Fullscreen
- field top-right direct fullscreen action uses the existing fullscreen authority.

### K. Status feedback
At minimum visible/identifiable:
- Stun
- Poison
- Petrify
- Healing Block
- Blind
- Sacrifice
- Burst
- Strong Defence
- Nature Force
- Cursed Sword

### L. Regression
Must retain:
- direct enemy click = ordinary attack
- grouped encounter
- all living enemies visible
- max-five interactive proximity cluster
- Poison empty-center targeting
- confirmed retreat
- mobile interaction
- SaveV2 migration
- Developer presets
- Recovery actions
- original battle zones
- 15 fixed training rosters

## Final test gate

Before S41 can claim completion:

1. parser/static probes required by integrated workers;
2. `npm run typecheck`;
3. `npm test`;
4. production build;
5. Chromium E2E;
6. mobile/coarse-pointer E2E;
7. `S41_M7_1_FINAL=1` acceptance with zero M7.1 skips/failures;
8. standalone build;
9. offline standalone;
10. fixed-hash private-original validation;
11. required wall-clock soak;
12. private standalone HTML with bytes + SHA-256;
13. human playability gate on that exact SHA.

Automated green does not authorize merging `main`.

## Evidence boundary

S41 preserves the user-defined evidence classes:

- `VERIFIED-STATIC-ORIGINAL`
- `VERIFIED-HISTORICAL`
- `RECOVERED_SECONDARY`
- `CONFLICTING_SECONDARY`
- `RECONSTRUCTION_POLICY`
- `SERVER-BOUNDARY`
- `UNVERIFIED`

Integration correctness is `VERIFIED-ENGINEERING` evidence only. It does not upgrade reconstruction gameplay formulas into original-server facts.

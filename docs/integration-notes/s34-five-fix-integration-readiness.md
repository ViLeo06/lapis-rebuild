# S34 Five-fix Integration Readiness / Conflict Audit

Date: 2026-09-23  
Worker: S34 Worker 5 — Integration / Acceptance / Conflict Audit  
Branch: `codex/s34e-integration-acceptance`  
Baseline: `5324354868d4a2b44103aea89d435162235db8b9`  
Target: `codex/s34-m7-integration-acceptance`

## Status

**ACCEPTANCE HARNESS READY / IMPLEMENTATION WORKERS NOT YET INTEGRATED / NO FINAL PASS CLAIMED.**

This branch does not replace Workers 1–4. It adds only an independent acceptance contract, a gated final E2E flow, this conflict audit, and a manual playtest checklist.

The four implementation Workers produced real diffs while this audit was in progress. Exact heads reviewed:

| Worker | PR | Head SHA | Baseline diff | Shared hotspots |
| --- | --- | --- | --- | --- |
| S34B poison/grid | #47 | `b798d253285d337e72510d1a2f443bfc57f9684c` | 6 commits; 5 files | `m7-battle-skills.ts`, manifest; no `scene.ts` |
| S34C encounter/direct attack | #48 | `0b9d84de6ffe4c1b392f98aa6e294697814a7714` | 1 commit; 3 files | `scene.ts`, `m7-encounter-groups.ts` |
| S34A hotkeys/HUD | #49 | `817ef6af74592ac0b4dcfde68d33c03c3e95684f` | 2 commits; 9 files | `m4-runtime-integration.ts`, HUD, `main.ts` |
| S34D camera/minimap | #50 | `460d30e36e9a08408521a7d1f46ce6407d3036ee` | 13 commits; 7 files | `scene.ts`, `viewport-controller.ts` |

All four PRs target `codex/s34-m7-integration-acceptance`. The target integration branch was still identical to the common baseline when these heads were audited. GitHub had not produced PR-triggered workflow runs/status contexts for these exact heads through the connected API, so this note treats each Worker-provided test claim as a handoff claim until the coordinator runs the integrated gate.

The merge order below is now based on the **actual changed-file sets and handoff contracts**. It still requires a quick recheck if any Worker head moves after the SHAs above.

## Acceptance matrix

### A. Input

Final integration must expose one authority for:

- `A` — basic attack;
- `S` — HP Recovery;
- `D` — MP Recovery;
- `F` — rest;
- `Q/W/E/R` — first four skills;
- `1..6` — first six skills;
- `Escape` — cancel targeting first; it must not accidentally retreat;
- `Space` — range overlay.

The modern mapping is **RECONSTRUCTION_POLICY**. Historical key evidence must not be used to claim the modern mapping is retail-exact.

### B. Mouse / touch

Normal battle state:

- ground click/tap moves;
- enemy click/tap performs immediate basic attack through the same basic-attack authority as `A`.

Skill targeting:

- hover / first tap identifies a target cell and previews affected cells;
- confirm performs the skill;
- cancel performs no MP/readiness spend;
- mobile two-step / double-tap targeting is **RECONSTRUCTION_POLICY**.

### C. Poison geometry

The final Lv1–Lv6 contract is locked as:

| Level | cast distance | AoE cells |
| ---: | ---: | ---: |
| 1 | 4 | 5 |
| 2 | 4 | 5 |
| 3 | 5 | 13 |
| 4 | 5 | 13 |
| 5 | 6 | 13 |
| 6 | 6 | 25 |

Additional hard gates:

- target center may be an empty cell;
- multiple enemies in the geometry are affected;
- geometry selection must not be approximated in `scene.ts` or the HUD; Worker 2's domain helper must be the authority.

The checked baseline currently has a conflicting reconstruction table in `manifests/m7-wizard-seven-stage-skills.json` (`1/5/9/13/17/25` area cells), and current `m7-battle-skills.ts` derives radius from `sqrt(areaCells)` around a selected enemy. Worker 5 does **not** patch either implementation before Worker 2 lands.

### D. Encounter groups

- all living enemies remain visible for the entire battle;
- a spatial interaction cluster is at most about five enemies;
- only the nearby active group acts;
- walking toward a later group can activate it;
- later groups remain rendered before activation.

The existing training battle #15 already supplies 20 enemies in four groups of five. The current baseline violates the visibility requirement because `scene.ts -> refreshRecoveredVisualVisibility()` renders only the active group.

### E. Camera

- at least one acceptance battle must be larger than the viewport;
- no automatic fit-all shrink of the battlefield;
- desktop screen-edge pan;
- mobile follow/pan;
- clamp to world bounds;
- delayed/smooth tracking.

The current baseline `scene.ts -> fit()` calls `viewport.frameRect(battleFocus)` in battle mode, while battle update disables the field follow path. These are Worker 4 hotspots, not Worker 5 implementation work.

### F. Minimap

- player marker;
- one marker for every living enemy, including inactive later groups;
- current viewport rectangle;
- click/tap changes camera only, never player position or battle movement.

Worker 4 uses a Phaser `Graphics` minimap and exposes its public model through the diagnostics snapshot (`minimap.layout`, `player`, `enemies`, `viewport`, `policy`). The focused acceptance spec consumes that existing public model and clicks/taps the minimap through its canvas layout; no extra DOM overlay is required.

### G. Battle exit regression

Existing accepted behavior remains mandatory:

`request -> confirmation -> confirm -> return scene`

Targeting `Escape` must cancel targeting before any menu/retreat behavior. Cancel must not spend MP/readiness and must not leave battle. The existing `[data-ui="battle-exit-confirm"]` and `battle-exit-*` action contracts should be preserved.

## Acceptance harness delivered

- `web/src/s34-five-fix-acceptance-contract.ts`
  - locks A–G values independently of implementation;
  - locks poison `4/4/5/5/6/6` distance and `5/5/13/13/13/25` area counts;
  - requires 100% living-enemy visibility and <=5 interactive cluster size;
  - rejects fit-all camera behavior and minimap player teleport;
  - keeps battle-exit / Escape regression explicit.
- `web/tests/s34-five-fix-acceptance-contract.test.ts`
  - deterministic pure contract tests, no timing or renderer dependency.
- `web/e2e/s34-five-fix-acceptance.spec.ts`
  - desktop end-to-end flow covering wizard -> 20-enemy battle -> direct attack/A -> later cluster -> targeting cancel -> empty-cell poison -> multi-target DOT -> S/D/F -> edge camera -> minimap camera -> confirmed exit;
  - phone touch flow covering direct attack, two-step poison targeting, minimap camera-only navigation and confirmed exit;
  - no fixed `waitForTimeout` calls;
  - requires deterministic acceptance helpers for battle time/vitals rather than sleeping on wall clock.

The E2E file is deliberately gated by `S34_FIVE_FIX_FINAL=1` until Workers 1–4 are integrated. **A skipped run is not acceptance evidence.** Final S34 closure requires running this spec with the gate enabled and zero skips/failures for these cases.

## Required final public test surfaces

To keep E2E deterministic and avoid private implementation coupling, final integration should expose these observable contracts:

- existing Worker 4 diagnostics snapshot: `minimap.layout`, `minimap.player`, `minimap.enemies[].active`, `minimap.viewport`, `minimap.policy`; the active encounter group can be derived from the active minimap marker and enemy snapshot, so Worker 5 does not require a duplicate `activeEncounterGroup` field;
- final targeting diagnostics snapshot: `targeting.active`, `targeting.previewCenter`, `targeting.previewCells`, `targeting.rangeOverlayVisible`;
- acceptance-only API: `acceptanceAdvanceBattleTimeMs(deltaMs)`;
- acceptance-only API: `acceptanceSetPlayerVitals(hp, mp)`.

The two acceptance-only APIs are test acceleration hooks. They must route through existing battle/status authority where applicable and must not exist as normal player controls. Worker 5 has not wired them into shared runtime before the implementation workers land.

## Conflict map

### Worker 1 — hotkeys / HUD vs runtime integration

Primary hotspots:

- `web/src/m4-runtime-integration.ts` keydown handler:
  - current `F` toggles fullscreen;
  - current `1..7` directly invokes skills;
  - current HP/MP Recovery keys are `H/M`;
  - current `Escape` cancels exit confirmation/dialogue then toggles menu.
- `web/src/ui/battle-hud.ts`:
  - current HP/MP labels show `H/M`;
  - current rest label shows `R`;
  - skill labels derive from current runtime index.

Integration rule:

1. one input dispatch authority only;
2. targeting cancel gets first `Escape` priority;
3. battle-exit confirmation remains second-order explicit UI state, not an `Escape` side effect;
4. fullscreen must move away from bare `F` or require a non-conflicting modifier/menu action;
5. HUD labels must be generated from the same key map used by runtime dispatch.

### Worker 2 — poison AoE / targeting geometry vs battle skill authority

Primary hotspots:

- `web/src/combat/m7-battle-skills.ts -> wizardTargets()` currently centers AoE on a selected enemy and approximates radius from `sqrt(areaCells)`;
- `useWizard()` currently takes `targetId`, not an arbitrary grid center;
- `web/src/m4-runtime-integration.ts -> useSkill()` currently forwards `scene.selectedEnemy`;
- `scene.ts` currently has enemy selection but no generic skill-target cell state.

Integration rule:

1. merge pure grid/geometry/domain helpers before scene/UI wiring;
2. Worker 2 owns exact cast-distance/AoE cell geometry;
3. battle skill authority receives a target-cell contract rather than reconstructing geometry from enemy selection;
4. MP/readiness spend occurs only on confirm, never preview/cancel;
5. DOT/status math remains in existing M7 status authority; geometry only chooses affected targets.

### Worker 3 — encounter visibility / direct attack vs `scene.ts`

Primary hotspots:

- `scene.ts -> pointerdown` currently selects an active-group enemy, but does not immediately attack;
- `scene.ts -> refreshRecoveredVisualVisibility()` currently hides every enemy outside the active group;
- `m7-encounter-groups.ts` already supplies active-group domain selection.

Integration rule:

1. visibility is independent from activity: render all living enemies;
2. active group continues to gate AI/interaction authority;
3. click/tap enemy calls the same ordinary-attack command used by `A`;
4. ground pointer falls through to movement;
5. do not fork a second encounter-group algorithm inside `scene.ts`.

### Worker 4 — battle camera / minimap vs `scene.ts`

Primary hotspots:

- `scene.ts -> setupViewport()` camera port and world bounds;
- `scene.ts -> fit()` battle `frameRect(battleFocus)` fit-all path;
- `scene.ts -> update()` field-only camera follow;
- pointer world conversion depends on current camera origin/zoom;
- Worker 3 also changes battle pointer handling in the same file.

Integration rule:

1. Worker 4 should consume the post-Worker-3 `scene.ts` head, not overwrite it;
2. remove fit-all battle framing without regressing field viewport behavior;
3. keep world clamp in `ViewportController` or a narrow battle-camera adapter;
4. minimap navigation mutates camera only;
5. all living enemy markers must use the same visibility/liveness source as Worker 3, not active-group filtering.

## Recommended merge order

Based on the exact heads above:

1. **PR #47 / Worker 2 — poison/grid domain first.** Its implementation changes the manifest, `m7-battle-skills.ts`, and adds `m7-grid-targeting.ts`, but deliberately does not touch `scene.ts`. It establishes the authoritative `useM7SkillTargeted(...targetCell...)` and exact original grid geometry before UI wiring.
2. **PR #49 / Worker 1 — hotkeys/HUD second.** It centralizes the command map and provides two explicit Scene handoffs: `setBattleRangeOverlayVisible()` and `cancelBattleTargeting()`. It does not touch `scene.ts`, so it can land before the two Scene workers with low conflict.
3. **PR #48 / Worker 3 — encounter visibility/direct attack third.** It changes `scene.ts` pointer routing and live-enemy visibility and adds a narrow `BattleSkillTargetingAdapter`. This should become the base Scene behavior for input/visibility.
4. **PR #50 / Worker 4 — camera/minimap fourth, manually porting its `scene.ts` hunks onto the post-#48 Scene.** Its branch was authored from the common baseline and still contains baseline enemy-selection / active-group rendering assumptions in overlapping `scene.ts` regions. Keep Worker 4 camera/minimap helpers and minimap-first pointer containment, but preserve Worker 3 direct-attack/targeting adapter and all-living visibility semantics.
5. **Worker 5 final acceptance last.** Wire the remaining Worker 1 + Worker 2 + Worker 3 targeting handoffs, add only deterministic acceptance hooks/public snapshot fields, enable `S34_FIVE_FIX_FINAL=1`, run regressions, and record the exact integrated SHA.

### Concrete #48 vs #50 `scene.ts` conflict resolution

The overlap is real, not theoretical:

- pointer-down: take **#50 minimap hit-test first**, then **#48 `resolveBattlePointerAction(..., isTargetingSkill())`**; do not restore #50 baseline selection-only enemy branch;
- active group: use `activeEnemyEncounterGroup(state, anchor.x, anchor.y)` consistently; do not restore the baseline no-position call;
- visibility/update: keep **#48 live-enemy visibility** for recovered actors; Worker 4 minimap already independently lists every living enemy and should consume the same invariant;
- camera: keep **#50 battle-camera/minimap fields/helpers, no-fit entry, edge pan, smooth settle, world clamp and minimap drawing**;
- pointer containment: minimap consumes the pointer before skill target / attack / move; after that, #48 owns battle enemy pointer semantics;
- snapshot: keep #50 `battleCamera` + `minimap` diagnostics and add targeting diagnostics in the final glue commit rather than creating a second minimap DOM surface.

Never resolve this conflict by accepting either entire `scene.ts` file wholesale.

## Provenance boundary

| Claim | Status for final note | Boundary |
| --- | --- | --- |
| `Magictbl.atr` has `Dist` / `Area`; fixed 19201 Lv1 row has authored `Dist=4`, `Area=1` | **VERIFIED-STATIC-ORIGINAL** | Raw authored fields only; they do not prove server formula or the new six-level reconstruction by themselves. |
| Final poison six-level grid counts supplied by the approved S34 archaeology | **must be backed by Worker 2 evidence intake before closure** | Do not relabel the baseline reconstruction manifest as retail truth. |
| fixed client contains `Dlg/SmallMap.Tdg` (SHA-256 `2c4b94b5cd135b9339afc64531a97014427a87ceb206d4bad3c2b25e748b8bee`) | **VERIFIED** | Resource presence/hash. |
| small map is an original/historical upper-left UI role | **VERIFIED-HISTORICAL** | Historical role/anchor; exact modern widget behavior is not fixed-client proof. |
| original battle map resources / grid-collision behavior used by the fixed client pipeline | **VERIFIED / VERIFIED-STATIC-ORIGINAL** | Resource/grid facts, not modern camera policy. |
| original mouse battle-command semantics | **VERIFIED-HISTORICAL** | Carry exact historical source pointer from the relevant worker handoff into final closure. |
| historical quick-slot/hotkey evidence | **VERIFIED-HISTORICAL** | Existing S20 evidence includes item `A/S/D/F` and magic `Z/X/C/V`; this does not make the modern combat mapping retail-exact. |
| historical large poison range | **VERIFIED-HISTORICAL** | Exact source pointer/value must be carried by Worker 2's handoff; do not infer it from current reconstruction numbers. |
| modern `A/S/D/F + QWER + 1..6` mapping | **RECONSTRUCTION_POLICY** | User-approved modern control scheme. |
| mobile two-step/double-tap targeting | **RECONSTRUCTION_POLICY** | Mobile usability policy. |
| minimap click/tap-to-camera | **RECONSTRUCTION_POLICY** | Camera navigation convenience; must not move actor. |
| mobile battle camera follow/pan | **RECONSTRUCTION_POLICY** | Modern mobile usability policy. |

## Final closure requirements

Before this Worker can report S34 five-fix acceptance as passed:

1. verify PR #47/#48/#49/#50 still match the audited SHAs above (or refresh this table if a head moved);
2. compare each worker against the then-current integration head immediately before merge/port;
3. resolve and document every shared-file conflict, especially `scene.ts` and `m4-runtime-integration.ts`;
4. run typecheck + all unit tests + production build;
5. run existing M7/M5.1 E2E regressions;
6. run `S34_FIVE_FIX_FINAL=1` focused E2E with desktop and phone cases enabled;
7. verify no five-fix case is skipped;
8. perform the manual checklist in `docs/validation/s34-five-fix-playtest-checklist.md`;
9. keep PR #42 / main merge gate unchanged until the user accepts the final standalone SHA.

No Plan/Backlog/evidence-ledger gate transition is made by this pre-integration branch because no implementation worker has landed and no human gate has changed.

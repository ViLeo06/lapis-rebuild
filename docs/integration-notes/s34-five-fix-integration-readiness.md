# S34 Five-fix Integration Readiness / Conflict Audit

Date: 2026-09-23  
Worker: S34 Worker 5 — Integration / Acceptance / Conflict Audit  
Branch: \`codex/s34e-integration-acceptance\`  
Baseline: \`5324354868d4a2b44103aea89d435162235db8b9\`  
Target: \`codex/s34-m7-integration-acceptance\`

## Status

**ACCEPTANCE HARNESS READY / IMPLEMENTATION WORKERS NOT YET INTEGRATED / NO FINAL PASS CLAIMED.**

This branch does not replace Workers 1–4. It adds only an independent acceptance contract, a gated final E2E flow, this conflict audit, and a manual playtest checklist.

At the time of this audit:

- Worker 1 branch \`codex/s34a-combat-input-hotkeys\` exists but compares **identical** to the common baseline: 0 commits / 0 changed files.
- Worker 2 branch \`codex/s34b-poison-grid-targeting\` is not yet present.
- Worker 3 branch \`codex/s34c-encounter-visibility-direct-attack\` exists but compares **identical** to the common baseline: 0 commits / 0 changed files.
- Worker 4 branch \`codex/s34d-battle-camera-minimap\` is not yet present.
- Target integration branch \`codex/s34-m7-integration-acceptance\` is currently identical to the common baseline.

Therefore the merge order below is a **readiness recommendation based on the real baseline hotspots**, not a fabricated review of implementation diffs. It must be rechecked against exact worker heads before integration.

## Acceptance matrix

### A. Input

Final integration must expose one authority for:

- \`A\` — basic attack;
- \`S\` — HP Recovery;
- \`D\` — MP Recovery;
- \`F\` — rest;
- \`Q/W/E/R\` — first four skills;
- \`1..6\` — first six skills;
- \`Escape\` — cancel targeting first; it must not accidentally retreat;
- \`Space\` — range overlay.

The modern mapping is **RECONSTRUCTION_POLICY**. Historical key evidence must not be used to claim the modern mapping is retail-exact.

### B. Mouse / touch

Normal battle state:

- ground click/tap moves;
- enemy click/tap performs immediate basic attack through the same basic-attack authority as \`A\`.

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
- geometry selection must not be approximated in \`scene.ts\` or the HUD; Worker 2's domain helper must be the authority.

The checked baseline currently has a conflicting reconstruction table in \`manifests/m7-wizard-seven-stage-skills.json\` (\`1/5/9/13/17/25\` area cells), and current \`m7-battle-skills.ts\` derives radius from \`sqrt(areaCells)\` around a selected enemy. Worker 5 does **not** patch either implementation before Worker 2 lands.

### D. Encounter groups

- all living enemies remain visible for the entire battle;
- a spatial interaction cluster is at most about five enemies;
- only the nearby active group acts;
- walking toward a later group can activate it;
- later groups remain rendered before activation.

The existing training battle #15 already supplies 20 enemies in four groups of five. The current baseline violates the visibility requirement because \`scene.ts -> refreshRecoveredVisualVisibility()\` renders only the active group.

### E. Camera

- at least one acceptance battle must be larger than the viewport;
- no automatic fit-all shrink of the battlefield;
- desktop screen-edge pan;
- mobile follow/pan;
- clamp to world bounds;
- delayed/smooth tracking.

The current baseline \`scene.ts -> fit()\` calls \`viewport.frameRect(battleFocus)\` in battle mode, while battle update disables the field follow path. These are Worker 4 hotspots, not Worker 5 implementation work.

### F. Minimap

- player marker;
- one marker for every living enemy, including inactive later groups;
- current viewport rectangle;
- click/tap changes camera only, never player position or battle movement.

Final E2E uses \`[data-ui="battle-minimap"]\` as the stable DOM contract. If Worker 4 chooses a different internal renderer, retain this public test surface or adapt the final acceptance spec in the integration commit.

### G. Battle exit regression

Existing accepted behavior remains mandatory:

\`request -> confirmation -> confirm -> return scene\`

Targeting \`Escape\` must cancel targeting before any menu/retreat behavior. Cancel must not spend MP/readiness and must not leave battle. The existing \`[data-ui="battle-exit-confirm"]\` and \`battle-exit-*\` action contracts should be preserved.

## Acceptance harness delivered

- \`web/src/s34-five-fix-acceptance-contract.ts\`
  - locks A–G values independently of implementation;
  - locks poison \`4/4/5/5/6/6\` distance and \`5/5/13/13/13/25\` area counts;
  - requires 100% living-enemy visibility and <=5 interactive cluster size;
  - rejects fit-all camera behavior and minimap player teleport;
  - keeps battle-exit / Escape regression explicit.
- \`web/tests/s34-five-fix-acceptance-contract.test.ts\`
  - deterministic pure contract tests, no timing or renderer dependency.
- \`web/e2e/s34-five-fix-acceptance.spec.ts\`
  - desktop end-to-end flow covering wizard -> 20-enemy battle -> direct attack/A -> later cluster -> targeting cancel -> empty-cell poison -> multi-target DOT -> S/D/F -> edge camera -> minimap camera -> confirmed exit;
  - phone touch flow covering direct attack, two-step poison targeting, minimap camera-only navigation and confirmed exit;
  - no fixed \`waitForTimeout\` calls;
  - requires deterministic acceptance helpers for battle time/vitals rather than sleeping on wall clock.

The E2E file is deliberately gated by \`S34_FIVE_FIX_FINAL=1\` until Workers 1–4 are integrated. **A skipped run is not acceptance evidence.** Final S34 closure requires running this spec with the gate enabled and zero skips/failures for these cases.

## Required final public test surfaces

To keep E2E deterministic and avoid private implementation coupling, final integration should expose these observable contracts:

- diagnostics snapshot: \`activeEncounterGroup\`;
- diagnostics snapshot: \`targeting.active\`, \`targeting.previewCenter\`, \`targeting.previewCells\`, \`targeting.rangeOverlayVisible\`;
- DOM: \`[data-ui="battle-minimap"]\`;
- acceptance-only API: \`acceptanceAdvanceBattleTimeMs(deltaMs)\`;
- acceptance-only API: \`acceptanceSetPlayerVitals(hp, mp)\`.

The two acceptance-only APIs are test acceleration hooks. They must route through existing battle/status authority where applicable and must not exist as normal player controls. Worker 5 has not wired them into shared runtime before the implementation workers land.

## Conflict map

### Worker 1 — hotkeys / HUD vs runtime integration

Primary hotspots:

- \`web/src/m4-runtime-integration.ts\` keydown handler:
  - current \`F\` toggles fullscreen;
  - current \`1..7\` directly invokes skills;
  - current HP/MP Recovery keys are \`H/M\`;
  - current \`Escape\` cancels exit confirmation/dialogue then toggles menu.
- \`web/src/ui/battle-hud.ts\`:
  - current HP/MP labels show \`H/M\`;
  - current rest label shows \`R\`;
  - skill labels derive from current runtime index.

Integration rule:

1. one input dispatch authority only;
2. targeting cancel gets first \`Escape\` priority;
3. battle-exit confirmation remains second-order explicit UI state, not an \`Escape\` side effect;
4. fullscreen must move away from bare \`F\` or require a non-conflicting modifier/menu action;
5. HUD labels must be generated from the same key map used by runtime dispatch.

### Worker 2 — poison AoE / targeting geometry vs battle skill authority

Primary hotspots:

- \`web/src/combat/m7-battle-skills.ts -> wizardTargets()\` currently centers AoE on a selected enemy and approximates radius from \`sqrt(areaCells)\`;
- \`useWizard()\` currently takes \`targetId\`, not an arbitrary grid center;
- \`web/src/m4-runtime-integration.ts -> useSkill()\` currently forwards \`scene.selectedEnemy\`;
- \`scene.ts\` currently has enemy selection but no generic skill-target cell state.

Integration rule:

1. merge pure grid/geometry/domain helpers before scene/UI wiring;
2. Worker 2 owns exact cast-distance/AoE cell geometry;
3. battle skill authority receives a target-cell contract rather than reconstructing geometry from enemy selection;
4. MP/readiness spend occurs only on confirm, never preview/cancel;
5. DOT/status math remains in existing M7 status authority; geometry only chooses affected targets.

### Worker 3 — encounter visibility / direct attack vs \`scene.ts\`

Primary hotspots:

- \`scene.ts -> pointerdown\` currently selects an active-group enemy, but does not immediately attack;
- \`scene.ts -> refreshRecoveredVisualVisibility()\` currently hides every enemy outside the active group;
- \`m7-encounter-groups.ts\` already supplies active-group domain selection.

Integration rule:

1. visibility is independent from activity: render all living enemies;
2. active group continues to gate AI/interaction authority;
3. click/tap enemy calls the same ordinary-attack command used by \`A\`;
4. ground pointer falls through to movement;
5. do not fork a second encounter-group algorithm inside \`scene.ts\`.

### Worker 4 — battle camera / minimap vs \`scene.ts\`

Primary hotspots:

- \`scene.ts -> setupViewport()\` camera port and world bounds;
- \`scene.ts -> fit()\` battle \`frameRect(battleFocus)\` fit-all path;
- \`scene.ts -> update()\` field-only camera follow;
- pointer world conversion depends on current camera origin/zoom;
- Worker 3 also changes battle pointer handling in the same file.

Integration rule:

1. Worker 4 should consume the post-Worker-3 \`scene.ts\` head, not overwrite it;
2. remove fit-all battle framing without regressing field viewport behavior;
3. keep world clamp in \`ViewportController\` or a narrow battle-camera adapter;
4. minimap navigation mutates camera only;
5. all living enemy markers must use the same visibility/liveness source as Worker 3, not active-group filtering.

## Recommended merge order

Because no Worker 1–4 implementation diff exists yet, this is provisional and must be re-audited against exact heads:

1. **Worker 2 domain/geometry first** — if its diff is mostly pure combat/grid authority, it establishes the target-cell and poison contract with the lowest scene conflict.
2. **Worker 1 hotkeys/HUD** — establish one command map before pointer/camera wiring; resolve \`F\`, \`Escape\`, \`H/M\`, and skill labels.
3. **Worker 3 encounter visibility/direct attack** — apply the battle pointer and visibility semantics to \`scene.ts\`.
4. **Worker 4 camera/minimap** — rebase/port onto Worker 3's final \`scene.ts\`; preserve its pointer/visibility changes while replacing battle camera behavior and adding minimap.
5. **Worker 5 final acceptance** — re-enable \`S34_FIVE_FIX_FINAL=1\`, adapt only public test surfaces if needed, add deterministic hooks, run full regression, and write final exact-head audit.

If actual diffs show Worker 2 or Worker 1 modifying \`scene.ts\`, reorder by dependency rather than by worker number. Never resolve a conflict by restoring baseline hunks over an already accepted worker behavior.

## Provenance boundary

| Claim | Status for final note | Boundary |
| --- | --- | --- |
| \`Magictbl.atr\` has \`Dist\` / \`Area\`; fixed 19201 Lv1 row has authored \`Dist=4\`, \`Area=1\` | **VERIFIED-STATIC-ORIGINAL** | Raw authored fields only; they do not prove server formula or the new six-level reconstruction by themselves. |
| Final poison six-level grid counts supplied by the approved S34 archaeology | **must be backed by Worker 2 evidence intake before closure** | Do not relabel the baseline reconstruction manifest as retail truth. |
| fixed client contains \`Dlg/SmallMap.Tdg\` (SHA-256 \`2c4b94b5cd135b9339afc64531a97014427a87ceb206d4bad3c2b25e748b8bee\`) | **VERIFIED** | Resource presence/hash. |
| small map is an original/historical upper-left UI role | **VERIFIED-HISTORICAL** | Historical role/anchor; exact modern widget behavior is not fixed-client proof. |
| original battle map resources / grid-collision behavior used by the fixed client pipeline | **VERIFIED / VERIFIED-STATIC-ORIGINAL** | Resource/grid facts, not modern camera policy. |
| original mouse battle-command semantics | **VERIFIED-HISTORICAL** | Carry exact historical source pointer from the relevant worker handoff into final closure. |
| historical quick-slot/hotkey evidence | **VERIFIED-HISTORICAL** | Existing S20 evidence includes item \`A/S/D/F\` and magic \`Z/X/C/V\`; this does not make the modern combat mapping retail-exact. |
| historical large poison range | **VERIFIED-HISTORICAL** | Exact source pointer/value must be carried by Worker 2's handoff; do not infer it from current reconstruction numbers. |
| modern \`A/S/D/F + QWER + 1..6\` mapping | **RECONSTRUCTION_POLICY** | User-approved modern control scheme. |
| mobile two-step/double-tap targeting | **RECONSTRUCTION_POLICY** | Mobile usability policy. |
| minimap click/tap-to-camera | **RECONSTRUCTION_POLICY** | Camera navigation convenience; must not move actor. |
| mobile battle camera follow/pan | **RECONSTRUCTION_POLICY** | Modern mobile usability policy. |

## Final closure requirements

Before this Worker can report S34 five-fix acceptance as passed:

1. record exact Worker 1–4 branch heads and PRs;
2. compare each worker against the common baseline and against the then-current integration head;
3. resolve and document every shared-file conflict, especially \`scene.ts\` and \`m4-runtime-integration.ts\`;
4. run typecheck + all unit tests + production build;
5. run existing M7/M5.1 E2E regressions;
6. run \`S34_FIVE_FIX_FINAL=1\` focused E2E with desktop and phone cases enabled;
7. verify no five-fix case is skipped;
8. perform the manual checklist in \`docs/validation/s34-five-fix-playtest-checklist.md\`;
9. keep PR #42 / main merge gate unchanged until the user accepts the final standalone SHA.

No Plan/Backlog/evidence-ledger gate transition is made by this pre-integration branch because no implementation worker has landed and no human gate has changed.

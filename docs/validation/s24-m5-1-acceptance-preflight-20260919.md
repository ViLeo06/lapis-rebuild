# S24 M5.1 Player-input Acceptance — preflight

Date: 2026-09-19  
Branch: `codex/s24-m5-1-acceptance`  
Plan baseline: `57ff22363156bec7aad3acb7555208533485d193`

## Scope

S24 is the M5.1 acceptance/integration line. During the parallel phase it owns acceptance E2E, screenshot gates and validation documentation. Shared runtime glue is intentionally deferred until S20–S23 have produced integration-ready heads.

Frozen in this preflight:

- `Plan.md`
- `Backlog.md`
- `docs/evidence-ledger.md`
- `web/src/main.ts`
- `web/src/battle.ts`
- production HUD/runtime files owned by S21–S23

## Post-integration status

This file began as the S24 preflight record. The integration has since advanced beyond the dependency states described below.

Current integrated state on 2026-09-19:

- S20 final delivered head: `a457cf5cbc06b6a6b4a0b1580e8527b331aec047`;
- S21 final note/head: `a30f0e388cc1ed778e32336a4c7568951b69643b`, with S20 relationship corrections applied by S24;
- S22 pointer head: `e3dc2483dae22be466a56cc275b8fb419ee4dd60`;
- S23 dialogue/quest head: `994ea9146e73ff258bd8b4dbf19a54727f494caa`;
- S24 real-input gate no longer carries the old pointer `fixme`; pointer hover/click is a hard assertion;
- NPC activation now opens the explicit S23 dialogue session and leaves the quest unchanged until the player clicks Accept / Turn in;
- the hidden `#battle-pause` shortcut was removed from S24 target selection;
- S20 edge-chrome relationships are now enforced: top strip, upper-left small map, lower-left player status, bottom-center deck, lower-right quick slots, bottom-docked portrait dialogue, lower-left battle commands and compact right-side battle status.

Local non-private validation after the S20 correction is recorded in `docs/integration-notes/s24-m5-1-acceptance.md`. GitHub-hosted runs after approximately 02:50 UTC are blocked before checkout with `runner_id=0` and no step/log payload, so this preflight file must not be read as a final green CI record.

## Baseline audit

At the initial preflight read, S20–S24 branches all pointed at the same plan commit. During the S24 preflight, read-only synchronization then observed upstream work beginning without integrating it prematurely:

- S20 remained at the plan baseline;
- S21 advanced to `85d6f9141716ab860042188f69af208a0308f9a6`;
- S22 advanced to `e3dc2483dae22be466a56cc275b8fb419ee4dd60` and opened PR #32;
- S23 advanced to `8d62b2e2b979928e66b0d5b665e1bce11ab66096` and opened PR #33.

Those heads are dependency observations only. S24 does not treat them as integrated until their own validation/PR closure and the M5.1 coordination point.

The existing M5 private-original acceptance proves the broad quest/battle loop, but it does **not** prove the user-reported P0 interaction requirement:

- quest accept uses `page.keyboard.press('e')`;
- quest turn-in uses `page.keyboard.press('e')`;
- button helpers in the older flow use DOM `.click()` from `page.evaluate()`;
- current `scene.ts` field `pointerdown` selects battle enemies and otherwise falls through to `moveTo(...)`;
- current world visual actors are presentation objects only, without an NPC pointer target.

Therefore the old M5 green result cannot close M5.1.

## S24 gates prepared here

`web/e2e/s24-m5-1-acceptance.spec.ts` adds three gates.

### 1. Desktop HUD preflight

Runs at:

- 1366×768
- 1920×1080

It records player/map/quest/menu geometry, asserts no horizontal overflow or region escape, verifies the formal HUD has no Developer diagnostics by default, and captures screenshots.

This is deliberately a structural preflight. S21 owns the final original-structure geometry. Once S21 is integrated, S24 must tighten the geometry assertions against the actual S20/S21 region contract instead of inventing selectors or retail dimensions in advance.

### 2. Standalone/offline preflight

When `LAPIS_OFFLINE_PREVIEW` is supplied, the player shell must start from the packaged single HTML with:

- M4/M5 player runtime active;
- formal field HUD visible;
- Developer diagnostics absent;
- zero external HTTP(S) requests.

### 3. Final real-input player flow

The final gate is written around actual Playwright input:

`pointer NPC -> visible S23 dialogue (no quest mutation) -> click Accept -> pointer movement -> spatial door -> visible monsters -> battle -> return -> pointer NPC -> click Turn in`

Additional requirements:

- zoom/fullscreen use real keyboard events;
- menu/actions use Playwright `locator.click()`, not DOM `.click()` injected through `page.evaluate()`;
- NPC interaction uses a real mouse click against the S22 live rendered pointer bounds;
- NPC click must leave field movement route empty, proving no click-through;
- the first pointer activation must leave the quest at `not_started` and render an S23 dialogue session;
- quest accept must come from a real click on `[data-dialogue-choice="accept-quest"]`;
- final turn-in must come from a second NPC pointer activation plus a real click on `[data-dialogue-choice="turn-in-quest"]`;
- the S23 compatibility `interact(...)` auto-accept/auto-turn-in path cannot satisfy S24;
- diagnostics remain opt-in/off for the complete player flow;
- diagnostics/snapshots may be read for assertions and coordinate observation, but are never used to mutate/advance gameplay.

The final pointer case currently marks itself `fixme` only when the visible NPC does not expose the S22-required pointer cursor. This is an explicit upstream dependency, not a passing acceptance. Once S22 is on the integration head, that condition must be false and the entire flow must execute. After S23 is integrated, the test deliberately fails unless pointer activation opens an explicit dialogue and the user must choose Accept / Turn in; an auto-advancing compatibility path is not accepted.

## Required post-S20–S23 integration pass

Before S24 can be declared complete:

1. sync the accepted S20–S23 results into the S24 integration head;
2. read their integration notes and adapt only the acceptance selectors/contracts that they actually expose;
3. tighten HUD geometry assertions from S20/S21 evidence;
4. verify the S24 pointer case runs rather than being fixme/skipped on the fixed-hash private pack;
5. run TypeScript typecheck, unit tests and production build;
6. run Chromium E2E at both required desktop viewports;
7. build the fixed-hash 2.2 private standalone HTML and rerun the player flow offline;
8. run the required real wall-clock soak;
9. record final HTML bytes/SHA-256, workflow run/artifact IDs and screenshots;
10. place final before/after/acceptance screenshots in private Drive `lapis-rebuild-assets/40_previews/`;
11. open the S24 PR without merging main.

## Final acceptance interpretation

A green S24 engineering gate proves the player-facing reconstruction path works with real browser input and the required private fixed-hash asset pipeline. It does not upgrade reconstruction NPC identity, training-house binding, old-server quest logic, combat balance or UI alpha values to retail VERIFIED facts.

The M5 Playability Gate still requires the user's final hands-on playtest.

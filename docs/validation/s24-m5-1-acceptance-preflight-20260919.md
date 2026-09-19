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

## Baseline audit

At the plan baseline, S20–S24 branches all point at the same plan commit. No S20–S23 implementation commit or PR is available yet.

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

`pointer NPC -> visible dialogue/quest accept -> pointer movement -> spatial door -> visible monsters -> battle -> return -> pointer NPC turn-in`

Additional requirements:

- zoom/fullscreen use real keyboard events;
- menu/actions use Playwright `locator.click()`, not DOM `.click()` injected through `page.evaluate()`;
- NPC interaction uses a real mouse click against the visible guide location;
- NPC click must leave field movement route empty, proving no click-through;
- diagnostics remain opt-in/off for the complete player flow;
- diagnostics/snapshots may be read for assertions and coordinate observation, but are never used to mutate/advance gameplay.

The final pointer case currently marks itself `fixme` only when the visible NPC does not expose the S22-required pointer cursor. This is an explicit upstream dependency, not a passing acceptance. Once S22 is on the integration head, that condition must be false and the entire flow must execute.

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

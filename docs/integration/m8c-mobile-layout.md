# M8.0 Worker 3 — Mobile-first Layout Foundation

STATUS: PARTIAL

Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`
Branch: `codex/m8c-mobile-layout`
Current code HEAD: `b735bf605e0b5bcc126226f80bcb592bc1910022`

## Scope

Establish the mobile-first layout foundation without rewriting HUD/gameplay/camera algorithms and without changing `web/src/main.ts`, `web/src/scene.ts`, or `web/src/battle.ts`.

## Completed

- Added `web/src/view/mobile-layout.ts` to expose visual-viewport width/height, offsets, device pixel ratio, portrait/landscape state, and narrow/compact/wide layout state.
- Installed the observer from `web/src/m4-main.ts` without touching the frozen `web/src/main.ts`.
- Added `viewport-fit=cover` and `interactive-widget=resizes-content` to the normal multi-file Web entry.
- Added safe-area / dynamic-viewport CSS variables and safe anchoring for field, battle, dialogue, inventory, diagnostics, and coarse-touch primary controls.
- Added unit coverage for desktop, Android portrait, narrow phone, landscape, visual viewport overrides, and CSS state application.
- Added Playwright layout coverage for desktop, Android portrait, narrow portrait, iPhone-style landscape safe areas, 44px coarse-touch controls, and runtime orientation/resize changes.
- First full CI on `94a726bdffc399d6b1066e72b647ec9363bae6a2` proved Worker 3 layout tests 6/6 PASS but exposed one legacy S34 mobile minimap failure.
- Root cause was traced to the appended M8 `.battle-player` bottom anchor overriding the later S40 narrow-portrait `bottom:auto`, stretching the panel over the minimap touch surface.
- Fixed the narrow battle-player rule in `e471ceb26f0b5ab85b84119f8b6ab082176a31fc` and added a regression fixture in `b735bf605e0b5bcc126226f80bcb592bc1910022`.

## In progress

- Full Web CI is running on fixed code head `b735bf605e0b5bcc126226f80bcb592bc1910022` for both push and PR events.
- Parser/synthetic setup and locked dependencies + typecheck + unit tests + production build are already PASS on the fixed head.
- The exact CI-produced standalone artifact was rechecked at 412x915 with touch: `.battle-player` is 190x92, the minimap test point resolves to `CANVAS`, and touch changes camera x from about 683 to 979 with `MANUAL_VIEW` mode.
- Chromium integration/offline suite is still running.

## Remaining

- Confirm the fixed-head Chromium integration/offline suite is green.
- If green, mark this note `STATUS: DONE`, record final CI totals and final branch HEAD, and leave PR #72 open for main-session integration.
- Do not merge `main`.

## Files changed

- `web/src/view/mobile-layout.ts`
- `web/src/m4-main.ts`
- `web/index.html`
- `web/src/ui/game-shell.css`
- `web/src/m4-runtime.css`
- `web/tests/mobile-layout.test.ts`
- `web/e2e/m8-mobile-layout.spec.ts`
- `docs/integration/m8c-mobile-layout.md`

## Tests

- First code-head CI parser/synthetic pack: PASS.
- First code-head CI typecheck + unit tests + production build: PASS.
- First code-head Worker 3 M8 Playwright: 6/6 PASS.
- First code-head full Chromium suite: 91 passed / 9 skipped / 1 failed; the sole failure was the M8-introduced narrow battle-player overlay regression described above.
- Fixed-head `b735bf605e0b5bcc126226f80bcb592bc1910022`: parser/synthetic PASS; typecheck + unit tests + production build PASS.
- Fixed-head full Chromium suite: IN PROGRESS.
- FULL E2E: IN PROGRESS.

## Known limitations

- This is a layout/safe-area foundation, not a full HUD redesign.
- Safe-area insets are currently consumed by DOM/CSS anchoring; no shared `scene.ts` camera/battle algorithm was changed.
- Private/original game assets were not added or published.

## Required integration hook

- Preserve the `installMobileLayout()` startup hook in `web/src/m4-main.ts`.
- Main-session integration should reconcile any concurrent Worker 2 changes to Web/PWA entry markup and any Worker 6 changes to platform E2E without duplicating either worker's implementation.

## Potential conflicts

- Confirmed Worker 2 also changes `web/index.html` and `web/src/m4-main.ts`. Main-session resolution must preserve Worker 2's manifest/PWA registration plus Worker 3's `interactive-widget=resizes-content` viewport metadata and `installMobileLayout()` startup hook.
- Worker 6 may add overlapping mobile/platform Playwright coverage.
- No changes were made to `web/src/main.ts`, `web/src/scene.ts`, `web/src/battle.ts`, `Plan.md`, `Backlog.md`, or `AGENTS.md`.

## Next exact step

Wait for the fixed-head Chromium integration/offline jobs to finish. If green, finalize this note as DONE, record the CI totals, and close Worker 3 without further product-scope changes. If the suite fails, inspect the concrete final-head failure before changing code.

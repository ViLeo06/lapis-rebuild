# M8.0 Worker 3 — Mobile-first Layout Foundation

STATUS: ACTIVE

Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`
Branch: `codex/m8c-mobile-layout`
Current HEAD: `e1ed76ea34034865a678a65e67782575db4e1c3b`

## Scope

Establish the mobile-first layout foundation without rewriting HUD/gameplay/camera algorithms and without changing `web/src/main.ts`, `web/src/scene.ts`, or `web/src/battle.ts`.

## Completed

- Confirmed fixed M8.0 base exists and matches current `main`.
- Created the dedicated Worker 3 branch from the fixed base.
- Reviewed current Phaser resize path, S15 viewport/camera contract, S24 touch contract, S40 camera/presentation note, HUD CSS, and Playwright mobile coverage.
- Identified remaining gaps: safe-area insets, dynamic visual viewport height, explicit orientation/layout state, and safe mobile anchoring.

## In progress

- Add viewport/safe-area foundation and minimal runtime wiring outside the frozen shared core files.
- Add targeted unit and Playwright coverage for desktop, Android/narrow phone, portrait, and landscape.

## Remaining

- Implement and validate the layout foundation.
- Run targeted tests and type checks/build where available.
- Record final changed files, tests, limitations, and integration hook.
- Open PR against `main` without merging.

## Tests

- Not run yet.

## Next exact step

Implement a small mobile-layout observer plus CSS/meta viewport changes, then add targeted tests.

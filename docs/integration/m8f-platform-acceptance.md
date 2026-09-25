# M8.0 Worker 6 — Platform Acceptance Harness

STATUS: ACTIVE

- Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`
- Branch: `codex/m8f-platform-acceptance`
- Current HEAD: `e1ed76ea34034865a678a65e67782575db4e1c3b`

## Scope

- Production `dist` desktop smoke.
- Multi-file Vite production build contract.
- Mobile landscape width/touch smoke.
- Mobile portrait boot plus rotate-back smoke.
- Reusable platform acceptance helpers.
- Offline/PWA integration contract only; Service Worker implementation remains Worker 2 scope.

## Completed

- Added `web/e2e/m8-platform-acceptance.spec.ts`.
- Added `web/e2e/helpers/platform-acceptance.ts`.
- Added fast/full platform npm entry points.
- Local production build completed.
- Local platform run: 4 passed, 1 skipped.
- PWA status: `NOT YET INTEGRATED`.

## Remaining

- Verify npm entry points enumerate the expected suite.
- Re-run targeted production platform suite.
- Remove local-only Playwright Edge config.
- Commit/push branch and create PR.
- Update this note to `STATUS: DONE`.

## Tests

- `npm run build`: PASS.
- Platform Playwright via local Edge executable: 4 PASS / 1 SKIP.
- Full existing E2E: NOT RUN.

## Next exact step

Run entry-point checks, clean local-only files, commit checkpoint, then final verification.

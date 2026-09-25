# M8.0 Worker 6 — Platform Acceptance Harness

STATUS: DONE

- Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`
- Branch: `codex/m8f-platform-acceptance`
- Head SHA: branch HEAD (implementation checkpoint `e4c91a5d048141633724f3b7bba4de452251730e`; this note is finalized by the closing commit)

## Scope

- Production `dist` desktop smoke.
- Multi-file Vite production build contract.
- Mobile landscape width/touch smoke.
- Mobile portrait boot plus rotate-back smoke.
- Reusable platform acceptance helpers.
- Offline/PWA integration contract only; Service Worker implementation remains Worker 2 scope.

## Files changed

- `web/e2e/m8-platform-acceptance.spec.ts`
- `web/e2e/helpers/platform-acceptance.ts`
- `web/package.json`
- `docs/integration/m8f-platform-acceptance.md`

## Tests run

- `npm run build`
- `npm run test:platform:smoke -- --list`
- `npm run test:platform -- --list`
- Platform Playwright against production preview with local Edge executable.

## Results

- Build: PASS.
- Desktop production smoke: PASS.
- Multi-file production build: PASS.
- Mobile landscape + touch: PASS.
- Mobile portrait + rotate-back: PASS.
- Offline/PWA contract: SKIPPED — `NOT YET INTEGRATED`.
- Full existing E2E: NOT RUN.

## Known limitations

- Worker 2 PWA/Service Worker work was intentionally not copied into this branch.
- The offline test activates only when `M8_PWA_INTEGRATED=1`; until integration it is an explicit skip, not acceptance evidence.
- Existing build warnings about mixed JSON import attributes and the large main chunk remain outside Worker 6 scope.

## Required integration hook

- After Worker 2 is integrated, run `M8_PWA_INTEGRATED=1 npm run test:platform` with Playwright Chromium installed.
- After Worker 3 integration, re-run the mobile suites against the combined branch; the current harness already supplies portrait/landscape/touch assertions.

## Potential conflicts

- `web/package.json` may also be touched by Worker 2 if it adds PWA tooling; resolve by retaining both workers' scripts/dependencies.
- No changes were made to `scene.ts`, `battle.ts`, `main.ts`, `Plan.md`, `Backlog.md`, or `AGENTS.md`.

## Next step

Main Session should integrate Workers 1–5, re-run `npm run build`, then run the full platform suite and enable the PWA gate after Worker 2 wiring.

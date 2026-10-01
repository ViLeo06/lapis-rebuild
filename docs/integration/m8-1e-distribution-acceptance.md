# M8.1 Worker 5 — Distribution Acceptance / E2E / Real-device Gate

> Worker: 5  
> Branch: `codex/m8-1e-distribution-acceptance`  
> Baseline: `51907f41365edb4be393579f3814d8e23116dd6e`  
> PR base: `codex/m8-1-distribution-playtest-integration`

## Scope

Worker 5 owns acceptance fixtures, E2E/validation coverage, final acceptance evidence, and the Android human-playtest checklist. It does **not** replace Worker 1–4 production implementations.

## M8.1 closeout engineering audit — 2026-10-01

Worker 3 re-opened Engineering Acceptance against the current integration truth rather than the historical green snapshot recorded below.

- Integration branch: `codex/m8-1-distribution-playtest-integration`
- Audited HEAD: `cd1ce8d136d37357ce06720f9e0f7bc75c4c807c`
- PR #77: open, Draft, base `main`, head `codex/m8-1-distribution-playtest-integration`; no main merge is authorized by this Worker.
- Full Pack contract run `36326945111`: PASS.
- Pages release gate run `36326945088`: PASS.
- M8E Cloudflare Pages static smoke run `36326945151`: PASS.
- Web and parser validation run `36326945153`: FAIL in Chromium integration/offline tests with **103 passed / 11 skipped / 4 failed**.
- Parser tests, locked dependencies, repository typecheck, unit tests, production build, standalone synthetic preview, and private-pack-builder publication steps all passed before the Chromium failure.
- Current four failures are:
  1. `e2e/lab.spec.ts` — `offline HTML opens without external requests`.
  2. `e2e/m8-1-distribution-runtime.spec.ts` — Pages preview without public content closes/loses the local Full Pack import surface.
  3. `e2e/s14-m4-manual-acceptance.spec.ts` — swordsman playable quest path reaches `lost` instead of remaining `active`.
  4. `e2e/s33-training-recovery-debug.spec.ts` — a mobile control touch target resolves to height `0` instead of at least `44px`.

Ownership / dependency routing:

- Worker 1 owns the Distribution Runtime failure. PR #83 (`codex/m8-1f-first-run-import-regression`) is open against the integration branch at `be787a6754ae993ea3d717a861878041d9e8da95`. Its one-file change narrows synthetic auto-boot so explicit preview/production metadata with `content:null` keeps the local Full Pack import gate open. Worker 3 does not copy or rewrite this product fix.
- Worker 2 owns the legacy/offline/S14/S33 failures. At this audit point, `codex/m8-1g-legacy-e2e-regression` has not yet produced a GitHub commit/PR, so Worker 3 records the dependency rather than entering that scope.
- Worker 3 branch `codex/m8-1h-ci-acceptance-closeout` was created from the audited integration HEAD. Until W1/W2 fixes are integrated and the full repository gate is rerun on the resulting Integration HEAD, the authoritative status is:

`ENGINEERING_GATE: FAIL`

Closeout dependency/evidence update after the initial audit:

- Worker 1 PR #83 remains open at `be787a6754ae993ea3d717a861878041d9e8da95`; its Pages-preview fix passes the focused M8.1 acceptance workflow, but Worker 3 additionally handed back the standalone `file://` regression because the current condition does not explicitly cover the embedded `window.__LAPIS_PACK__` path.
- Worker 2 PR #86 is now open at `0aef511efd4ace9490395381123c8deb9c41bc4c`. It classifies S14 and S33 as test-harness/timing regressions and keeps the real product requirements intact; it explicitly routes the offline standalone failure to Worker 1.
- Worker 3 PR #84 head `6d695ac7426ee3718ec5f6f87d62b535f3bb4d72` passed M8.1 Worker 5 validation run `36819058779`: locked install/typecheck/unit/production build PASS, platform smoke **2/2 PASS**, distribution black-box **3 PASS / 1 authorization-gated Pages test skipped**. This proves the acceptance harness is healthy, not the complete repository gate.
- A rerun of Web/parser run `36326945153` on unchanged integration HEAD has again passed parser/typecheck/unit/build/standalone-build stages and is rerunning the Chromium stage. Because it does not contain W1/W2 fixes, it is diagnostic evidence only.

A dedicated green Full Pack/Pages/static-smoke result is not sufficient to override a failed repository-wide Web and parser validation run. Final PASS requires a new complete run on the latest Integration HEAD with the closeout regressions resolved without skip/meaningless assertion relaxation.

## Current dependency snapshot

At Worker 5 start, all four dependency branches existed but were still identical to the baseline:

- `codex/m8-1a-full-pack-contract`: 0 commits ahead.
- `codex/m8-1b-incremental-asset-store`: 0 commits ahead.
- `codex/m8-1c-install-update-ux`: 0 commits ahead.
- `codex/m8-1d-pages-release`: 0 commits ahead.

Therefore Pack / AssetStore / Update / Distribution UI / Release behavior is **not allowed to be reported PASS yet**.

## Live dependency update — 2026-09-27

Main Integration re-checked GitHub after the ordered W1→W4 integration:

- Worker 1 PR #82 merged into `codex/m8-1-distribution-playtest-integration` at `a3449c728c0e0e781adb41186a7b13dcc6cf2644`.
- Worker 2 PR #79 merged at `b71dec19875abdb5e8ab011f21567fa463208fa8`.
- Worker 3 PR #80 merged at `ed23f75416ec864b0eeccba6bbe03c6d66df7058`.
- Worker 4 PR #81 merged at `df6556580bbec8bb986fdfc3e7f10838c6505c8a`.
- Current integration head observed by Main Integration: `73782a8caafce8f2bd1e7360ec41e6171d8b5e06`.
- M8.1 Full Pack and Pages release contract workflows on the integration head are green; the repository-wide Web/Chromium regression is still running and must finish before Engineering Acceptance can be called PASS.
- Real Cloudflare Pages creation/connection/public deployment/DNS/private-original publication remain `AWAITING_RELEASE_AUTHORIZATION`.

Worker 5 PR #78 remains Draft while its acceptance workflow is re-evaluated against the now-integrated W1–W4 tree. This documentation update intentionally triggers that pull-request validation; skipped dependency checks are not converted to PASS.

Additional Worker 5 evidence assets:

- `web/tests/m8-1-distribution-chain-acceptance.test.ts`
  - V1→V2 asserts 95 unchanged / 3 changed / 2 new and exactly 5 fetches;
  - network failure keeps V1 installed;
  - SHA mismatch keeps V1 installed;
  - one corrupt asset causes exactly one repair fetch.
  - These tests skip rather than fake PASS until Worker 2 is present on the tested tree.
- `.github/workflows/m8-1e-acceptance.yml`
  - locked install, typecheck, unit, production build;
  - existing platform smoke;
  - Worker 5 M8.1 black-box Playwright acceptance;
  - artifact upload for evidence.
- Authorized release E2E accepts `M81_PAGES_URL` and optional `M81_PAGES_COMMIT`; it verifies app boot, Web App Manifest, `release-metadata.json`, deployed main commit when supplied, configured Resource Manifest, active Service Worker, and offline reload.

## Acceptance matrix

| Area | Required evidence | Current status |
|---|---|---|
| Full Pack | valid install; corrupt/hash/incomplete rejection | INTEGRATED — W1 landed; Worker 5 integrated-tree evidence pending |
| Incremental | V1→V2; 95 unchanged / 3 changed / 2 new; only 5 requests; removed retirement; failure keeps V1 | INTEGRATED — W2 landed; Worker 5 rerun pending |
| Repair | one corrupt/missing asset causes one repair request | INTEGRATED — W2 landed; Worker 5 rerun pending |
| Offline | installed resources survive disconnect + reload and game boots | INTEGRATED DEPENDENCIES — black-box evidence pending |
| SaveV2 | save → reload/load → asset update → same SaveV2 still loads | INTEGRATED DEPENDENCIES — acceptance evidence pending |
| Mobile | 915×412 and 412×915; no overflow; touch; rotation | INTEGRATED — W3 landed; production wiring must pass black-box acceptance |
| Release | real URL, deployed commit, manifest, PWA, offline shell | ENGINEERING CONTRACT PASS / AWAITING_RELEASE_AUTHORIZATION |
| Human Android | 14-step playtest below | NOT-YET-ACCEPTED |

## Added Worker 5 assets

- `web/e2e/m8-1-distribution-acceptance.spec.ts`
  - first-run player-facing wording check;
  - Android landscape `915×412` panel/touch check;
  - Android portrait `412×915` + rotation check;
  - while Worker 3 is absent the UI checks are explicitly skipped; once the Worker 3 module exists on the tested integration tree, missing production-page wiring is a hard FAIL rather than a skip;
  - real Pages URL smoke gated by `M81_PAGES_URL`, with optional deployed-commit assertion via `M81_PAGES_COMMIT`.
- `web/e2e/fixtures/m8-1/acceptance-scenarios.json`
  - shared scenario counts and gate labels.

The E2E spec intentionally runtime-skips distribution UI assertions until the integrated branch actually exposes the M8.1 player controls. A skip is **not** a PASS.

## Required integration follow-up

After W1–W4 are merged into `codex/m8-1-distribution-playtest-integration`, Worker 5 / Main Integration must update this branch from GitHub facts and add or adapt black-box coverage for:

1. Full Pack valid install.
2. Corrupt pack, wrong hash, incomplete pack rejection.
3. V1→V2 request audit: exactly changed + new, not unchanged.
4. Removed assets retired after successful atomic switch.
5. SHA/network/partial/storage failures preserve V1.
6. Repair fetches only missing/corrupt entries.
7. Offline reload reads installed AssetStore resources.
8. SaveV2 before/after asset update remains loadable.
9. Progress states cover downloading / verifying / installing / error / repair.
10. Release test changes from BLOCKED only when a real authorized Pages URL and deployed commit exist.

Do not add a fake Pages URL. Do not turn skipped dependency tests into PASS.

## Human Android playtest checklist

Final M8.1 human gate requires the user to confirm all of the following on an Android device:

1. Open the fixed web URL.
2. Perform first full install.
3. Enter the game.
4. Open the training administrator.
5. Complete at least one battle.
6. Save.
7. Fully close the app/browser.
8. Reopen.
9. Load the save.
10. Run one incremental update.
11. Confirm the full pack was not downloaded again.
12. Disconnect the network.
13. Enter the PWA again.
14. Confirm offline boot works.

New-player/new-device path also requires: no existing data → Full Pack install → normal game entry.

Until the user explicitly confirms this device test, status remains **NOT-YET-ACCEPTED**.

## Gate rules

- `PASS`: executed evidence exists on the tested integrated commit.
- `FAIL`: executed evidence failed.
- `BLOCKED`: dependency or authorization prevents execution.
- `USER-ACCEPTED`: user explicitly completed the Android checklist.
- `NOT-YET-ACCEPTED`: default human gate status.

## Tests / validation

Initial Worker 5 branch is expected to keep baseline typecheck/build compatibility. Distribution-chain tests that require W1–W4 remain skipped/blocked until those implementations are integrated. Final DoD is not satisfied until integrated-tree typecheck, unit, build, platform E2E, Pack E2E, incremental E2E, offline E2E, and mobile E2E have real execution evidence.


## Worker 5 CI history

- Initial Worker 5 CI attempt exposed a harness error: the platform smoke ran without the repository-standard synthetic `game-data` fixture, so Vite returned HTML fallback where the game expected JSON. This was an acceptance-harness failure, not a product PASS/FAIL result.
- The workflow was corrected to run `python3 tools/testing/make_web_fixture.py --out web/public/game-data` before typecheck/unit/build and platform smoke.
- Corrected Worker 5 validation run `36298368254`: **SUCCESS** on head `9144b024faa76b233b86248ee03d323f85d99c13`.
  - locked install / typecheck / unit / production build: PASS;
  - unit suite: 352 pass / 0 fail / 4 skip; the four skips are the Worker 5 incremental/repair acceptance tests because Worker 2 is not yet present on the tested PR tree;
  - existing M8 platform smoke: 2 passed;
  - M8.1 distribution black-box suite: 4 skipped because Worker 3 production wiring is not yet present and no authorized Pages URL exists.
- This green run proves the Worker 5 acceptance scaffold is healthy. It **does not** convert blocked dependency tests or the M8.1 Engineering/Human gates to PASS.

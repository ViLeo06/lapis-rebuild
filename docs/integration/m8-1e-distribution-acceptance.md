# M8.1 Worker 5 — Distribution Acceptance / E2E / Real-device Gate

> Worker: 5  
> Branch: `codex/m8-1e-distribution-acceptance`  
> Baseline: `51907f41365edb4be393579f3814d8e23116dd6e`  
> PR base: `codex/m8-1-distribution-playtest-integration`

## Scope

Worker 5 owns acceptance fixtures, E2E/validation coverage, final acceptance evidence, and the Android human-playtest checklist. It does **not** replace Worker 1–4 production implementations.

## Current dependency snapshot

At Worker 5 start, all four dependency branches existed but were still identical to the baseline:

- `codex/m8-1a-full-pack-contract`: 0 commits ahead.
- `codex/m8-1b-incremental-asset-store`: 0 commits ahead.
- `codex/m8-1c-install-update-ux`: 0 commits ahead.
- `codex/m8-1d-pages-release`: 0 commits ahead.

Therefore Pack / AssetStore / Update / Distribution UI / Release behavior is **not allowed to be reported PASS yet**.

## Acceptance matrix

| Area | Required evidence | Current status |
|---|---|---|
| Full Pack | valid install; corrupt/hash/incomplete rejection | BLOCKED — waiting W1 integration |
| Incremental | V1→V2; 95 unchanged / 3 changed / 2 new; only 5 requests; removed retirement; failure keeps V1 | BLOCKED — waiting W2 integration |
| Repair | one corrupt/missing asset causes one repair request | BLOCKED — waiting W2 integration |
| Offline | installed resources survive disconnect + reload and game boots | BLOCKED — waiting integrated W1/W2/W3 + PWA wiring |
| SaveV2 | save → reload/load → asset update → same SaveV2 still loads | BLOCKED — waiting integrated distribution path |
| Mobile | 915×412 and 412×915; no overflow; touch; rotation | PARTIAL — M8.0 platform harness exists; M8.1 distribution panel pending W3 |
| Release | real URL, deployed commit, manifest, PWA, offline shell | BLOCKED / AWAITING_RELEASE_AUTHORIZATION |
| Human Android | 14-step playtest below | NOT-YET-ACCEPTED |

## Added Worker 5 assets

- `web/e2e/m8-1-distribution-acceptance.spec.ts`
  - first-run player-facing wording check;
  - Android landscape `915×412` panel/touch check;
  - Android portrait `412×915` + rotation check;
  - real Pages URL smoke gated by `M81_PAGES_URL`.
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

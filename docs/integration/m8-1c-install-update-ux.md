# M8.1 Worker 3 — First-run / Install / Update UX

STATUS: DONE

Baseline: `51907f41365edb4be393579f3814d8e23116dd6e`  
Branch: `codex/m8-1c-install-update-ux`  
PR base: `codex/m8-1-distribution-playtest-integration`  
Validated code HEAD: `5d469f755eb7e5d717977e06f6d1d9026b9292fa`  
PR: #80

## Scope

Worker 3 only. This branch adds the player-facing resource install/update/repair panel and its UX contracts. It does not implement Full Pack parsing, AssetStore/update-engine internals, service-worker behavior, Cloudflare release logic, SaveV2 changes, or shared startup wiring.

## Player-facing states

The panel supports the required states:

- `NO_PACK`
- `CHECKING`
- `DOWNLOADING`
- `VERIFYING`
- `INSTALLING`
- `READY`
- `UPDATE_AVAILABLE`
- `REPAIR_REQUIRED`
- `ERROR`
- `OFFLINE_READY`

Player actions intentionally avoid requiring knowledge of Manifest, SHA-256, or IndexedDB:

- `进入游戏`
- `下载完整资源`
- `导入完整资源包`
- `检查更新`
- `立即更新`
- `修复资源`

## Files

- `web/src/ui/distribution-panel-model.ts`
  - state-to-view model
  - progress percent / byte formatting
  - player-facing copy
  - accessible markup renderer
- `web/src/ui/distribution-panel.ts`
  - `installDistributionPanel(...)` integration API
  - async action adapter
  - local Full Pack file picker
  - live snapshot/progress updates
  - safe error fallback
- `web/src/ui/distribution-panel.css`
  - mobile-first overlay
  - safe-area variables
  - portrait / landscape / compact handling
  - coarse-touch 44 px controls
  - keyboard focus styling
  - reduced-motion handling
- `web/tests/distribution-panel.test.ts`
  - state/action/progress/error/escaping unit coverage
- `web/e2e/m8-1-distribution-panel.spec.ts`
  - first-run / installed / update / repair / error views
  - progress rendering
  - 915×412 and 412×915 viewport acceptance
  - touch acceptance
  - desktop keyboard Tab acceptance

## Integration API

Main Integration should install the panel from the shared startup location only after Workers 1/2 are available:

`installDistributionPanel({ initial, actions })`

The `actions` adapter is the only seam required from the distribution engine:

- `enterGame(context)`
- `downloadFullPack(context)`
- `importFullPack(file, context)`
- `checkUpdate(context)`
- `applyUpdate(context)`
- `repair(context)`

Each action receives:

- `getSnapshot()`
- `setSnapshot(snapshot)`
- `updateProgress(progress)`

This lets Worker 2 report total bytes, downloaded bytes, current asset, current step, and failure without this panel importing AssetStore/update-engine internals.

## Main Integration wiring note

Worker 3 intentionally does **not** modify:

- `web/src/m4-main.ts`
- `web/src/pwa-shell.ts`
- `web/public/service-worker.js`
- ResourceManifest authority
- AssetStore/update-engine internals
- Cloudflare configuration
- `Plan.md`
- `Backlog.md`
- `AGENTS.md`

Main Integration owns startup wiring. Recommended flow:

1. resolve installed/target distribution snapshot from Worker 2;
2. call `installDistributionPanel(...)`;
3. map Worker 2 progress into `context.setSnapshot(...)` / `context.updateProgress(...)`;
4. hide/close the distribution layer only when entering the game;
5. preserve `OFFLINE_READY` when installed resources are valid but the network is unavailable.

## UX boundary

- Full Pack import is exposed as a local `.lapispak` file picker; parsing/verifying remains Worker 1 ownership.
- Incremental update semantics are described to the player as “只更新变化的内容”; fetch/diff/staging/atomic commit remain Worker 2 ownership.
- Repair is a player action only; missing/corrupt detection and selective fetch remain Worker 2 ownership.
- Save export/import is not included; that remains M8.2.
- No private/original assets or external deployment writes are introduced.

## Validation

Final green validation:

- GitHub Actions workflow: `Web and parser validation`
- Run: `36299034379`
- Validated code HEAD: `5d469f755eb7e5d717977e06f6d1d9026b9292fa`
- Parser tests / synthetic pack: PASS
- Typecheck: PASS
- Unit tests: PASS — `359 passed / 0 failed`
- Production build: PASS
- Synthetic preview build: PASS
- Chromium integration/offline suite: PASS — `101 passed / 10 skipped`
- Worker 3 distribution E2E: PASS — `4 / 4`
  - first-run / installed / update / repair / error
  - progress rendering
  - desktop keyboard Tab access
  - Android-class 915×412 and 412×915 touch/layout acceptance
- Private-original CI job: SKIPPED by design; this Worker does not require or publish private/original assets.

Validation history:

- An initial unit assertion exposed overly precise byte formatting (`1.50 KB`); the UI formatter was corrected to `1.5 KB`.
- The first Chromium run exposed a test-environment issue: keyboard Tab was asserted inside mobile emulation. Keyboard accessibility and mobile touch acceptance were separated into their correct browser contexts.
- No production regression remained after those fixes.

## Handoff

Do not merge `main` from this Worker. Main Integration should merge PR #80 in the planned sequence after Worker 1 and Worker 2 contracts are available, wire `installDistributionPanel(...)` into shared startup, and then run the integrated M8.1 acceptance tree.

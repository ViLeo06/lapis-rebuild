# M8.1 Worker 3 — First-run / Install / Update UX

STATUS: IMPLEMENTED — CI PENDING

Baseline: \`51907f41365edb4be393579f3814d8e23116dd6e\`  
Branch: \`codex/m8-1c-install-update-ux\`  
PR base: \`codex/m8-1-distribution-playtest-integration\`

## Scope

Worker 3 only. This branch adds the player-facing resource install/update/repair panel and its UX contracts. It does not implement Full Pack parsing, AssetStore, update-engine internals, service-worker behavior, Cloudflare release logic, SaveV2 changes, or shared startup wiring.

## Player-facing states

The panel supports the required states:

- \`NO_PACK\`
- \`CHECKING\`
- \`DOWNLOADING\`
- \`VERIFYING\`
- \`INSTALLING\`
- \`READY\`
- \`UPDATE_AVAILABLE\`
- \`REPAIR_REQUIRED\`
- \`ERROR\`
- \`OFFLINE_READY\`

Player actions are intentionally phrased without requiring knowledge of Manifest, SHA-256, or IndexedDB:

- \`进入游戏\`
- \`下载完整资源\`
- \`导入完整资源包\`
- \`检查更新\`
- \`立即更新\`
- \`修复资源\`

## Files

- \`web/src/ui/distribution-panel-model.ts\`
  - state-to-view model
  - progress percent / byte formatting
  - player-facing copy
  - accessible markup renderer
- \`web/src/ui/distribution-panel.ts\`
  - \`installDistributionPanel(...)\` integration API
  - async action adapter
  - file import picker
  - live snapshot/progress updates
  - safe error fallback
- \`web/src/ui/distribution-panel.css\`
  - mobile-first overlay
  - safe-area variables
  - portrait / landscape / compact handling
  - coarse-touch 44 px controls
  - keyboard focus
  - reduced-motion handling
- \`web/tests/distribution-panel.test.ts\`
  - state/action/progress/error/escaping unit coverage
- \`web/e2e/m8-1-distribution-panel.spec.ts\`
  - first-run / installed / update / repair / error views
  - progress rendering
  - 915×412 and 412×915 viewport acceptance
  - touch and keyboard focus acceptance

## Integration API

Main Integration should import the panel CSS through the panel module and install it from the shared startup location only after Workers 1/2 are available:

\`installDistributionPanel({ initial, actions })\`

The \`actions\` adapter is the only seam required from the distribution engine:

- \`enterGame(context)\`
- \`downloadFullPack(context)\`
- \`importFullPack(file, context)\`
- \`checkUpdate(context)\`
- \`applyUpdate(context)\`
- \`repair(context)\`

Each action receives a context with:

- \`getSnapshot()\`
- \`setSnapshot(snapshot)\`
- \`updateProgress(progress)\`

This allows Worker 2 to report total bytes, downloaded bytes, current asset, current step, and failure without the panel importing AssetStore/update-engine internals.

## Main Integration wiring note

Worker 3 intentionally does **not** modify:

- \`web/src/m4-main.ts\`
- \`web/src/pwa-shell.ts\`
- \`web/public/service-worker.js\`
- ResourceManifest authority
- AssetStore/update-engine internals
- Cloudflare configuration
- \`Plan.md\`
- \`Backlog.md\`
- \`AGENTS.md\`

Main Integration owns the startup wiring. Recommended flow:

1. resolve installed/target distribution snapshot from Worker 2;
2. call \`installDistributionPanel(...)\`;
3. map Worker 2 progress into \`context.setSnapshot(...)\` / \`context.updateProgress(...)\`;
4. hide/close the distribution layer only when entering the game;
5. preserve \`OFFLINE_READY\` when the installed resources are valid but the network is unavailable.

## UX boundary

- Full Pack import is exposed as a local \`.lapispak\` file picker; parsing/verifying remains Worker 1 ownership.
- Incremental update semantics are described to the player as “只更新变化的内容”; fetch/diff/staging/atomic commit remain Worker 2 ownership.
- Repair is a player action only; missing/corrupt detection and selective fetch remain Worker 2 ownership.
- Save export/import is not included; that remains M8.2.
- No private/original assets or external deployment writes are introduced.

## Tests

Expected Worker 3 gate:

- typecheck
- unit tests
- production build
- Chromium E2E including \`m8-1-distribution-panel.spec.ts\`

CI evidence will be added after the latest branch push completes.

## Handoff

Do not merge \`main\` from this Worker. Main Integration should merge this PR in the planned order after Worker 1 and Worker 2 contracts are available, then wire the panel into shared startup and run the integrated M8.1 acceptance tree.

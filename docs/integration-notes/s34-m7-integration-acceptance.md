# S34 — M7 Integration / Balance / Acceptance

Date: 2026-09-21  
Branch: `codex/s34-m7-integration-acceptance`  
Baseline: `main@1d592d0e2194567c5d7d863e6a48250407dabeb3`

## Current phase

Preflight and integration-harness preparation are complete enough to accept upstream handoffs. Final integration is blocked only by the absence of S30-S33 branches/PRs at S34 start; no upstream completion is fabricated.

## S34-owned pre-integration artifacts

- `manifests/m7-integration-acceptance-contract.json`
- `web/src/m7-integration-contract.ts`
- `web/tests/s34-m7-integration-contract.test.ts`
- `docs/validation/s34-m7-preflight-20260921.md`

## Shared-core ownership

S34 is the only M7 worker allowed to make concentrated changes to:

- `web/src/main.ts`
- `web/src/scene.ts`
- `web/src/battle.ts`

No shared-core patch is made during preflight. S34 will first consume S30-S33 modules/adapters and only then patch the minimum required hooks.

## Baseline conflict summary

- M6 promotion policy currently uses 10/20/30... while M7 first-seven-stage boundaries are 6/16/26/36/46/56.
- M6 intentionally exposes the three M5.1 representative skills from the initial stage; M7 requires staged seven-skill unlock plus Lv1-Lv6.
- M6 SaveV2 extensions do not yet prove M7 skill-level persistence.
- current player runtime already has accepted touch interaction, camera follow and confirmed battle retreat; these remain mandatory regressions.
- S30 monster, S31/S32 skill/status and S33 training/recovery contracts are not present yet at this checkpoint.

## Evidence boundary

The M7 numerical balance, recovery values, status durations/chances, training bindings and monster stat curves are reconstruction policy unless an upstream evidence note proves otherwise. S34 will not upgrade old server-boundary gaps to original retail facts merely because the integrated runtime works.

## Next integration action

Re-check S30-S33 branches/PRs, capture exact upstream heads, review their handoffs, then integrate in dependency order:

`S30 data -> S31/S32 status+skills -> S33 training/recovery/UI -> shared core -> SaveV2 -> unit/integration/E2E -> private standalone HTML`.

Final Plan v3.6 / Backlog / evidence-ledger updates are deferred until those gates are actually validated.

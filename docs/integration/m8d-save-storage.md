# M8.0 Worker 4 — IndexedDB Save Storage Adapter

STATUS: DONE

Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`
Branch: `codex/m8d-save-storage`
Head SHA: pending final note commit

## Scope
- SaveV2-oriented `SaveStore` contract with `save/load/exists/delete`.
- IndexedDB-backed implementation compatible with the existing `lapis-web-lab/saves` database.
- Preserve legacy raw-read migration behavior and existing save data.

## Completed
- Added reusable IndexedDB SaveStore and slot API.
- Routed `m4-save-store.ts` through the adapter without changing shared runtime/core files.
- Added structural persisted SaveV2 validation and corrupt-value rejection.
- Added overwrite/failure protection so a failed replacement does not destroy the previous committed save.
- Added coverage for round trip, overwrite, missing slot/delete, corrupt save, and failed overwrite.

## Files changed
- `web/src/storage/save-store.ts`
- `web/src/m4-save-store.ts`
- `web/tests/m8-save-storage.test.ts`
- `docs/integration/m8d-save-storage.md`

## Tests run
- `node --experimental-strip-types --test tests/m8-save-storage.test.ts` — PASS, 5/5.
- `tsc --noEmit` — PASS.
- `vite build` — PASS.
- FULL E2E: NOT RUN.

## Known limitations
- This worker does not add cloud sync, import/export UI, SaveV3, or multi-device persistence.
- Existing build warnings about mixed JSON import attributes and large bundle chunks remain outside Worker 4 scope.

## Required integration hook
- No additional runtime wiring is required for the current manual save path: `m4-save-store.ts` now delegates to SaveStore.
- Main integration should retain the existing IndexedDB database/store identifiers to preserve compatibility.

## Potential conflicts
- Low. No edits to `main.ts`, `scene.ts`, `battle.ts`, `Plan.md`, `Backlog.md`, or `AGENTS.md`.

## Next step
- Main Session integrates this branch with the other M8 workers and runs full platform/browser acceptance.

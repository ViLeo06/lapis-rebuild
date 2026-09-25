# M8.0 Worker 4 — IndexedDB Save Storage Adapter

STATUS: ACTIVE

Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`
Branch: `codex/m8d-save-storage`
Current HEAD: `e1ed76ea34034865a678a65e67782575db4e1c3b`

## Scope

- Introduce a SaveV2-oriented storage contract with `save/load/exists/delete`.
- Provide an IndexedDB-backed implementation that keeps the existing `lapis-web-lab/saves` database compatible.
- Preserve the existing raw-read migration path for legacy saves; do not remove the old save scheme.
- Add targeted coverage for round-trip, overwrite, missing slots, corrupt values, and failed-write protection.

## Completed

- Fixed M8.0 base commit verified.
- Dedicated Worker 4 branch created.
- Existing SaveV2 schema/migrations, M4 IndexedDB store, runtime save/load path, and CI scripts reviewed.

## In progress

- SaveStore adapter implementation and compatibility bridge.

## Remaining

- Add storage implementation.
- Add targeted unit/browser tests.
- Run/verify CI build and tests.
- Finalize this Integration Note and open PR.

## Tests

- Not run yet.

## Next exact step

Implement the SaveStore contract and IndexedDB backend, then route `m4-save-store.ts` through it without changing runtime/core files.

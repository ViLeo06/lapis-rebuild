# M8.0 Worker 1 — Resource Manifest / Asset Pack Contract

STATUS: ACTIVE

- Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`
- Branch: `codex/m8a-resource-manifest`
- Current HEAD: `e1ed76ea34034865a678a65e67782575db4e1c3b`

## Scope

Build the minimal resource-manifest contract needed for future multi-file Web updates, private content packs, offline caching, and content-version checks. This worker does not wire the manifest into the runtime, Service Worker, Cloudflare, or private Drive assets.

## Completed

- Confirmed the fixed M8.0 base commit is readable.
- Confirmed the worker branch and PR did not already exist before branch creation.
- Reviewed `AGENTS.md`, `web/package.json`, `.gitignore`, `web/src/assets.ts`, `web/src/model.ts`, `tools/prepare_web.py`, and `tools/testing/make_web_fixture.py`.
- Confirmed current generated packs already expose `asset-index.json` with path, SHA-256, and size, but no stable resource-manifest contract.

## In progress

- TypeScript resource-manifest types and structural validation.
- Deterministic filesystem generator and file/hash verifier.
- Targeted tests for valid manifests, missing files, hash mismatch, and duplicate asset IDs.

## Remaining

- Add generation/verification scripts.
- Add targeted tests.
- Run targeted tests, package test suite, typecheck, and production build where available.
- Update this note with final HEAD, validation results, limitations, and integration hook.
- Open a PR to `main` without merging.

## Tests

- Not run yet.

## Next exact step

Add the browser-safe TypeScript resource-manifest contract, then add the Node-side deterministic generator/verifier around it.

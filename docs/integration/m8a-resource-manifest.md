# M8.0 Worker 1 — Resource Manifest / Asset Pack Contract

STATUS: DONE

- Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`
- Branch: `codex/m8a-resource-manifest`
- Implementation/tested HEAD: `00d37f611ffce23adcd807fa0a812568194ff277`
- PR: #69 — `M8.0: add resource manifest and asset pack contract`
- Main observed at closeout: `e1ed76ea34034865a678a65e67782575db4e1c3b`
- Final branch HEAD: the documentation-only closeout commit containing this note follows the tested implementation HEAD above.

## Scope

Delivered the minimal resource-manifest contract needed for future multi-file Web updates, private content packs, offline caching, and content-version checks. This worker does not wire the manifest into the runtime, Service Worker, Cloudflare, or private Drive assets.

## Completed

- Added `web/src/resource-manifest.ts`:
  - `ResourceManifest` / `ResourceManifestEntry` TypeScript types;
  - schema/content-pack/version/path/hash/media-type validation;
  - duplicate `assetId` and duplicate path rejection;
  - `findResourceByHash` / `hasResourceContent` for hash-based content identity.
- Added `web/scripts/resource-manifest.ts`:
  - deterministic recursive manifest generation;
  - SHA-256 and byte-size calculation;
  - MIME-type assignment with `application/octet-stream` fallback;
  - filesystem verification for missing, unreadable, size-mismatched, and hash-mismatched files;
  - CLI `generate` and `verify` commands.
- Added npm commands:
  - `resource-manifest:generate`;
  - `resource-manifest:verify`.
- Added `web/tests/resource-manifest.test.ts` covering:
  - valid deterministic manifest generation/verification;
  - missing file;
  - SHA-256 mismatch;
  - duplicate `assetId`.
- Added `docs/contracts/resource-manifest.md` documenting the contract, hash semantics, CLI usage, relation to existing `asset-index.json`, and copyright boundary.
- Opened PR #69 against `main` without merging.
- Did not modify `main.ts`, `scene.ts`, `battle.ts`, `Plan.md`, `Backlog.md`, or `AGENTS.md`.

## Files changed

- `docs/contracts/resource-manifest.md`
- `docs/integration/m8a-resource-manifest.md`
- `web/package.json`
- `web/scripts/resource-manifest.ts`
- `web/src/resource-manifest.ts`
- `web/tests/resource-manifest.test.ts`

## Tests run

GitHub Actions run `36129241028` on implementation/tested HEAD `00d37f611ffce23adcd807fa0a812568194ff277`:

- PASS — parser tests and synthetic pack generation.
- PASS — TypeScript typecheck.
- PASS — complete Web unit-test command, including the new resource-manifest tests.
- PASS — production build.
- PASS — existing standalone synthetic preview build.
- IN PROGRESS at documentation closeout — Chromium integration/offline E2E.
- SKIPPED by workflow condition — private-original job (PR event does not request a private smoke).

Worker 1 required gate is targeted/unit coverage plus typecheck/build. Full platform E2E remains a main-session / CI integration responsibility per the M8 worker instructions.

## Known limitations

- No Service Worker, runtime loader, Cloudflare downloader, UI import flow, Drive sync, or private-asset publication is implemented here.
- The minimal generator uses pack-relative path as the initial `assetId`; a later migration that renames paths but requires logical identity continuity must supply an explicit stable-ID policy.
- Manifest authenticity/signing is out of scope; SHA-256 detects content equality/integrity relative to the trusted manifest, not manifest provenance.
- Unknown extensions use `application/octet-stream`.
- Existing `asset-index.json` emitters are intentionally unchanged to avoid broad generator/runtime coupling during this parallel worker round.

## Required integration hook

The M8 integration session should choose one of two minimal wiring options:

1. have the existing safe/private pack generators additionally emit `resource-manifest.json`; or
2. run `resource-manifest:generate` over an already-built pack.

Worker 2 / offline caching may consume this manifest contract later, but Worker 1 intentionally does not implement Service Worker behavior.

## Potential conflicts

- `web/package.json` may also be touched by PWA/platform workers; preserve both sets of scripts during integration.
- No shared runtime core file was modified.

## Next step

Main Session: review PR #69, preserve the contract/generator/tests, resolve any `web/package.json` overlap, then wire manifest production/consumption only where the integrated M8 architecture requires it.

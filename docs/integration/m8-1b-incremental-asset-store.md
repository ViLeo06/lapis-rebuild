# M8.1 Worker 2 — AssetStore / Incremental Update / Repair

STATUS: IMPLEMENTATION COMPLETE — REQUIRED WORKER GATES PASS; FULL WEB CI REGRESSION IN PROGRESS

## Scope

Worker 2 only. This branch does not modify the ResourceManifest schema authority, SaveV2 semantics, `m4-main.ts`, PWA Service Worker, distribution UI, Cloudflare configuration, `Plan.md`, `Backlog.md`, or `AGENTS.md`.

- Baseline: `51907f41365edb4be393579f3814d8e23116dd6e`
- Branch: `codex/m8-1b-incremental-asset-store`
- PR base: `codex/m8-1-distribution-playtest-integration`

## Delivered

### Independent browser AssetStore

`web/src/distribution/asset-store.ts`

- Uses a dedicated IndexedDB database: `lapis-asset-store`.
- Keeps large resource blobs outside the existing SaveV2 / SaveStore database.
- Stores:
  - active `contentPack` / `version`;
  - the complete active ResourceManifest, which remains the authority for `assetId`, `path`, `size`, `sha256`, media type and version;
  - content-addressed Blob records keyed by SHA-256;
  - install/update metadata (`installedAt`, `updatedAt`, `lastOperation`, asset count, total bytes).
- Content-addressed blobs allow unchanged resources to be reused across manifest versions without re-downloading or duplicating them.
- Removed assets are retired logically when the active manifest pointer switches; they are no longer returned by `getAsset()`. Physical garbage collection is intentionally not part of this Worker so failed updates never need destructive cleanup.

### Atomic install/update switch

The updater stages verified blobs first. The active installed manifest is changed only by the final IndexedDB transaction.

The final transaction spans:

- Blob availability checks;
- target manifest record;
- active installed metadata.

If download, size/hash verification, staging storage, or final commit fails, the previous active manifest remains unchanged and therefore remains bootable.

### Incremental update engine

`web/src/distribution/update-engine.ts`

Manifest diff output:

- `unchanged`
- `changed`
- `newAssets`
- `removed`

Resource identity is path-based. A path is downloaded only when its content hash/size changes or when the path is new. Entry `version` is intentionally not treated as a content change because schema 1 requires entry.version to follow manifest.version; otherwise every release would force a full re-download.

Only:

`changed + newAssets`

are fetched.

Each fetched resource goes through:

1. fetch
2. size verify
3. SHA-256 verify
4. staging Blob write
5. final atomic manifest/install commit

### Repair

`auditInstalledAssets()` verifies every active resource against its expected size and SHA-256.

`repairAssets()` fetches only:

- missing entries;
- corrupt entries.

Healthy entries are not requested again.

### Progress contract

`UpdateProgress` exposes:

- `status`
- `totalBytes`
- `downloadedBytes`
- `currentAsset`
- `failure`

Statuses:

- `checking`
- `downloading`
- `verifying`
- `staging`
- `committing`
- `repairing`
- `complete`
- `failed`

Worker 3 can consume this contract without depending on AssetStore internals.

## Tests added

`web/tests/m8-1-asset-store-update.test.ts`

Coverage includes:

- V1 -> V2 with 95 unchanged / 3 changed / 2 new: exactly five fetches;
- removed resource retirement without unchanged refetch;
- network failure preserves V1;
- SHA mismatch preserves V1;
- partial/size mismatch preserves V1;
- staging storage failure preserves V1;
- final commit failure preserves V1;
- repair fetches only one missing + one corrupt resource;
- new AssetStore adapter instance reads previously persisted metadata/resources.

The final browser-level IndexedDB reload / mobile / offline chain remains part of Worker 5 acceptance after Main Integration wires Worker 1–4 together.

## Integration API

Main/Worker 3 should normally construct:

`new IndexedDbAssetStore()`

and call:

- `updateAssets({store,targetManifest,fetchAsset,onProgress})`
- `repairAssets({store,contentPack,fetchAsset,onProgress})`
- `auditInstalledAssets(store,contentPack)`

The downloader is injected through `AssetFetcher`. `createHttpAssetFetcher()` is provided for normal HTTP asset roots.

## Shared-core wiring note

No shared production wiring is performed here.

Main Integration should:

1. obtain the target ResourceManifest from the release source;
2. create `IndexedDbAssetStore`;
3. connect Worker 3 UI actions to `updateAssets` / `repairAssets`;
4. translate `UpdateProgress` to player-facing UI;
5. keep SaveV2 storage separate;
6. run Worker 5 browser reload/offline/mobile acceptance.

## Public/private asset boundary

AssetStore and Update Engine are content-agnostic. They do not publish assets and do not contain Drive URLs, tokens, cookies, private resource locations, or original client assets.

Public-safe and private/original packs may use the same storage/update contract, but distribution authorization and hosting policy remain Worker 4 / Main Integration responsibilities.

## Validation

Implementation/tested HEAD: `4376a0f103a3c31325c02e357b0dd72b1146d29d`

GitHub Actions run: `36298221485` — `Web and parser validation`.

Required Worker 2 gate is PASS on the implementation/tested HEAD:

- locked `npm ci --ignore-scripts`: PASS
- `npm run typecheck`: PASS
- `npm test`: PASS
- `npm run build`: PASS

The same CI step also completed parser/synthetic-pack setup and standalone synthetic preview build successfully.

Supplemental isolated verification after the strip-types compatibility fix:

- strict TypeScript compilation of ResourceManifest + Worker 2 source: PASS
- Worker 2 focused Node tests: 9/9 PASS

At the time of this note update, the repository-wide Chromium integration/offline step in run `36298221485` is still running. It is broader than the Worker 2 minimum DoD, so it is recorded as `IN PROGRESS`, not PASS. The +30/+60 resume tasks must re-check this run and update the note if it finishes or exposes a Worker 2 regression.

`private-original` is skipped because this worker does not request private-original validation and must not publish or execute original client assets.

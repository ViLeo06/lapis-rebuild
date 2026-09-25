# Resource Manifest / Asset Pack Contract (M8.0)

Worker 1 defines a small, deterministic manifest contract for standard multi-file Web builds and future private content packs.

## Contract

Schema 1:

```json
{
  "schema": 1,
  "contentPack": "synthetic-ci",
  "version": "m8-test-1",
  "assets": [
    {
      "assetId": "maps/map-0000.png",
      "path": "maps/map-0000.png",
      "contentPack": "synthetic-ci",
      "size": 1234,
      "sha256": "<64 lowercase hex characters>",
      "mediaType": "image/png",
      "version": "m8-test-1"
    }
  ]
}
```

The authoritative TypeScript definition and structural validator live in `web/src/resource-manifest.ts`.

## Identity and update semantics

- `assetId` is the stable identity within one manifest. The minimal generator uses the normalized pack-relative path as the initial asset ID.
- `path` is always a relative POSIX path and cannot escape the content-pack root.
- `contentPack` identifies which independently versioned pack owns the asset.
- `version` is an opaque content-pack version string. M8 does not prescribe semantic versioning.
- `size` is byte length.
- `sha256` is the content identity. Callers can use `findResourceByHash` / `hasResourceContent` to decide that identical bytes are already present even if a later integration layer changes URLs.
- `mediaType` is an explicit MIME type so cache/download layers do not need to infer it after manifest generation.

A changed path with the same SHA-256 is the same content bytes. A stable `assetId` whose SHA-256 changes is new content for that logical asset.

## Generator

From `web/`:

```sh
npm run resource-manifest:generate -- \
  --root public/game-data \
  --output public/game-data/resource-manifest.json \
  --content-pack private-game-data \
  --version m8-pack-1
```

Generation is deterministic for the same file tree and arguments. The output file is excluded automatically when it is inside the scanned root, avoiding a self-referential hash.

## Verifier

```sh
npm run resource-manifest:verify -- \
  --root public/game-data \
  --manifest public/game-data/resource-manifest.json
```

Verification checks:

- structural validity;
- duplicate `assetId` and duplicate paths;
- missing files;
- byte-size mismatches;
- SHA-256 mismatches.

Unknown file extensions use `application/octet-stream`.

## Relationship to current `asset-index.json`

Current private/synthetic pack generators already emit `asset-index.json` containing path → SHA-256/size. This worker does not rewrite those generators or change runtime loading.

The M8 integration layer may later either:

1. have existing pack generators additionally emit `resource-manifest.json`; or
2. run the new deterministic generator over an already-built safe/private pack.

That wiring belongs to the integration phase because Worker 1 must not modify `main.ts`, `scene.ts`, Service Worker code, Cloudflare deployment, Drive synchronization, or private original assets.

## Security / copyright boundary

The manifest contains metadata only. It does not authorize publishing the referenced files. Original client assets remain private research assets and stay outside Git unless separately approved.

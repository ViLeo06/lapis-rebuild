# M8.1 Full Pack contract v1

Status: RECONSTRUCTION_POLICY (new distribution format, not an original-client fact).
Authority: `web/src/resource-manifest.ts`, schema **1**, unchanged.
Implementation: `web/src/distribution/full-pack.ts`; Node CLI `web/scripts/full-pack.ts`;
ZIP writer: Python standard-library `zipfile` in `tools/write_lapispak.py`.

## Container

Name: `lapis-full-<contentPack>-<version>.lapispak`. This is a resource archive,
not standalone HTML, a save file, an executable or an installer.

The container is a deliberately narrow, interoperable **ZIP32 / STORE (method 0)**
profile. Standard ZIP tools can list/read it. It is not a general-purpose ZIP importer.
Reference: PKWARE APPNOTE 6.3.10, sections 4.1, 4.3, 4.4
(<https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT>).

Member 1 is `resource-manifest.json`. Then exactly one ordinary file for every
`manifest.assets[].path`, in JavaScript ordinal string order (`<`/`>`, not locale order).
No directory records, additional files, duplicate IDs, duplicate paths, case-insensitive
aliases, file/directory prefix collisions, symlinks, devices or executable extraction.

Writer fixes ZIP timestamps to 1980-01-01 00:00:00, Unix regular-file attributes to
0644, empty extras/comments, no encryption or data descriptors, no compression.
The reader rejects DEFLATE, ZIP64, split archives, encrypted records, extras/comments,
trailing/prepended/hidden bytes, overlapping or noncontiguous records, local/central
header disagreement, unsupported member attributes, bad UTF-8 and CRC errors.
It supports ASCII names without a flag and UTF-8 names with bit 11.

STORE avoids decompression bombs and does not require a new browser dependency.
The tradeoff is no extra compression, including JSON/text. ZIP64/DEFLATE are a future
explicit contract revision, not silently accepted extensions.

## Manifest and integrity

The builder consumes an existing validated manifest; it does **not** regenerate
hashes from whatever happens to be on disk. All entries retain the existing schema-1
`assetId/path/contentPack/size/sha256/mediaType/version` meanings.

Archive JSON uses `canonicalFullPackManifest`: root keys schema, contentPack, version,
assets; entry keys assetId, path, contentPack, size, sha256, mediaType, version; assets
sorted as above; UTF-8, compact JSON and one LF. Input formatting/key order may differ;
the pack's canonical representation must match exactly. Unknown fields, duplicate JSON
keys or ambiguous formatting cannot hide inside an accepted archive manifest.
No ResourceManifest validator/schema changes are made. The stricter archive portability
policy does not redefine loose-resource schema validation.

Every asset must match its declared **size and SHA-256**, as well as ZIP CRC32.
Manifest entry identities must match the root contentPack/version. Callers can pin the
expected contentPack and version and, preferably, a **trusted target manifest**.
A manifest inside an untrusted ZIP only proves internal consistency: hashes are **not
signatures**, do not prove licensing, and do not authenticate the producer.

Full Pack and incremental delivery use this SAME target manifest/hash authority.
The canonical JSON may be served for incremental comparison; do not maintain a second
independent list of hashes. Never derive authority from the filename alone.

Paths are relative POSIX, NFC-normalized, at most 512 characters, with no empty/dot
segments, backslashes, ASCII whitespace/control characters, `:%?#<>"|*`, trailing dots,
or Windows reserved device basenames. Raw and URL-encoded traversal is rejected.
A resource may be zero length; its actual empty-content SHA must still match.

## Limits and browser API

v1 fixed ceilings: 512 MiB archive; 128 MiB individual asset; 8 MiB manifest;
20,000 ZIP members including the manifest. Total declared asset payload is capped at
504 MiB, with final archive size checked separately. Larger packs fail closed.
These limits target derived Web assets, not the 2.7 GB original client tree.

```ts
import {verifyFullPack} from './distribution/full-pack.ts';
const verified = await verifyFullPack(file, {
  expectedContentPack: target.contentPack,
  expectedVersion: target.version,
  expectedManifest: target, // obtained from the trusted release authority
  signal,
  onProgress: progress => { /* VERIFYING/VERIFIED, totalBytes, verifiedBytes, currentAsset */ },
});
for (const entry of verified.manifest.assets) {
  const blob = verified.getAsset(entry.path);
  // W2 owns staging and atomic activation in AssetStore. Do not write SaveV2.
}
```

`file` is a browser File/Blob. The reader slices the central directory and each member;
it never calls arrayBuffer on the whole input. Verification holds at most a bounded
member plus hash buffers, not an inflated copy of the archive. SHA requires Web Crypto
(HTTPS/localhost). Cancellation rejects. A verified handle is returned ONLY after ALL
members pass; metadata is frozen; `getAsset(path)` returns immutable Blob slices.
There is no fetch, URL resolution, installation, save, UI, service-worker or activation
side effect. Partial progress is not authorization to mark an installation READY.

Errors are `FullPackError` with stable `code` (see exported union), suitable for W3 to
translate into player-facing text. Do not display technical stack traces to players.

## Build / verify / reproduce

Node follows the project's locked Node >=22.12 setup; Python 3.9+ stdlib is required.
Run from `web/` (paths are examples, not a request to access a local computer):

```sh
npm ci --ignore-scripts
npm run full-pack:build -- --root /private/derived-assets --manifest /private/resource-manifest.json --output /private/output/lapis-full-demo-1.lapispak --content-pack demo --version 1 --visibility private-original
npm run full-pack:verify -- --pack /private/output/lapis-full-demo-1.lapispak --manifest /private/resource-manifest.json --content-pack demo --version 1
npm run test:full-pack
npm run full-pack:smoke -- --output /tmp/lapis-synthetic-output
```

The builder reads ONLY listed assets, refuses symlinks below the input root, verifies
size/hash before archiving, then verifies the entire candidate with the browser-compatible
reader. Source roots should be controlled/stable during the build. It publishes by
same-filesystem create-only hard link after validation (no overwrite), and removes staging
on failure. Output must be outside the input root and outside this repository's
`web/public` and `web/dist` (including symlink aliases). Existing output is never replaced.
Use a new version/output directory. Private output permissions are 0600.

`full-pack:smoke` uses generated text/JSON only, builds twice, checks identical SHA/bytes
and build -> verify, corrupts one payload and requires rejection. It emits a synthetic
pack, the SAME canonical target manifest and `full-pack-report.json`.
The W1 CI artifact is synthetic-only and is NOT a playable original-asset Full Pack.

## Public/private boundary

`public-safe` and `private-original` have identical archive format. `--visibility` is an
explicit operator declaration in the build report, not an embedded signature, licensing
proof, encryption or release permission. The same input bytes produce the same pack for
both classifications. No asset is automatically classified as safe by a filename/hash.

All `.lapispak` files are Git-ignored. Do not force-add private/original archives or source
assets. No automatic Pages upload, deploy, Drive retrieval, token/cookie or signed URL is
implemented. W4 owns separately authorized, allowlisted public-safe distribution.
Private/original packs stay in approved private Drive/private CI paths, never public Pages.

# Cloudflare Pages release contract

Status: **M8.1 ENGINEERING READY / RELEASE AUTHORIZED / PAGES ACCOUNT CONNECTION PENDING**  
Cloudflare Pages contract last externally verified on **2026-09-27**; closeout state synchronized on **2026-10-01**.

This document defines the M8.1 release contract for the standard multi-file Web/PWA build.

The current approved distribution model is:

**Cloudflare Pages Web/PWA shell + local Full Pack import.**

Cloudflare R2 / paid object storage is not part of the current plan. Private/original game assets must not be published to public Pages.

## 1. Release model

Target: **Cloudflare Pages with GitHub integration**.

- Repository: `ViLeo06/lapis-rebuild`
- Production branch: `main`
- Pages root directory: `web`
- Build command: `npm run build`
- Build output: `dist`

Git-integrated Pages builds the production branch and can build non-production branches as preview deployments.

The Pages site is the public application shell. The private/original Full Pack is imported locally by the player and stored in the browser-local M8.1 AssetStore.

## 2. Production and preview rules

When the authenticated Cloudflare project connection is completed:

- `main` is the production branch;
- non-production branches are preview-only;
- branch/PR previews must never overwrite production;
- preview URLs are integration evidence, not production URLs;
- the deployed commit must be recorded from Pages/GitHub status before a release is called production.

A real Pages URL must not be invented or inferred before a deployment exists.

## 3. Build and Node contract

Required release build from `web/`:

`npm ci --ignore-scripts`

then:

`npm run build`

Repository engine requirement:

`node >=22.12.0`

The Worker 4 release gate uses Node `22.16.0`.

## 4. Release metadata

Every production Vite build emits:

`/release-metadata.json`

Schema 1 example:

```json
{
  "schema": 1,
  "release": {
    "channel": "production",
    "commit": "<git commit>",
    "branch": "main",
    "url": "https://<project>.pages.dev"
  },
  "content": null
}
```

Cloudflare supplies `CF_PAGES_COMMIT_SHA`, `CF_PAGES_BRANCH` and `CF_PAGES_URL`. GitHub CI falls back to GitHub environment values and uses the `ci` channel.

If a future **public-safe** content release is deliberately attached, these non-secret variables may describe it:

- `LAPIS_PUBLIC_CONTENT_PACK`
- `LAPIS_PUBLIC_CONTENT_VERSION`
- `LAPIS_PUBLIC_MANIFEST_PATH`
- `LAPIS_PUBLIC_FULL_PACK_PATH` (optional)

Only same-origin absolute paths under the approved distribution layout are accepted. External signed URLs, query-string download links and `/game-data/` paths are rejected.

For the current **local Full Pack import** model, Pages release metadata may intentionally keep `content: null`.

## 5. Public distribution layout

A future public-safe content release uses versioned paths:

- Resource Manifest: `/distribution/manifests/<contentPack>/<version>/resource-manifest.json`
- Full Pack: `/distribution/packs/lapis-full-<contentPack>-<version>.lapispak`
- Incremental assets: `/distribution/assets/<contentPack>/<version>/<manifest-entry-path>`

The Full Pack and incremental updater share one Resource Manifest / size / SHA-256 authority.

A public Full Pack is allowed only when explicitly listed in:

`web/release-public-assets.json`

For each allowlisted version, the release sanity gate also requires every incremental asset named by the same Resource Manifest, verifies its size and SHA-256, and rejects extra unlisted files under that versioned incremental root.

The default allowlist is empty. Under the current M8.1 local-import decision, private/original Full Packs stay outside public Pages.

## 6. Private/original asset boundary

Public Pages must never contain private/original client resources.

The release gate rejects:

- `game-data` material in public `dist`;
- raw/original extensions such as `.spr`, `.ani`, `.sgr`, `.lib`, `.tdg`, executables/DLLs and generic raw archives;
- any `.lapispak` not explicitly allowlisted as public-safe;
- missing/corrupt/unlisted incremental assets for an allowlisted public release.

Still forbidden:

- original/private Full Pack on public Pages;
- Drive signed URLs as public distribution metadata;
- secrets, API tokens, cookies or credentials in release artifacts;
- assuming repository privacy makes Pages output private.

Private/original Full Packs may use the same Worker 1 archive format, but are imported locally rather than hosted through Pages.

## 7. Update-safe cache rules

`web/public/_headers` is copied into `dist/_headers`.

M8.1 rules:

- `/assets/*`: one-year immutable cache for Vite fingerprinted files;
- `/distribution/packs/*`: one-year immutable cache for versioned public packs;
- `/distribution/assets/*`: one-year immutable cache for versioned manifest-pinned assets;
- `/distribution/manifests/*`: `no-cache, must-revalidate`;
- `/release-metadata.json`: `no-store`;
- `/index.html`, `/service-worker.js`, `/manifest.webmanifest`: `no-cache, must-revalidate`.

This keeps shell/update pointers revalidatable while allowing immutable versioned payloads.

## 8. SPA/PWA behavior

Worker 4 does not own application runtime wiring.

Worker 4 does not modify:

- `web/public/service-worker.js`
- `web/src/pwa-shell.ts`
- `web/src/m4-main.ts`

PWA/offline behavior and the local Full Pack import runtime remain Main Integration / acceptance responsibilities.

## 9. GitHub release gate

`.github/workflows/m8-1d-pages-release.yml` validates the release artifact without deploying it.

It proves:

- locked dependency install;
- unit tests;
- production build;
- required static release files exist;
- static root and generated Vite asset can be fetched;
- schema-1 Resource Manifest fetch works;
- required cache rules are present;
- release metadata identifies the tested commit;
- public release sanity passes;
- no private/original asset leakage occurs.

Current integration baseline:

`cd1ce8d136d37357ce06720f9e0f7bc75c4c807c`

Current Pages release gate:

`36326945088` — **SUCCESS**

This workflow is a release **gate**, not a credentialed Cloudflare deployment job.

## 10. First real Pages deployment checklist

### Engineering preflight

- [x] Current M8.1 integration baseline passes Worker 4 Pages release gate.
- [x] Public Full Pack allowlist is empty for the local-import distribution model.
- [x] Public release gate rejects private/original asset leakage.
- [ ] Target release commit is merged to the intended production branch.
- [ ] Main Integration full validation is green for the exact release commit.

### Account-side handoff

Public web release was authorized by the user on **2026-09-27**. The remaining steps require the authenticated Cloudflare/GitHub account connection rather than further authorization from Worker 4:

- [ ] create/connect the Cloudflare Pages project;
- [ ] authorize Cloudflare GitHub access to `ViLeo06/lapis-rebuild`;
- [ ] set production branch `main`;
- [ ] set root `web`, build `npm run build`, output `dist`;
- [ ] trigger/observe the first Pages deployment;
- [ ] record project name, URL, deployed commit and build result.

No R2 bucket or paid object-storage setup is required.

### Post-deploy smoke

- [ ] Pages URL returns the app shell;
- [ ] `/manifest.webmanifest` loads;
- [ ] `/release-metadata.json` reports the deployed commit;
- [ ] first-run local Full Pack import UI is available when no AssetStore is installed;
- [ ] existing installed AssetStore reopens without requiring a Full Pack re-import;
- [ ] acceptance worker/Main runs PWA/offline and distribution smoke;
- [ ] user completes Android human playtest.

## 11. Current external status

User release authorization is already recorded.

Current external state:

`RELEASE_AUTHORIZED / PAGES_ACCOUNT_CONNECTION_PENDING`

There is still no verified production/preview Pages URL recorded in the repository. Do not claim `RELEASE-PASS` until a real deployment URL is tied to the deployed commit and post-deploy acceptance succeeds.

R2/object-storage hosting remains abandoned. Private/original Full Packs remain local/private.

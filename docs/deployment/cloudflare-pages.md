# Cloudflare Pages release contract

Status: **M8.1 ENGINEERING READY / AWAITING_RELEASE_AUTHORIZATION**  
Verified against Cloudflare Pages official documentation on **2026-09-27**.

This document is the M8.1 release contract for the standard multi-file Web/PWA build. It defines what the repository and CI must guarantee before a real Cloudflare Pages project is connected. It does **not** authorize account mutation, public deployment, DNS changes, or publication of private/original game assets.

## 1. Release model

Target: **Cloudflare Pages with GitHub integration**.

- Repository: `ViLeo06/lapis-rebuild`
- Production branch: `main`
- Pages root directory: `web`
- Build command: `npm run build`
- Build output: `dist`

Git-integrated Pages builds the production branch automatically and can build non-production branches as preview deployments. Pull requests originating from the same connected repository can receive preview URLs.

The project intentionally remains on Pages for M8.1 because M8.0 already prepared and validated this static Web/PWA path. Cloudflare currently recommends Workers for many new projects, but that does not invalidate the existing Pages static-hosting contract.

Official references:

- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://developers.cloudflare.com/pages/configuration/preview-deployments/
- https://developers.cloudflare.com/pages/configuration/build-configuration/

## 2. Production and preview rules

After authorization:

- `main` is the only production branch.
- non-production branches are preview-only;
- branch/PR previews must never overwrite production;
- preview URLs are evidence for integration testing, not production URLs;
- the deployed commit must be recorded from Pages/GitHub status before a release is called production.

Recommended Pages branch control:

- production deployments: enabled for `main`;
- preview deployments: enabled for repository branches used by active PRs;
- fork PR previews: do not rely on them, because Pages does not create the same preview URL flow for fork-origin PRs.

Cloudflare Git integration cannot later be converted into a Direct Upload project. That is accepted for this project; any future migration would be a separate decision.

## 3. Build and Node contract

The application already lives under `web/` and uses the repository lockfile.

Required release build:

`npm ci --ignore-scripts`

then:

`npm run build`

Current application engine requirement:

`node >=22.12.0`

The release gate uses Node `22.16.0`. Before real project creation, re-check the current Pages build image and pin `NODE_VERSION` only if the Pages default no longer satisfies the repository engine.

## 4. Release metadata

Every production Vite build must emit:

`/release-metadata.json`

The file is generated during `vite build` and has schema 1:

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

Cloudflare supplies `CF_PAGES_COMMIT_SHA`, `CF_PAGES_BRANCH` and `CF_PAGES_URL`. GitHub CI falls back to the corresponding GitHub environment variables and marks the channel as `ci`.

When a **public-safe** content release is intentionally attached, the following non-secret build variables may describe it:

- `LAPIS_PUBLIC_CONTENT_PACK`
- `LAPIS_PUBLIC_CONTENT_VERSION`
- `LAPIS_PUBLIC_MANIFEST_PATH`
- `LAPIS_PUBLIC_FULL_PACK_PATH` (optional)

Only same-origin absolute paths such as `/distribution/...` are accepted. Absolute external URLs, query strings, signed Drive URLs and `/game-data/` paths are rejected by the metadata generator.

## 5. Public Resource Manifest and Full Pack layout

Public-safe distribution uses versioned paths:

- Resource Manifest: `/distribution/manifests/<contentPack>/<version>/resource-manifest.json`
- Full Pack: `/distribution/packs/lapis-full-<contentPack>-<version>.lapispak`

The Full Pack and incremental updater must share the same Resource Manifest/hash authority. Worker 4 does not build or parse the archive; Worker 1 owns that contract.

A public Full Pack is allowed only when it is explicitly listed in:

`web/release-public-assets.json`

The release sanity gate rejects every unlisted `.lapispak`.

The default allowlist is empty. Therefore M8.1 can merge release infrastructure without accidentally publishing a pack.

## 6. Private/original asset boundary

Public Pages must never contain private/original client resources.

The gate rejects:

- `web/public/game-data/` material if it somehow reaches `dist`;
- raw/original extensions such as `.spr`, `.ani`, `.sgr`, `.lib`, `.tdg`, executables/DLLs and generic raw archives;
- any `.lapispak` not explicitly allowlisted as public-safe.

Still forbidden:

- original/private Full Pack on public Pages;
- Drive signed URLs;
- secrets, API tokens, cookies or credentials;
- assuming a private GitHub repository makes Pages output private.

Private/original Full Packs may use the same Worker 1 file format, but must remain in the project-approved private distribution path.

## 7. Update-safe cache rules

`web/public/_headers` is copied into `dist/_headers`.

M8.1 rules:

- `/assets/*`: one-year immutable cache for Vite fingerprinted files;
- `/distribution/packs/*`: one-year immutable cache because pack filenames are versioned;
- `/distribution/manifests/*`: `no-cache, must-revalidate`;
- `/release-metadata.json`: `no-store`;
- `/index.html`, `/service-worker.js`, `/manifest.webmanifest`: `no-cache, must-revalidate`.

This prevents the update pointer/shell from being stuck behind an immutable cache while retaining efficient caching for content-addressed/versioned payloads.

Cloudflare Pages also provides ETag-based revalidation for normal static assets.

Official references:

- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/pages/configuration/serving-pages/

## 8. SPA/PWA behavior

Do not add a redundant catch-all `_redirects` rule solely for SPA fallback. The project still relies on Pages static SPA behavior and the existing PWA service worker.

Worker 4 does not modify:

- `web/public/service-worker.js`
- `web/src/pwa-shell.ts`
- `web/src/m4-main.ts`

PWA/offline behavioral acceptance remains Worker 5/Main Integration responsibility.

## 9. GitHub release gate

`.github/workflows/m8-1d-pages-release.yml` validates the release artifact without deploying it.

It must prove:

- locked dependency install;
- unit tests;
- production build;
- `dist/index.html`, `dist/_headers`, Web App Manifest and `release-metadata.json` exist;
- static root and generated Vite asset can be fetched;
- a synthetic schema-1 Resource Manifest can be fetched from the static host;
- required cache rules are present;
- release metadata identifies the tested commit;
- public release sanity passes;
- no private/original asset leakage is detected.

This workflow is a release **gate**, not a Cloudflare credentialed deployment job.

## 10. First production deployment checklist

### Engineering preflight

- [ ] target commit is on `main`;
- [ ] Worker 4 release gate is green for that commit/integration tree;
- [ ] Main Integration typecheck/unit/build/PWA/offline gates are green;
- [ ] `web/release-public-assets.json` contains only deliberately public-safe Full Packs;
- [ ] no private/original asset artifact is present in `dist`;
- [ ] release metadata content coordinates match the intended public release, or `content` is deliberately `null`.

### Requires explicit user authorization

- [ ] create/connect the Cloudflare Pages project;
- [ ] authorize Cloudflare GitHub access to `ViLeo06/lapis-rebuild`;
- [ ] set production branch `main`;
- [ ] set root `web`, build `npm run build`, output `dist`;
- [ ] configure non-secret public content variables if a public-safe content pack is being published;
- [ ] trigger/observe the first production deployment;
- [ ] record project name, production URL, deployed commit and build result.

### Post-deploy smoke

- [ ] production URL returns the app shell;
- [ ] `/manifest.webmanifest` loads;
- [ ] `/release-metadata.json` reports the deployed `main` commit;
- [ ] target public Resource Manifest loads if configured;
- [ ] PWA/offline acceptance is run by the M8.1 acceptance worker;
- [ ] Android human playtest is completed before M8.1 is called fully accepted.

## 11. Current external status

No Cloudflare account/project mutation was authorized in this Worker session.

Therefore:

`AWAITING_RELEASE_AUTHORIZATION`

No production project name or URL is claimed.

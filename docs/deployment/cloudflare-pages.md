# Cloudflare Pages deployment contract

Status: **M8.0 deployment preparation only**  
Verified against Cloudflare Pages official documentation on **2026-09-25**.

This document defines the intended deployment contract for the standard multi-file Web build. It does **not** authorize or perform a public deployment.

## 1. Deployment model

Preferred target: **Cloudflare Pages with GitHub integration**.

Repository:

`ViLeo06/lapis-rebuild`

Production branch when a real Pages project is later authorized:

`main`

Cloudflare Pages Git integration can build a connected GitHub repository automatically, create preview deployments for non-production branches, and create pull-request preview URLs for PRs originating from the connected repository.

Official references:

- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://developers.cloudflare.com/pages/configuration/preview-deployments/

## 2. Build location

Cloudflare Pages project root directory:

`web`

Reason:

- the Vite application, lockfile, TypeScript config and build scripts are all under `web/`;
- setting the Pages root directory to `web` avoids adding repository-root wrapper scripts only for hosting.

## 3. Install and build

Dependency install is handled by the Pages build environment from `web/package-lock.json`.

Build command:

`npm run build`

Current `web/package.json` resolves that to:

`tsc --noEmit && vite build`

Build output directory:

`dist`

The output directory is relative to the configured Pages root directory, so the deployed artifact is `web/dist/`.

Cloudflare's current Vite guidance uses `npm run build` and `dist`; the project already matches that convention, so M8.0 does not replace or wrap the existing Vite build.

Official references:

- https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/
- https://developers.cloudflare.com/pages/configuration/build-configuration/

## 4. Node.js version

Current project requirement:

`node >=22.12.0`

Cloudflare Pages build image v3 currently provides Node.js 22 by default and documents `NODE_VERSION`, `.node-version`, and `.nvmrc` as supported overrides.

No Node pin is required for the first deployment because the current Pages v3 default satisfies this repository's engine constraint.

If reproducibility later requires an explicit pin, configure it in the Pages build environment rather than introducing a hosting-only package-manager wrapper. Re-check the current Pages build image before creating the real project.

Official reference:

- https://developers.cloudflare.com/pages/configuration/build-image/

## 5. Environment variables

Application-required production environment variables:

**None currently required for the static game shell.**

Cloudflare automatically exposes Pages build metadata such as `CF_PAGES`, `CF_PAGES_BRANCH`, `CF_PAGES_COMMIT_SHA`, and `CF_PAGES_URL`.

Do not add secrets, tokens, private asset URLs or signed Drive URLs to repository files.

If future private content loading needs credentials, that work requires a separate design and authorization boundary; it is outside M8.0 Worker 5.

Official reference:

- https://developers.cloudflare.com/pages/configuration/build-configuration/

## 6. SPA fallback

Do **not** add a redundant `_redirects` catch-all only for SPA fallback at this stage.

Cloudflare Pages currently treats a deployment without a top-level `404.html` as a single-page application and routes unmatched navigation paths to the root application.

The current Vite build does not intentionally publish a top-level `404.html`.

If a future release adds a real `404.html`, re-check routing because that changes Pages' automatic SPA behavior.

Official reference:

- https://developers.cloudflare.com/pages/configuration/serving-pages/

## 7. Cache headers

Cloudflare Pages already provides CDN/browser cache behavior and recommends avoiding unnecessary custom cache rules.

For Vite-generated fingerprinted files under `/assets/*`, this branch adds:

`web/public/_headers`

with an immutable one-year browser-cache rule. Vite copies `public/` files into the production output, so Pages receives `dist/_headers`.

The rule is intentionally limited to fingerprinted Vite assets. It does not apply long-lived immutable caching to:

- `index.html`
- service workers
- Web App Manifest files
- future resource manifests
- private game asset packs

Official references:

- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/pages/configuration/serving-pages/

## 8. Wrangler

Wrangler is **not required** for this M8.0 Git-integrated Pages deployment path.

Therefore this worker does not add `wrangler.toml`, `wrangler.json`, or `wrangler.jsonc`.

If the project later needs Pages Functions, CLI-driven deployments or advanced Pages configuration, re-evaluate Wrangler from the then-current official documentation instead of pre-creating unused configuration.

Official references:

- https://developers.cloudflare.com/pages/get-started/git-integration/
- https://developers.cloudflare.com/pages/functions/wrangler-configuration/

## 9. Preview deployments

Expected behavior after a real Pages project is authorized and connected:

- pushes to the configured production branch update the production deployment;
- non-production branches can receive preview deployments;
- pull requests originating from the same connected repository can receive unique preview URLs;
- preview deployments do not replace the production deployment.

Cloudflare Pages currently sends `X-Robots-Tag: noindex` on preview URLs by default.

Official references:

- https://developers.cloudflare.com/pages/configuration/preview-deployments/
- https://developers.cloudflare.com/pages/configuration/serving-pages/

## 10. Private asset policy

The public Pages build must contain only repository-approved/public-safe assets.

The repository already ignores:

`web/public/game-data/`

That boundary must remain in place.

Do not:

- copy the full original client asset pack into Git;
- upload private Drive assets to Pages;
- embed signed/private download URLs in the build;
- change `.gitignore` to expose private generated packs;
- treat a private GitHub repository as proof that a Pages deployment is private.

Long-term private asset-pack delivery is a separate M8+ capability and requires its own authorization, storage and access-control design.

## 11. First-deployment authorization boundary

This branch intentionally stops before any external deployment action.

A later authorized first deployment may:

1. create/connect a Cloudflare Pages project;
2. select the GitHub repository;
3. set production branch to `main`;
4. set root directory to `web`;
5. set build command to `npm run build`;
6. set output directory to `dist`;
7. confirm no private asset pack is present;
8. inspect the first preview/production build before any custom-domain work.

Still requires separate authorization:

- Cloudflare login/account mutation;
- project creation;
- API token creation;
- DNS changes;
- custom-domain binding;
- paid resources;
- public upload of original/private game assets.

## 12. Local/repository validation contract

Worker 5 validates only the deployment artifact contract:

- locked dependency install;
- production Vite build;
- `dist/index.html` exists;
- `dist/_headers` exists;
- a normal static HTTP server can serve the root document;
- at least one generated `dist/assets/*` file can be fetched.

A dedicated branch-only GitHub Actions workflow performs this smoke in an environment that has repository checkout and dependency network access.

Full desktop/mobile/PWA acceptance remains Worker 6's responsibility.

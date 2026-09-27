# M8.1 Worker 4 — Cloudflare Pages Release / Public-safe Distribution

STATUS: **ENGINEERING IN PROGRESS / AWAITING_RELEASE_AUTHORIZATION**

- Baseline: `51907f41365edb4be393579f3814d8e23116dd6e`
- Branch: `codex/m8-1d-pages-release`
- PR base: `codex/m8-1-distribution-playtest-integration`
- Real Cloudflare deployment: **NOT AUTHORIZED**

## Scope

Worker 4 promotes the M8.0 Pages preparation into a release contract and CI gate without mutating a real Cloudflare account.

## Delivered

- M8.1 Pages production/preview branch contract.
- Build/release metadata emitted as `dist/release-metadata.json`.
- Update-safe cache headers for shell pointers, resource manifests and versioned payloads.
- Explicit public-safe Full Pack allowlist contract.
- Public release sanity scanner that rejects raw/original leakage and unlisted `.lapispak` files.
- GitHub release gate covering locked install, unit, production build, static fetch, metadata, manifest fetch and private-asset leakage checks.
- Deployment checklist and external authorization boundary.

## Files

- `.github/workflows/m8-1d-pages-release.yml`
- `docs/deployment/cloudflare-pages.md`
- `docs/integration/m8-1d-pages-release.md`
- `web/public/_headers`
- `web/release-public-assets.json`
- `web/scripts/release-metadata.ts`
- `web/scripts/release-sanity.ts`
- `web/tests/release-metadata.test.ts`
- `web/tests/release-sanity.test.ts`
- `web/vite.config.ts`

No changes are made to `m4-main.ts`, `pwa-shell.ts`, `service-worker.js`, `Plan.md`, `Backlog.md` or `AGENTS.md`.

## Public/private boundary

The default Full Pack allowlist is empty. A future public-safe pack must be explicitly listed with its versioned Resource Manifest. Private/original packs remain forbidden on public Pages.

## External status

`AWAITING_RELEASE_AUTHORIZATION`

No project, production URL, DNS record, token, secret or public private-asset upload is created by this worker.

## Validation

CI run and PR details will be appended after the branch workflow executes.

# M8.1 Worker 4 — Cloudflare Pages Release / Public-safe Distribution

STATUS: **ENGINEERING DONE / AWAITING_RELEASE_AUTHORIZATION**

- Baseline: `51907f41365edb4be393579f3814d8e23116dd6e`
- Branch: `codex/m8-1d-pages-release`
- PR: #81 — https://github.com/ViLeo06/lapis-rebuild/pull/81
- PR base: `codex/m8-1-distribution-playtest-integration`
- Validated implementation head: `66725e48e32c55775ff1f9181fd6571d818bd3f6`
- Release-gate run: `36298222660` — **SUCCESS**
- Real Cloudflare deployment: **NOT AUTHORIZED**

## Scope

Worker 4 promotes the M8.0 Pages preparation into a release contract and CI gate without mutating a real Cloudflare account.

## Delivered

- M8.1 Pages production/preview branch contract.
- Build/release metadata emitted as `dist/release-metadata.json`.
- Update-safe cache headers for shell pointers, resource manifests and versioned payloads.
- Explicit public-safe Full Pack allowlist contract.
- Public release sanity scanner that rejects raw/original leakage and unlisted `.lapispak` files.
- GitHub release gate covering locked install, unit, production build, static fetch, metadata, Resource Manifest fetch and private-asset leakage checks.
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

## Validation

GitHub Actions run `36298222660` passed all Worker 4 release gates on implementation head `66725e48e32c55775ff1f9181fd6571d818bd3f6`:

- locked `npm ci --ignore-scripts`: PASS
- unit tests: PASS
- production `npm run build` / typecheck: PASS
- public release artifact sanity: PASS
- `release-metadata.json` commit/channel validation: PASS
- static root fetch: PASS
- Web App Manifest fetch: PASS
- synthetic schema-1 Resource Manifest fetch: PASS
- generated Vite asset fetch: PASS
- required update-safe `_headers`: PASS
- private/original leakage and unlisted Full Pack rejection gate: PASS

The closing documentation commit is expected to rerun the same workflow; the PR should only be marked ready after that final head is green.

## Conflict audit

At the time of validation, integration branch `codex/m8-1-distribution-playtest-integration` was four commits ahead of the common baseline and changed only:

- `AGENTS.md`
- `Backlog.md`
- `Plan.md`
- `docs/integration/m8-1-kickoff.md`

Worker 4 does not modify those files. No direct file overlap was found.

## Public/private boundary

The default Full Pack allowlist is empty. A future public-safe pack must be explicitly listed with its versioned Resource Manifest. Private/original packs remain forbidden on public Pages.

Recommended public paths:

- `/distribution/manifests/<contentPack>/<version>/resource-manifest.json`
- `/distribution/packs/lapis-full-<contentPack>-<version>.lapispak`

Worker 1 owns the archive format and pack verifier. Main Integration should populate the public allowlist only for an explicitly approved public-safe pack.

## External status

`AWAITING_RELEASE_AUTHORIZATION`

No Cloudflare project, production URL, DNS record, token, secret or public private-asset upload is created by this worker. Do not report the Release/Human gate as PASS until a real Pages deployment is explicitly authorized and Worker 5/Main Integration completes the release + Android acceptance path.

## Handoff

Main Integration may merge PR #81 into `codex/m8-1-distribution-playtest-integration` after its final head is green, then wire Worker 1–3 distribution functionality against the documented release paths. Do not merge `main` from this Worker.

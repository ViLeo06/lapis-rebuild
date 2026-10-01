# M8.1 Worker 4 — Cloudflare Pages Release / Public-safe Distribution

STATUS: **CLOSEOUT ENGINEERING PASS / RELEASE AUTHORIZED / PAGES ACCOUNT CONNECTION PENDING**

- M8.1 closeout baseline: `cd1ce8d136d37357ce06720f9e0f7bc75c4c807c`
- Closeout branch: `codex/m8-1d-pages-release-closeout`
- Original Worker 4 branch: `codex/m8-1d-pages-release`
- Original PR: #81 — merged into `codex/m8-1-distribution-playtest-integration`
- PR base: `codex/m8-1-distribution-playtest-integration`
- Current integration PR: #77
- Current integration release-gate run: `36326945088` — **SUCCESS**
- Current distribution decision: **Cloudflare Pages shell + local Full Pack import**
- Cloudflare R2 / paid object-storage path: **ABANDONED by user decision**
- Real Pages URL: **NOT YET RECORDED**
- Human Android gate: **NOT-YET-ACCEPTED**

## Closeout scope

This recovery pass does not reimplement Worker 4. It verifies that the current M8.1 integration tree still satisfies the Pages/public-release contract after Workers 1–5 and distribution-runtime changes landed, and updates stale release documentation to the current approved distribution decision.

Worker 4 remains responsible for:

- Pages production/preview release contract;
- release metadata emitted by production builds;
- update-safe cache rules;
- public-safe release allowlist and leakage gate;
- static Pages/release smoke workflow;
- deployment checklist and release-status handoff.

## Current engineering result

The current integration baseline `cd1ce8d...` still passes **M8.1 Pages release gate**:

- run `36326945088`: SUCCESS;
- locked dependency install: PASS;
- unit suite: PASS;
- production build/typecheck: PASS;
- public release artifact sanity: PASS;
- release metadata validation: PASS;
- static root and generated asset fetch: PASS;
- Web App Manifest fetch: PASS;
- schema-1 Resource Manifest fetch: PASS;
- required update-safe headers: PASS;
- private/original leakage gate: PASS.

The integration tree also extends the original Worker 4 contract with:

- `/distribution/assets/*` immutable caching;
- public incremental-asset presence/size/SHA-256 validation;
- rejection of unlisted incremental assets.

These changes are already covered by the green current release gate and therefore do not require a Worker 4 code rewrite.

## Distribution decision now in force

The active M8.1 delivery model is:

1. **Cloudflare Pages** hosts only the public Web/PWA shell.
2. The private/original Full Pack is **not** hosted on public Pages.
3. First-run players import the verified Full Pack locally.
4. Imported resources live in the browser-local M8.1 AssetStore.
5. Incremental update/repair remains part of the M8.1 runtime contract.
6. Cloudflare R2 and other paid object-storage hosting are not part of the current plan.

The public-safe Full Pack allowlist remains empty unless a future pack is deliberately approved for public distribution.

## Files / ownership

Worker 4 owned or validates:

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

This closeout pass does not modify `m4-main.ts`, `pwa-shell.ts`, `service-worker.js`, `Plan.md`, `Backlog.md` or `AGENTS.md`.

## Public/private boundary

Public Pages must not contain private/original client resources.

The default public Full Pack allowlist remains empty. Any future public-safe pack must be explicitly allowlisted and must use the same Resource Manifest authority as the incremental asset tree.

Private/original Full Packs may use the Worker 1 archive format, but remain local/private and are imported by the player rather than published through Pages.

## External release status

The user explicitly authorized the M8.1 public web release path on **2026-09-27**. Therefore the old status `AWAITING_RELEASE_AUTHORIZATION` is obsolete.

Current status:

`RELEASE_AUTHORIZED / PAGES_ACCOUNT_CONNECTION_PENDING`

A production or preview Pages URL must not be claimed until the authenticated Cloudflare project/GitHub connection has actually produced a deployment and the deployed commit is verified.

No R2 dependency, Cloudflare token, secret, private/original asset upload, or production URL is introduced by this Worker.

## Remaining gate

Worker 4 engineering is ready for integration closeout. M8.1 as a whole is still not fully accepted until:

- a real Pages URL is connected and its deployed commit is verified;
- Main/acceptance smoke passes against that URL;
- the user completes the Android human playtest.

Do not merge `main` from this Worker.

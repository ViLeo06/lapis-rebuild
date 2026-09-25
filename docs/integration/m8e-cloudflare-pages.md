# M8.0 Worker 5 — Cloudflare Pages Deployment Preparation

STATUS: DONE

Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`  
Branch: `codex/m8e-cloudflare-pages`  
Head SHA: documentation closeout commit (see branch HEAD)  
PR: #70 — https://github.com/ViLeo06/lapis-rebuild/pull/70

## Scope
Prepare the existing standard multi-file Vite Web build for a later authorized Cloudflare Pages Git-integrated deployment. No real Cloudflare project, token, DNS/domain mutation, private-asset upload, or public deployment was performed.

## Completed
- Verified current Cloudflare Pages official documentation for GitHub integration, root/build/output settings, preview deployments, SPA fallback, headers/cache behavior, build-image Node.js support, and Wrangler boundaries.
- Confirmed the existing Vite build is already suitable for Pages and did not replace or wrap the build system.
- Documented the deployment contract in `docs/deployment/cloudflare-pages.md`.
- Defined intended Pages settings: root `web`, build command `npm run build`, output `dist`, production branch `main` when first deployment is separately authorized.
- Kept automatic Pages SPA fallback instead of adding a redundant catch-all redirect.
- Added `web/public/_headers` with immutable caching limited to Vite fingerprinted `/assets/*`.
- Added a focused Pages static-build smoke workflow that remains useful on integration PRs touching Web/deployment files.
- Confirmed the private generated pack boundary remains `web/public/game-data/` in `.gitignore`.
- Opened Draft PR #70 against `main`; no merge was performed.

## Files changed
- `.github/workflows/m8e-cloudflare-pages.yml`
- `docs/deployment/cloudflare-pages.md`
- `docs/integration/m8e-cloudflare-pages.md`
- `web/public/_headers`

No changes were made to `web/src/main.ts`, `web/src/scene.ts`, `web/src/battle.ts`, `Plan.md`, `Backlog.md`, or `AGENTS.md`.

## Tests run
### PASS — Pages targeted production/static smoke
GitHub Actions run: https://github.com/ViLeo06/lapis-rebuild/actions/runs/36129525802  
Tested head: `d71ae95b397241d2c3fa8586950eea04826ea5b0`

Passed:
- locked dependency install with Node 22.16.0;
- `npm run build` (includes TypeScript `tsc --noEmit` and Vite production build);
- `web/dist/index.html` exists;
- Vite copied `web/public/_headers` to `web/dist/_headers`;
- at least one generated `web/dist/assets/*` artifact exists;
- ordinary Python static HTTP server served the production `dist`;
- root document fetch succeeded;
- generated asset fetch succeeded;
- expected app mount and immutable cache header contract were present.

### Existing repository CI
A Web/parser validation run on the same tested head was started automatically by PR #70. Parser/fixture and build/typecheck/unit stages are covered by the repository workflow; the full Chromium/offline phase is not required for Worker 5 closeout and may continue/cancel as newer documentation-only PR heads are produced.

## Tests not run
- FULL PLATFORM E2E: NOT RUN to completion as a Worker 5 gate; this belongs to Worker 6 / main-session integration acceptance.
- PRIVATE-ORIGINAL: NOT RUN; Worker 5 does not require private original assets for a deployment-contract smoke.
- Real Cloudflare Pages deployment: NOT RUN by design and requires separate user authorization.

## Known limitations
- No Cloudflare account/project was created, so production/preview URLs are not claimed.
- No DNS, custom domain, Pages token, or Wrangler deployment was configured.
- No private/original game asset pack was uploaded or exposed.
- The ChatGPT execution container could not clone GitHub directly because outbound DNS was unavailable; exact repository build/static-server validation was therefore executed in GitHub Actions instead.

## Required integration hook
Main Session should review and integrate PR #70 with the other M8 workers. When a real first deployment is separately authorized, configure Cloudflare Pages with:
- Repository: `ViLeo06/lapis-rebuild`
- Production branch: `main`
- Root directory: `web`
- Build command: `npm run build`
- Output directory: `dist`

Before publishing, verify that the resulting `dist` contains only public/safe repository assets and no private game-data pack.

## Potential conflicts
- Low. Worker 5 only adds new deployment/CI/docs files plus `web/public/_headers`.
- Worker 2 may also add PWA files under `web/public/`; integration should preserve both unless it independently introduces `_headers`.
- Worker 6 may add platform-acceptance CI. Keep Worker 5's workflow focused on the production artifact/static hosting contract rather than duplicating Worker 6 tests.

## Auto Resume
- Resume 1: CREATED for T+30 minutes.
- Resume 2: NOT CREATED because the account had already reached the 10-active-task limit.
- AUTO_RESUME: PARTIAL
- Fallback used: NO; this was a capacity limit, not a cadence/frequency restriction.

## Next step
Main Session: review PR #70, conflict-audit it with Workers 1–4/6, then integrate into `codex/m8-0-web-platform-integration`. Do not create the real Cloudflare Pages project until separately authorized.

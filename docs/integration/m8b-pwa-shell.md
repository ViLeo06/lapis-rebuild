# M8.0 Worker 2 — PWA Shell / Offline App Shell

STATUS: DONE

Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`
Branch: `codex/m8b-pwa-shell`
Head SHA: `f3bf792`

Scope:
- Installable Web App manifest and safe SVG app icon.
- Native Service Worker App Shell cache with production registration.
- Offline restart after one successful online visit.
- Update discovery without `skipWaiting()` or forced page refresh.

Files changed:
- `web/index.html`
- `web/src/m4-main.ts`
- `web/src/pwa-shell.ts`
- `web/public/manifest.webmanifest`
- `web/public/service-worker.js`
- `web/public/icons/lapis-app.svg`
- `web/tests/pwa-shell.test.ts`

Tests run:
- `node --experimental-strip-types --test tests\\pwa-shell.test.ts` — PASS (3/3).
- `node .\\node_modules\\typescript\\bin\\tsc --noEmit` — PASS.
- `node .\\node_modules\\vite\\bin\\vite.js build` — PASS.
- Playwright/MS Edge offline smoke against Vite preview — PASS.

Tests not run:
- Full E2E suite: NOT RUN (reserved for integration/CI).

Known limitations:
- App Shell only; private `game-data` is intentionally not cached.
- Existing Vite JSON import-attribute warnings remain unrelated.
- Existing production JS chunk remains ~1.6 MB; this Worker does not redesign chunking.
- Windows npm lifecycle spawn is broken on this machine; validation used direct local CLI binaries after `npm ci --ignore-scripts`.

Required integration hook:
- Preserve the `src/m4-main.ts` import of `./pwa-shell.ts`.
- Worker 6 can consume the offline contract; no duplicate Service Worker implementation is needed.

Potential conflicts:
- `web/index.html` and `web/src/m4-main.ts` are likely integration touchpoints.

Next step:
- Main Session integrates Worker 2 with Workers 3/5/6, then runs full platform E2E and real mobile install checks.

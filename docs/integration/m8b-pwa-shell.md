# M8.0 Worker 2 — PWA Shell / Offline App Shell

STATUS: ACTIVE

Base SHA: `e1ed76ea34034865a678a65e67782575db4e1c3b`
Branch: `codex/m8b-pwa-shell`
Current HEAD: `e1ed76ea34034865a678a65e67782575db4e1c3b`

Completed:
- Confirmed current Web entry chain is `index.html -> src/m4-main.ts -> src/main.ts`.
- Confirmed Vite production build remains the target; no new PWA dependency planned.

In progress:
- Web App Manifest, install metadata, and safe app icon.
- Native Service Worker registration and app-shell cache.

Remaining:
- Targeted tests, production build, offline smoke, final note, PR.

Tests:
- Not run yet.

Next exact step:
- Add manifest/icon/service worker + registration on the real M4 bootstrap path.
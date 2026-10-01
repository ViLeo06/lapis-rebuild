# M8.1 Kickoff — Real Web Distribution & Playtest

Status: **ACTIVE**  
Started: **2026-09-27**  
Stable baseline: `main@51907f41365edb4be393579f3814d8e23116dd6e`  
Integration branch: `codex/m8-1-distribution-playtest-integration`

## Goal

Turn the M8.0 Mobile-first Web/PWA foundation into a player-facing distribution path with:

- fixed Web/PWA entry;
- Full Pack install for new players/new devices;
- incremental updates for already-installed devices;
- persistent browser AssetStore with verification and repair;
- public-safe Cloudflare Pages release contract;
- Android-first real-device acceptance.

Full Pack and incremental update must share one Resource Manifest / size / SHA-256 authority. Do not return to the historical giant standalone HTML as the primary delivery model.

## Workers

| Worker | Scope | Branch | Scheduled Tasks |
| --- | --- | --- | --- |
| W1 | Full Pack format / builder / verifier | `codex/m8-1a-full-pack-contract` | +30, +60 |
| W2 | AssetStore / incremental update / repair | `codex/m8-1b-incremental-asset-store` | +30, +60 |
| W3 | First-run / install / update UX | `codex/m8-1c-install-update-ux` | +30 |
| W4 | Cloudflare Pages release / public-safe distribution | `codex/m8-1d-pages-release` | +30, +60 |
| W5 | Distribution acceptance / E2E / real-device gate | `codex/m8-1e-distribution-acceptance` | +30, +60 |

All Worker PRs target the integration branch, not `main`.

## Main ownership / conflict map

Main Integration owns shared wiring and final conflict resolution for:

- `web/src/m4-main.ts`
- `web/src/pwa-shell.ts`
- `web/public/service-worker.js`
- `Plan.md`
- `Backlog.md`
- `AGENTS.md`

W1 owns pack contract/builder/verifier and any necessary backward-compatible ResourceManifest extension.

W2 owns AssetStore, installed-pack metadata, diff/update/repair transaction logic. SaveV2 semantics are out of scope.

W3 owns install/update player-facing UI modules and CSS, but not shared app entry wiring.

W4 owns Pages/release workflows, public-safe release metadata, cache/header/update policy and deployment docs.

W5 owns acceptance fixtures/tests/docs and does not duplicate W1-W4 production implementations.

## Required boundaries

- GitHub / CI / repository docs are the engineering source of truth.
- Workers must not use Desktop Commander, Remote Desktop Commander, or the user's local computer.
- Original installer / NeoDark.exe / unknown DLLs are not executed.
- Private/original assets are not committed to Git and are not automatically uploaded to public Pages.
- Public/safe and private/original packs may use the same pack format.
- Real Cloudflare project creation, GitHub connection, public deployment, DNS, paid resources, and publication of private/original assets require separate explicit authorization.
- If that authorization is absent, W4/W5 must report `AWAITING_RELEASE_AUTHORIZATION` rather than inventing a deployment URL or PASS.

## Integration order

1. W1 Full Pack contract
2. W2 AssetStore / Incremental
3. W3 Install / Update UX
4. W4 Pages Release
5. W5 Acceptance

Main Supervisor may integrate a Worker PR into the integration branch only when its DoD/CI/handoff is satisfied. It must never merge `main` without explicit authorization.

## Gates

### Engineering Gate

- typecheck
- unit tests
- production build
- Chromium / platform E2E
- PWA / offline
- Full Pack build/import/verification
- incremental update / rollback / repair
- mobile acceptance

### Distribution Gate

- new device can install a Full Pack;
- installed device fetches only changed/new assets;
- failed update preserves the last usable installed version;
- corrupt/missing resources can be selectively repaired;
- SaveV2 remains independent from asset updates.

### Release Gate

A real Pages URL must map to a verified deployed commit and contain no unauthorized private/original pack. Until separately authorized, this gate remains `AWAITING_RELEASE_AUTHORIZATION`.

### Human Gate

User completes Android real-device path:

1. open fixed URL;
2. first Full Pack install;
3. enter game;
4. open 15-stage training manager;
5. finish at least one battle;
6. save;
7. fully close;
8. reopen and load;
9. perform one incremental update;
10. verify the entire Full Pack was not re-downloaded;
11. disconnect network;
12. launch PWA offline.

Final state must explicitly distinguish `ENGINEERING-PASS`, `RELEASE-PASS/BLOCKED`, and `USER-ACCEPTED/NOT-YET-ACCEPTED`.

## Scheduled-task budget

Current plan uses the 10-slot budget:

- Main Supervisor hourly: 1
- W1-W5 +30: 5
- W1/W2/W4/W5 +60: 4
- total: 10 / 10

Worker one-time tasks are created by each Worker Session after the user assigns that Worker.

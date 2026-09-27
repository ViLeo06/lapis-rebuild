# M8.1 Worker 1 - Full Pack handoff

Worker: 1 only. Branch: `codex/m8-1a-full-pack-contract`.
Baseline: `51907f41365edb4be393579f3814d8e23116dd6e`.
PR: [#82](https://github.com/ViLeo06/lapis-rebuild/pull/82).
PR base: `codex/m8-1-distribution-playtest-integration`.
Status: **IMPLEMENTED / PACK_CI_PASS / WAITING_FULL_WEB_CI**.
The PR remains draft until the already-running full Web regression is checked.
This is NOT an M8.1 release/human acceptance claim.

## Delivered

- `web/src/distribution/full-pack.ts`: schema-1-compatible canonicalization, filename,
  path policy, bounded Blob reader, CRC/SHA verification, pinned identity/manifest,
  cancellation/progress, immutable verified assets. ZIP32 STORE only.
- `web/scripts/full-pack.ts` + `tools/write_lapispak.py`: deterministic stdlib ZIP writer,
  existing-manifest authority, private staging, verification-before-publication, no overwrite.
  Reject source symlinks and non-regular files/FIFOs without blocking on open.
- `web/scripts/full-pack-synthetic.ts`: reproducible generated-only fixture artifact.
- `web/tests/full-pack.test.ts` and `tests/fixtures/full-pack-fixture.ts`: 32 tests,
  independent ZIP fixtures, corruption/security/identity/determinism/builder checks.
- `web/e2e/m8-1a-full-pack-reader.spec.ts`: real browser module roundtrip and CRC rejection
  via test-only module routes; not the W5 installation/gameplay/offline gate.
- `.github/workflows/m8-1a-full-pack.yml`: locked install, typecheck, unit, production
  build, synthetic pack/report and isolated Chromium reader smoke with retained results.
- Format and public/private boundaries: `docs/contracts/m8-1-resource-pack.md`.

## Integration API (W2 / W3 / Main)

`verifyFullPack(file: Blob, options): Promise<VerifiedFullPack>`.
Supply the trusted `expectedManifest` (and/or expectedContentPack/expectedVersion).
Return: frozen schema-1 manifest, archiveBytes, `getAsset(path): Blob`.
Only after the promise resolves may W2 stage these blobs and atomically switch versions.
W2 still owns all AssetStore/update/repair logic. No installation or save writes occur here.

Progress: `{status: VERIFYING|VERIFIED, totalBytes, verifiedBytes, currentAsset?}`.
W3 maps stable FullPackError codes to readable messages. A progress callback is not an
install-complete signal. Cancellation uses AbortSignal. Incremental and Full Pack must
pin the SAME manifest. Inner hashes alone prove consistency, not producer authenticity.

Do not wire this through SaveV2. Main alone wires m4-main/pwa-shell/service-worker.
The builder changes only canonical serialization/order, never expected asset hashes.
Merge the FOUR added package.json script keys; do not overwrite other Workers' scripts.
There are no dependency or lockfile changes. Keep the .lapispak Git-ignore rule.

## Verified GitHub CI evidence (2026-09-27)

Implementation/hardening commit: `3b5fdd838402968ae228cb44ee105650041e67bd`.
Dedicated browser-CI commit: `42a649b7e4635c517c4aa046179e0b7b9be3e210`.
The difference between these commits is ONLY the W1 CI workflow (adds the isolated
Chromium smoke and its result artifact). This handoff update is documentation only.

### PASS: W1 Full Pack + real Chromium module gate

[Run 36298916398](https://github.com/ViLeo06/lapis-rebuild/actions/runs/36298916398)
completed **success** on `42a649b7e4635c517c4aa046179e0b7b9be3e210`.

| Check | Result |
| --- | --- |
| npm ci --ignore-scripts | PASS |
| Repository-locked typecheck | PASS |
| Full Pack Node unit tests | PASS: 32/32, no skips |
| Production build | PASS |
| Synthetic deterministic build -> verify | PASS |
| Corruption / wrong hash / wrong size / identity / traversal rejection | PASS |
| Symlink / FIFO / no-overwrite / failed staging cleanup | PASS |
| Real Chromium Blob reader smoke | PASS: 1 passed, 0 failed, 0 skipped, 0 flaky |

Retained artifacts (3-day retention; regenerate from this commit after expiration):
- `m8-1a-synthetic-full-pack`, artifact `10925137000`;
- `m8-1a-browser-reader-results`, artifact `10924902980`.

The browser JSON report was downloaded and checked: expected=1, unexpected=0,
skipped=0, flaky=0; the sole reader test passed.
Synthetic archive: `lapis-full-synthetic-safe-1.lapispak`, 925 bytes, two text/JSON assets.
SHA-256: `f327bd671b6261f92c3b1d67f41da5e4fc8386b20c040f059d0ac20060a8fbe8`.
The earlier CI artifact also matched the cloud-generated sample byte-for-byte.
This fixture is NOT a playable original-asset Full Pack.

### IN PROGRESS: full repository Web/parser regression

[Run 36298739353](https://github.com/ViLeo06/lapis-rebuild/actions/runs/36298739353)
tests `3b5fdd838402968ae228cb44ee105650041e67bd`.
At this handoff checkpoint:
- parser tests + synthetic game fixture: PASS;
- locked dependencies, typecheck, COMPLETE unit suite and production build: PASS;
- standalone synthetic preview: PASS;
- full Chromium integration/offline step: **IN_PROGRESS**, not recorded as PASS;
- private-original job: **SKIPPED**, not evidence of private-asset validation.

The earlier run on `ad1adef` was superseded by the source-safety fix; do not use it as
final full-regression evidence. Do not confuse the one-test browser reader smoke with
the complete repository E2E matrix.

### Additional cloud-sandbox checks (not Android evidence)

32 targeted Node checks and isolated strict TypeScript compilation passed before CI.
A separate generated-only scale probe verified 4,096 assets (1,539,197-byte archive)
and the last member successfully. The CLI accepted a pinned valid pack and returned
exit code 1 for the wrong expected version. These supplement, not replace, GitHub CI.

## Scope audit / boundaries

No changes to resource-manifest.ts, m4-main.ts, pwa-shell.ts, service-worker.js,
SaveStore/SaveV2, distribution UI, Cloudflare deployment, Plan.md, Backlog.md or AGENTS.md.
No Desktop Commander, Remote Desktop Commander or user local computer was used.
No private/original asset pack was fetched, built or published. No original executable ran.
No tokens, cookies or signed asset URLs were added. Public/private classification shares
the same format; neither classification triggers a public deployment.

v1 ceilings: 512 MiB archive, 128 MiB asset, 8 MiB manifest, 20,000 ZIP members.
ZIP64/DEFLATE are intentionally unsupported. Main must apply the documented limits and
trusted-target-manifest policy; this is not a generic ZIP extractor.

## Remaining action / recovery

1. Read the latest branch/PR and run `36298739353` before doing anything else.
2. If full Web regression passes, record its final result/artifact counts here and mark
   PR #82 ready for review. Do not rewrite the already-passing W1 implementation.
3. If it fails, read the failing job evidence; fix only W1-owned regressions or report
   a concrete unrelated blocker. Do not replace other Workers' implementations.
4. Compare any newer commits before reusing a CI result. CI pins the exact commits
   above; workflow-only/documentation-only deltas must remain explicit.

Scheduled +30/+60 one-shot recovery tasks are set. No additional loop/watchdog was made.
No main or integration merge is authorized or performed by W1.

W1 does not activate resources or fetch updates. Full integrated installation, incremental
update/repair, offline game boot and SaveV2 survival remain W2/Main/W5 acceptance.
Cloudflare release: AWAITING_RELEASE_AUTHORIZATION (outside W1).
Android human playtest: NOT-YET-ACCEPTED (outside W1).
Main must still run the final integrated tree and the release/human gates.

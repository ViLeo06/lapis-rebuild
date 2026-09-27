# M8.1 Worker 1 - Full Pack handoff

Worker: 1 only. Branch: `codex/m8-1a-full-pack-contract`.
Baseline: `51907f41365edb4be393579f3814d8e23116dd6e`.
PR base: `codex/m8-1-distribution-playtest-integration`.
Status: IMPLEMENTED; remote CI evidence pending at initial commit.

## Delivered

- `web/src/distribution/full-pack.ts`: schema-1-compatible canonicalization, filename,
  path policy, bounded Blob reader, CRC/SHA verification, pinned identity/manifest,
  cancellation/progress, immutable verified assets. ZIP32 STORE only.
- `web/scripts/full-pack.ts` + `tools/write_lapispak.py`: deterministic stdlib ZIP writer,
  existing-manifest authority, private staging, verification-before-publication, no overwrite.
- `web/scripts/full-pack-synthetic.ts`: reproducible generated-only fixture artifact.
- `web/tests/full-pack.test.ts` and `tests/fixtures/full-pack-fixture.ts`: 32 tests,
  independent ZIP fixtures, corruption/security/identity/determinism/builder checks.
- `web/e2e/m8-1a-full-pack-reader.spec.ts`: real browser module roundtrip and CRC rejection
  via test-only module routes; not the W5 installation/gameplay/offline gate.
- `.github/workflows/m8-1a-full-pack.yml`: locked install, typecheck, unit, build and
  synthetic-only pack/report artifact. Existing Web CI runs the full test/build/E2E tree.
- Format and boundaries: `docs/contracts/m8-1-resource-pack.md`.

## Integration API (W2 / W3 / Main)

`verifyFullPack(file: Blob, options): Promise<VerifiedFullPack>`.
Supply the trusted `expectedManifest` (and/or expectedContentPack/expectedVersion).
Return: frozen schema-1 manifest, archiveBytes, `getAsset(path): Blob`.
Only after the promise resolves may W2 stage these blobs and atomically switch versions.
W2 still owns all AssetStore/update/repair logic. No installation or save writes occur here.

Progress: `{status: VERIFYING|VERIFIED, totalBytes, verifiedBytes, currentAsset?}`.
W3 maps codes to readable messages. A progress callback is not an install-complete signal.
Cancellation uses AbortSignal. Incremental and Full Pack must pin the SAME manifest.

Do not wire this through SaveV2. Main alone wires m4-main/pwa-shell/service-worker.
Do not regenerate old assets or assume filename/inner-manifest hashes authenticate a pack.
The builder changes only canonical serialization/order, never expected asset hashes.

## Verification evidence

Cloud sandbox isolated checks against the baseline ResourceManifest API:
- runtime module strict TypeScript check (available compiler 5.8.3): PASS;
- 32 targeted Node tests: PASS (32/32, no skips);
- actual Python stdlib build -> TypeScript verify -> standard ZIP reader: PASS;
- deterministic bytes across input asset order and public/private declaration: PASS;
- missing/corrupt/incorrect SHA/size/identity/traversal rejection: PASS;
- source symlink, output publication, no-overwrite and staging cleanup: PASS.

Repository-locked typecheck, complete unit suite, production build and Chromium:
PENDING remote CI in this initial commit. Do not infer PASS from isolated checks.
No private/original asset pack was fetched, built or published. No original executable ran.

## Scope audit / remaining gates

No changes to resource-manifest.ts, m4-main.ts, pwa-shell.ts, service-worker.js,
SaveStore/SaveV2, distribution UI, Cloudflare deployment, Plan.md, Backlog.md or AGENTS.md.
Package scripts and .gitignore additions are W1 build/package hygiene.

W1 does not activate resources or fetch updates. Full integrated installation, incremental
update/repair, offline game boot and SaveV2 survival remain W2/Main/W5 acceptance.
Cloudflare release: AWAITING_RELEASE_AUTHORIZATION (outside W1).
Android human playtest: NOT-YET-ACCEPTED (outside W1).

Scheduled +30/+60 one-shot recovery tasks are set; check branch/PR/CI first and do not
reimplement. No main merge is authorized or performed. Final CI evidence will be recorded
on this branch/PR. Main should apply its own integration-tree and human/release gates.

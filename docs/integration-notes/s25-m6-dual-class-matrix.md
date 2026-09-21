# S25 — M6 Dual-class Matrix / Data Archaeology

Branch: `codex/s25-m6-dual-class-matrix`  
Baseline: `4aea5b81fa4cca00c9a80b3ff2389eb391c09b17`

## Delivered

- `manifests/m6-dual-class-ten-stage-matrix.json` — **single canonical machine-readable authority**.
- `docs/research/m6-dual-class-ten-stage-matrix.md` — 20-stage human-readable matrix.
- `docs/research/m6-dual-class-provenance.md` — provenance/evidence rules.
- `docs/research/m6-dual-class-gaps.md` — gap/boundary list.
- S26/S27/S28 handoff notes.
- `tools/probe_m6_dual_class_matrix.py` + parser tests.
- `.github/workflows/s25-m6-dual-class-matrix.yml` fixed-hash static-only verification.

## New S25 findings

1. `ability.atr` original header exposes `con/wis/str/dex/int/reg` plus m* pairs, not only HP/MP/hit. `dex` is preserved as such; AGI is not asserted.
2. `levelabl.atr` contributes 200 target rows with explicit authored EXP values and a `next_class_raw` chain covering all ten sword/wizard stages.
3. The transition chain is strong static evidence but server promotion trigger/eligibility remains outside the client proof boundary.
4. Exact column14→Magictbl joins recover ten stage-linked skill/magic records: 1101..1501 and 19101..19501.
5. 20 × 5 action slots × ANI/SPR = 200/200 visual files are present; Drive inventory and fresh fixed-hash extraction agree.
6. `itemtbl.atr` exposes equip position, equip level and ten class/category flags. Representative rows numerically line up with target `ability.cla` 0/9, but the consumer relation is still INFERRED.

## Evidence boundaries

**VERIFIED-STATIC-ORIGINAL:** fixed source hashes; target ability rows and field labels; levelabl rows/EXP/next_class raw values; 10 Magictbl joins and MP costs; target visual files; item schema/representative rows.

**RECOVERED_SECONDARY:** existing readiness interpretation of actic/atic/rtic/mtic; `_00/_01/_02` action names.

**INFERRED:** last levelabl row as promotion threshold; item class flag index mapped by `ability.cla`.

**SERVER-BOUNDARY / UNVERIFIED:** original promotion conditions, EXP/growth formula, complete skill roster/unlock conditions, final equipment eligibility/enforcement, quest/reward authority, damage formulas, MagicRes placement/blend, `_05` meaning.

## Validation

- local S25 probe parser tests: `3/3` pass before fixed-hash run.
- local canonical contract tests: `4/4` pass.
- GitHub Actions fixed-hash run `35476887492`: success.
- artifact `10593539733`, digest `sha256:6374e56df74bd9599f445309b76b26aaf9b6593ecf138da151a687a294e201e0`.
- source matrix SHA-256 `3b948fccfb34f9fcfa24938ba5f9335003a50da36daca35dd93bc15b2c07d136`.
- Drive cross-check: `client-files-verified-20260915.csv` SHA `ccef8ede9627a27f167c63d0896c32c006b12de49af068f466199808b2f849ce`, target visual inventory 200/200.

No copyrighted pixel/resource payload is committed. No new private preview was necessary; the CI artifact contains the generated metadata report only. Raw original assets remain under `lapis-rebuild-assets` / fixed-hash extraction flow.

## Integration contract

- S26: consume swordsman stage/data rows + exact skill refs; put promotion/growth/unlock rules behind `ReconstructionSwordsmanProgressionPolicy`.
- S27: same for wizard, preserving authored MP/Magic data and MagicRes boundary.
- S28: consume progression table and item schema/candidates; final world/quest/equipment authority is reconstruction policy.
- S29: preserve provenance into runtime diagnostics/acceptance; do not report M6 playability as restoration of old server formulas.

S25 does not modify `scene.ts`, `main.ts`, `battle.ts`, `Plan.md`, `Backlog.md`, or `docs/evidence-ledger.md`.


## Final fixed-hash generation checkpoint

- final static generation run: `35477353328` — success;
- generated canonical manifest commit: `26a40ac778b0d0210f15ee8b8682e9c1b87fc98a`;
- canonical manifest schema: `3`;
- authority marker: `S25_SINGLE_CANONICAL_DUAL_CLASS_MATRIX`;
- exact stage sets: swordsman 100..190 / wizard 109..199;
- exact linked Magictbl records: 10;
- visual contract cross-check: 200/200 target ANI/SPR files;
- server-boundary fields remain explicit in the committed manifest.

The generic repository CI is re-triggered from this final generated state; its run is reported in the S25 PR rather than being recursively written back into this note.


## Google Drive metadata report

- Folder: `lapis-rebuild-assets/30_parsed/tables/m6-s25-dual-class`
- Native Google Doc: `S25 M6 Dual-class Matrix - fixed-hash metadata report`
- Document URL: https://docs.google.com/document/d/1trvJ6stZSZnC1hcjowaaeCd7DWDmfymxsAXF6EChfMM/edit
- Scope: metadata/provenance only; no original copyrighted game asset payload is embedded.

# S35 — M7.1 Skill Evidence Integration Handoff

Branch: `codex/s35-m7-1-skill-evidence-matrix`  
Baseline: `main@6094aae3c4ff0a04af5dd4376f2b59b8b342d430`

## Delivered authority

- `manifests/m7-1-dual-class-skill-evidence.json`: 60 fixed-client rows, Lv1–Lv6 for the first five swordsman/wizard families.
- `docs/research/m7-1-dual-class-skill-evidence.md`: complete matrix, conflicts, historical corroboration and boundaries.
- `tools/probe_m7_1_dual_class_skill_evidence.py`: fixed-hash Magictbl verifier.
- `tests/parsers/test_m7_1_dual_class_skill_evidence.py`: machine acceptance for row count, per-field evidence, curves, conflicts and S25 exact Lv1 join.

## S36

Consume MP and raw calibration curves without reinterpreting columns as recovered server formulas. Main handoff: Strong Defence EA `20/25/30/35/40/50`, Burst EA `10/15/20/25/30/35` + EC `5/7/10/12/15/17`, Sacrifice EA `15/18/22/26/30/35`.

## S37

Consume exact Wizard Dist/Area/MP curves. Poison `TICK=12` is original, wall-clock mapping is not; `EC=tick count` remains unverified. Ash is Healing Block. Nature Force EB `20..70` must not become MP-per-hit; 2003 evidence says about `1–3 MP/hit`.

## S41

Use S35 only as provenance/data authority. Preserve evidence labels; no second skill table and no formula invention.

## Integration risks

1. The user workbook `职业技能基础值与效果.xlsx` was not available on current Files/Drive surfaces, so no cell-by-cell workbook diff is claimed. Explicit task-packet values were cross-checked against the stronger fixed-hash source.
2. All server arithmetic for EA/EB/EC, Time→seconds, resistance, stacking and exact duration remains bounded.
3. The 2003 poison article is version-sensitive: its first-hit/ongoing ratio is useful corroboration, but its “until death” duration must not override fixed-2.2 reconstruction policy.

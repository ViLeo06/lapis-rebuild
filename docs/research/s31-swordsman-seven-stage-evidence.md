# S31 — Swordsman Seven-stage Skill Evidence / 剑士前七阶段技能证据说明

Date: 2026-09-21  
Branch: `codex/s31-m7-swordsman-skills`  
M7 baseline: `main@1d592d0e2194567c5d7d863e6a48250407dabeb3`

## Scope

S31 implements the approved M7 Lv1–65 swordsman skill domain without modifying `main.ts`, `scene.ts`, `battle.ts`, Plan/Backlog/AGENTS or the evidence ledger. Runtime arithmetic in this branch is an offline reconstruction contract, not a claim that the retired retail server formulas were recovered.

The fixed original-client reference remains:

- `YBCS-Online-Setup-2.2.exe`
- SHA-256 `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88`
- static analysis only; S31 did not execute original EXE/DLL files.

## Evidence inputs

### Fixed-client / canonical project evidence

`manifests/m6-dual-class-ten-stage-matrix.json` and `docs/research/m6-dual-class-ten-stage-matrix.md` preserve the exact S25 fixed-hash joins. The Drive checkpoint `lapis-rebuild-assets/30_parsed/tables/m6-s25-dual-class/` records that the twenty target stage rows, 200 levelabl rows and ten exact levelabl-to-Magictbl joins were verified against the fixed client.

For the first five swordsman stages the canonical rows preserve:

| Stage | Skill | MP | High-level authored description | Evidence |
| --- | --- | ---: | --- | --- |
| B100 | `1101 重击` | 25 | strong sword attack causing stun | `VERIFIED-STATIC-ORIGINAL` |
| B110 | `1201 连砍` | 23 | attack twice consecutively | `VERIFIED-STATIC-ORIGINAL` |
| B120 | `1301 强防` | 20 | raise defence | `VERIFIED-STATIC-ORIGINAL` |
| B130 | `1401 爆发` | 20 | raise strength and life while lowering defence | `VERIFIED-STATIC-ORIGINAL` |
| B140 | `1501 舍身` | 20 | consume own life to raise attack | `VERIFIED-STATIC-ORIGINAL` |

This evidence does **not** prove the exact retail percentages, duration, status stacking, hit/stun chance, readiness cost, self-damage cadence or server damage arithmetic.

### 2003 mainland historical corroboration

The archived Sina game section supplies independent period evidence:

- 2003-05-20 Q&A states that level 6 is already the second profession stage. This supports the approved M7 stage boundary at Lv6, while the complete Lv6/16/26/... M7 axis remains project reconstruction policy.
- 2003-10-29 profession-balance article explicitly discusses swordsman players using `强防` and `爆发` together.
- 2003-11-11 player analysis calls out `强防` / `血爆` as characteristic swordsman combat tools.

References:

- `https://games.sina.com.cn/zhqu/yb/article/2003-05-20/7648.shtml`
- `https://games.sina.com.cn/z/yb/2003-10-28/60383.shtml`
- `https://games.sina.com.cn/z/yb/2003-11-10/66377.shtml`

These are historical corroboration only. They do not supply the M7 numeric curves.

### Stage 6 / 7 historical identities

The approved M7 archaeology contract records:

- Stage 6: `战斗命令 / 统帅`, high-level role = increased command range.
- Stage 7: `打晕 / 眩晕攻击`, low-damage high-control role.

They are tagged `VERIFIED-HISTORICAL` for identity/high-level role. The fixed S25 stage rows for B150/B160 contain zero in the stage-entry skill reference field, so S31 deliberately does **not** invent original numeric IDs. Runtime keys are `battle-command` and `stun-strike`; their original numeric IDs remain `UNVERIFIED`.

## Approved M7 skill-level policy

All rows below are `RECONSTRUCTION_POLICY` unless explicitly noted above.

| Skill | Unlock | Lv1 -> Lv6 reconstruction |
| --- | ---: | --- |
| 重击 | 1 | damage `1.35 -> 1.55`; stun `25% -> 35%`; readiness 6 |
| 连砍 | 6 | two independent hits, each `0.70 -> 0.80`; readiness 7 |
| 强防 | 16 | physical damage reduction `25% -> 50%`; 30 s; magic damage untouched; refresh/no stack |
| 瞬间爆发 | 26 | attack `+25% -> +50%`; max HP `+15% -> +30%`; physical incoming penalty `+25% -> +40%`; `25 -> 35 s` |
| 舍身 | 36 | 60 s; every 10 s self-cost `4/4/5/5/6/6`; floor 1 HP; attack `+15/+18/+22/+26/+30/+35%` |
| 战斗命令 | 46 | command range +2; readiness/action efficiency `+5% -> +10%`; 30 s |
| 打晕 | 56 | damage x0.75; normal stun `55% -> 75%`; boss stun `20% -> 30%`; readiness 8 |

The seven skills x six skill levels produce exactly **42** machine-readable skill-level states.

## Sacrifice evidence boundary

`ReconstructionSwordsmanSacrificePolicy` keeps three layers separate:

1. `VERIFIED-STATIC-ORIGINAL`: client row `1501` exists and says own life is consumed to raise attack.
2. `PLAYER_MEMORY`: approximately every 10 seconds, roughly 4–5 HP, and higher skill levels were not remembered as dramatically increasing the HP cost.
3. `RECONSTRUCTION_POLICY`: S31 adopts 60 seconds, 10-second ticks, `4/4/5/5/6/6` HP cost, floor 1 HP, and attack bonuses `15/18/22/26/30/35%`.

A fixed-client Magictbl parameter sequence matching `15/18/22/26/30/35` is useful calibration context, but S31 does **not** claim that the corresponding original field has been proven to mean attack percentage.

## Unified status model

S31 adds a reusable M7 status layer covering:

- stun / next-action block;
- physical-only damage reduction;
- attack multiplier;
- max-HP multiplier;
- incoming physical-damage penalty;
- periodic non-lethal self-damage;
- command-range modifier;
- readiness/action-efficiency modifier.

All status arithmetic is tagged `RECONSTRUCTION_POLICY`. Recasting a same-ID buff refreshes/replaces it rather than stacking copies.

## Server / unresolved boundaries

The following remain `SERVER-BOUNDARY` or `UNVERIFIED`:

- exact retail physical damage and defence formula;
- exact retail hit/stun probability and boss resistance;
- exact retail readiness cost/cooldown/status duration;
- exact retail stat application for 爆发 / 强防 / 舍身;
- exact retail skill-level curves;
- stage 6/7 original client numeric skill IDs;
- server-side skill unlock/skill-point predicates;
- server-side persistence of active combat buffs/debuffs.

S34 must not upgrade these merely because the reconstruction is playable or tests pass.

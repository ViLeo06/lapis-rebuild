# S30 - M7 Monster Catalog / Level / Difficulty Matrix

Date: 2026-09-21  
Branch: `codex/s30-m7-monster-difficulty-matrix`  
Baseline: `main@1d592d0e2194567c5d7d863e6a48250407dabeb3`

## Result

S30 defines a fixed-level, data-driven Lv1-65 monster foundation for M7. It replaces the design assumption of two generic training dummies with **19 combat archetypes** across all seven approved bands and exposes an exact 15-milestone candidate matrix for S33.

The catalog deliberately reuses the four S17 visual families that were actually reviewed from the fixed-hash 2.2 client. It does **not** pretend that 18 distinct historical species identities have been recovered.

- Combat archetypes: 19
- Original reviewed visual families used: `B4524`, `B4525`, `B4526`, `B4544`
- Bands: T1..T7 / Lv1-65
- Fixed-level rule: enabled
- Player-level enemy scaling: disabled
- Self-healing acceptance target: `m7-green-armored-renewer-l26`
- Elite: `m7-green-armored-elite-l55`, `m7-cyan-spectral-elite-l60`
- Boss: `m7-spectral-overseer-boss-l65`

## Sources reviewed

1. `Plan.md v3.5`, `AGENTS.md`, `Backlog.md`, `docs/evidence-ledger.md`.
2. S17 Monster Visual Recovery integration note and `manifests/s17-monster-visual-catalog.json`.
3. `manifests/story-battle-scenes.json`.
4. S19 Reconstruction Combat Balance integration note/runtime.
5. M6 S25-S29 integration notes, especially S29's final server-boundary statement.
6. `docs/research/external-web-research-20260918.md`.
7. Google Drive `lapis-rebuild-assets`, including the S17 private contact-sheet archive and existing parsed fixed-client material.

No original EXE or DLL was executed.

## Evidence boundary

### VERIFIED-STATIC-ORIGINAL

S17 recovered the client-side visual-model binding path and verified that the selected `B4524/B4525/B4526/B4544` resources exist in the fixed-hash 2.2 client. These four families were also manually reviewed in the private S17 contact sheets.

This proves the **resource families are original client resources**. It does not prove their retail species names or the training bindings below.

### RECONSTRUCTION_POLICY

The following are M7 offline design choices: descriptive monster identity/name; archetype-to-visual binding; level and all combat stats; movement/attack range; concrete AI archetype; DOT/control/heal/burst/support behavior; elite/boss classification; S33 candidate compositions; and dynamic difficulty hint thresholds.

All of these are grouped under `M7MonsterBalancePolicy`.

### SERVER-BOUNDARY

The checked client cannot establish: exact final retail physical/magic damage arithmetic; exact retired-server per-enemy stats or growth curves; exact retired-server enemy AI programs/payloads; authoritative field -> encounter roster binding; or authoritative retail reward/difficulty tuning.

The story battle manifest contains useful original structural/model-token evidence, but numeric model-token correlation is not upgraded into a retail monster identity or encounter mapping.

## Visual policy

S17 inventories 1,638 `Char/B<id>` families and 6,809 ANI resources, but only four monster-like families were manually reviewed and committed as sanitized S17 archetypes. S30 therefore reuses those four proven visual carriers instead of assigning unreviewed families invented morphology or names.

- visual resource existence -> `VERIFIED-STATIC-ORIGINAL`
- descriptive identity -> `RECONSTRUCTION_POLICY`
- archetype-to-visual binding -> `RECONSTRUCTION_POLICY`

A later archaeology pass can add more reviewed visual families without changing the S30 combat contract.

## Monster catalog

| ID | Lv | Band | Static tier | Traits | Visual |
| --- | ---: | --- | --- | --- | --- |
| `m7-green-sword-trainee-l2` | 2 | T1 | normal | melee | B4524 |
| `m7-blue-polearm-skirmisher-l5` | 5 | T1 | hard | melee / fast / high-attack-low-defense | B4525 |
| `m7-green-armored-guard-l6` | 6 | T2 | normal | melee / high-defense-low-attack / tank | B4526 |
| `m7-cyan-spectral-ranged-l10` | 10 | T2 | normal | ranged | B4544 |
| `m7-blue-polearm-venom-l15` | 15 | T2 | hard | melee / dot | B4525 |
| `m7-cyan-spectral-hexer-l16` | 16 | T3 | normal | ranged / magic | B4544 |
| `m7-green-sword-duelist-l22` | 22 | T3 | hard | melee / high-attack-low-defense | B4524 |
| `m7-green-armored-controller-l25` | 25 | T3 | hard | melee / control / tank | B4526 |
| `m7-green-armored-renewer-l26` | 26 | T4 | normal | melee / healer / tank | B4526 |
| `m7-cyan-spectral-binder-l32` | 32 | T4 | hard | ranged / magic / control | B4544 |
| `m7-blue-polearm-raider-l35` | 35 | T4 | hard | melee / fast / high-attack-low-defense | B4525 |
| `m7-green-armored-bulwark-l36` | 36 | T5 | normal | melee / tank / high-defense-low-attack | B4526 |
| `m7-cyan-spectral-venom-caster-l42` | 42 | T5 | hard | ranged / magic / dot | B4544 |
| `m7-green-sword-berserker-l45` | 45 | T5 | hard | melee / high-attack-low-defense | B4524 |
| `m7-cyan-spectral-support-l46` | 46 | T6 | normal | ranged / magic / control | B4544 |
| `m7-green-armored-elite-l55` | 55 | T6 | elite | melee / tank / control / elite | B4526 |
| `m7-cyan-spectral-elite-l56` | 56 | T7 | elite | ranged / magic / dot / control / elite | B4544 |
| `m7-spectral-overseer-boss-l65` | 65 | T7 | boss | ranged / magic / control / dot / boss | B4544 |

## Healing target for Wizard Ash

`m7-green-armored-renewer-l26` has a fixed reconstruction self-heal: 70 HP, 12-second cooldown, and `blockedByStatus: healingBlocked`. This gives S32/S34 a deterministic acceptance target for Wizard Stage 4 `19401 Ash`. It does not claim that B4526 historically had self-healing AI.

## Difficulty policy

Monster levels and numbers are immutable catalog data. `dynamicDifficultyHint(playerLevel, recommendedLevel)` is presentation-only:

- player delta >= +7 -> Easy
- delta >= -2 -> Normal
- delta >= -7 -> Hard
- otherwise -> Very Hard

The helper never rebuilds or scales a monster. S33 may use the label in UI, but must consume the catalog's fixed stats.

## Consumer contract

- TypeScript authority: `web/src/content/monsters/monster-archetype-catalog.ts`
- JSON mirror: `data/monsters/m7-monster-catalog.json`
- Matrix JSON: `data/monsters/m7-monster-difficulty-matrix.json`
- S33 handoff: `docs/integration-notes/s30-handoff-s33-training-camp.md`
- S34 integration note: `docs/integration-notes/s30-handoff-s34-m7-integration.md`
- tests: `web/tests/s30-monster-catalog.test.ts`

S30 intentionally does not modify `main.ts`, `scene.ts`, `battle.ts`, Plan/Backlog/AGENTS, or the evidence ledger.

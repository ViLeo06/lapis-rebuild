# S30 -> S33 handoff: M7 Training Camp monster candidates

Branch: `codex/s30-m7-monster-difficulty-matrix`  
Scope: data contract only; S33 owns the 15 Training Camp battles/UI/recovery/debug preset.

## Import contract

From `web/src/content/monsters/monster-archetype-catalog.ts` consume:

- `M7_MONSTER_ARCHETYPE_CATALOG`
- `M7_MONSTER_DIFFICULTY_MATRIX`
- `S33_TRAINING_MILESTONE_CANDIDATES`
- `dynamicDifficultyHint(playerLevel, recommendedLevel)`
- `M7_MONSTER_BALANCE_POLICY`

The JSON equivalents are in `data/monsters/`.

## Non-negotiable rule

Do **not** call an enemy builder with the current player level to recreate S30 monsters. Each S30 row already contains fixed `level / maxHp / maxMp / attack / defense / magicAttack / magicDefense / movementRange / attackRange / AI / abilities`.

The Easy/Normal/Hard/Very Hard helper is UI-only and must not mutate those fields.

## Approved 15-level candidate map

| Battle | Recommended Lv | Candidate monster IDs | Purpose |
| ---: | ---: | --- | --- |
| 1 | 2 | `m7-green-sword-trainee-l2` | Basic melee/readiness tutorial |
| 2 | 5 | `m7-blue-polearm-skirmisher-l5` | Stage 1 graduation: fast glass-cannon pressure |
| 3 | 6 | `m7-green-armored-guard-l6` | Stage 2 entry: high defense target |
| 4 | 10 | `m7-cyan-spectral-ranged-l10`, `m7-green-armored-guard-l6` | Mixed melee/ranged target priority |
| 5 | 15 | `m7-blue-polearm-venom-l15`, `m7-cyan-spectral-ranged-l10` | Stage 2 graduation: DOT plus ranged pressure |
| 6 | 16 | `m7-cyan-spectral-hexer-l16` | Stage 3 entry: magic defense check |
| 7 | 25 | `m7-green-sword-duelist-l22`, `m7-green-armored-controller-l25` | Stage 3 graduation: burst versus control |
| 8 | 26 | `m7-green-armored-renewer-l26` | Stage 4 entry and Ash/healingBlocked acceptance target |
| 9 | 35 | `m7-cyan-spectral-binder-l32`, `m7-blue-polearm-raider-l35` | Stage 4 graduation: ranged control plus fast pressure |
| 10 | 36 | `m7-green-armored-bulwark-l36` | Stage 5 entry: high-defense sustained target |
| 11 | 45 | `m7-cyan-spectral-venom-caster-l42`, `m7-green-sword-berserker-l45` | Stage 5 graduation: DOT plus burst management |
| 12 | 46 | `m7-cyan-spectral-support-l46` | Stage 6 entry: magic/control support target |
| 13 | 55 | `m7-green-armored-elite-l55`, `m7-cyan-spectral-support-l46` | Stage 6 graduation: elite tank plus support |
| 14 | 56 | `m7-blue-polearm-vanguard-l56` | Stage 7 standard fight: fast melee pressure |
| 15 | 65 | `m7-spectral-overseer-boss-l65`, `m7-cyan-spectral-elite-l60` | Stage 7 boss/composite systems test |

This is a candidate roster, not the final S33 encounter definition. S33 may adjust counts/formation/scene bindings while preserving fixed S30 monster stats and provenance.

## Visual contract

All S30 rows bind to existing reviewed S17 visuals:

- `monster-visual-001` -> B4524
- `monster-visual-002` -> B4525
- `monster-visual-003` -> B4526
- `monster-visual-004` -> B4544

The original resource is `VERIFIED-STATIC-ORIGINAL`; using it for a given M7 training archetype is `RECONSTRUCTION_POLICY`.

## Ash / healer acceptance

For `m7-green-armored-renewer-l26`:

- `recoveryCapability.kind = self-heal`
- `amount = 70`
- `cooldownSeconds = 12`
- `blockedByStatus = healingBlocked`

S33 should expose this monster in a battle reachable by Wizard Stage 4 testing. S32/S34 should ensure `19401 Ash` blocks the heal path while active.

## Scene binding

S30 does not bind these monsters to the 28 original story battle scenes. That binding belongs to S33 and remains `RECONSTRUCTION_POLICY`.

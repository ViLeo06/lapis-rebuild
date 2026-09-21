# S33 — M7 Training Camp / Recovery / Developer Preset — S34 Integration Note

## Scope

- Branch: `codex/s33-m7-training-recovery-debug`
- Baseline: `main@1d592d0e2194567c5d7d863e6a48250407dabeb3`
- Owner scope: S33 only.
- Shared documents intentionally untouched: `Plan.md`, `Backlog.md`, `AGENTS.md`, `docs/evidence-ledger.md`.
- Shared cores intentionally untouched: `web/src/main.ts`, `web/src/scene.ts`, `web/src/battle.ts`.
- Original `YBCS-Online-Setup-2.2.exe` / DLLs were not executed.

## Implemented contracts

### Approved M7 level axis

`web/src/training/m7-level-axis.ts` owns the S33 resolver:

| Stage | Level | Swordsman | Wizard |
|---|---:|---:|---:|
| 1 | 1–5 | B100 | B109 |
| 2 | 6–15 | B110 | B119 |
| 3 | 16–25 | B120 | B129 |
| 4 | 26–35 | B130 | B139 |
| 5 | 36–45 | B140 | B149 |
| 6 | 46–55 | B150 | B159 |
| 7 | 56–65 | B160 | B169 |

Promotion boundaries for the M7-focused resolver are exactly `6 / 16 / 26 / 36 / 46 / 56`.

### 15 training battle presets

Source: `web/src/training/m7-training-camp.ts`.

The scene rows below are backed by `manifests/story-battle-scenes.json` and therefore the scene identity itself is `VERIFIED-STATIC-ORIGINAL`. Binding a scene or monster role to a reconstruction training battle is `RECONSTRUCTION_POLICY`.

| # | Recommended | Fallback enemy | Stage | Target zone | Monster-role contract | S30 candidate IDs | Band |
|---:|---:|---:|---:|---:|---|---|---|
| 1 | 2 | 2 | 1 | 1 | melee×1 | `m7-green-sword-trainee-l2` | Normal |
| 2 | 5 | 5 | 1 | 3 | fast×1 | `m7-blue-polearm-skirmisher-l5` | Normal |
| 3 | 6 | 6 | 2 | 9 | tank×1 | `m7-green-armored-guard-l6` | Normal |
| 4 | 10 | 10 | 2 | 11 | ranged×1 / tank×1 | `m7-cyan-spectral-ranged-l10`, `m7-green-armored-guard-l6` | Normal |
| 5 | 15 | 15 | 2 | 13 | dot×1 / ranged×1 | `m7-blue-polearm-venom-l15`, `m7-cyan-spectral-ranged-l10` | Hard |
| 6 | 16 | 16 | 3 | 15 | magic×1 | `m7-cyan-spectral-hexer-l16` | Normal |
| 7 | 25 | 25 | 3 | 21 | melee×1 / control×1 | `m7-green-sword-duelist-l22`, `m7-green-armored-controller-l25` | Hard |
| 8 | 26 | 26 | 4 | 23 | healer×1 | `m7-green-armored-renewer-l26` | Hard |
| 9 | 35 | 35 | 4 | 31 | control×1 / fast×1 | `m7-cyan-spectral-binder-l32`, `m7-blue-polearm-raider-l35` | Hard |
| 10 | 36 | 36 | 5 | 41 | tank×1 | `m7-green-armored-bulwark-l36` | Hard |
| 11 | 45 | 45 | 5 | 51 | dot×1 / melee×1 | `m7-cyan-spectral-venom-caster-l42`, `m7-green-sword-berserker-l45` | Hard |
| 12 | 46 | 46 | 6 | 61 | magic×1 / control×1 | `m7-cyan-spectral-support-l46` | Hard |
| 13 | 55 | 55 | 6 | 71 | elite×1 / magic×1 | `m7-green-armored-elite-l55`, `m7-cyan-spectral-support-l46` | Elite |
| 14 | 56 | 56 | 7 | 81 | fast×1 | `m7-blue-polearm-vanguard-l56` | Elite |
| 15 | 65 | 65 | 7 | 91 | boss×1 / elite×1 | `m7-spectral-overseer-boss-l65`, `m7-cyan-spectral-elite-l60` | Boss |

S30 became available after the initial S33 preflight. S33 now consumes the exact candidate monster IDs from `docs/integration-notes/s30-handoff-s33-training-camp.md`; it still does **not** copy or rebuild S30 monster stats.

`reconstructionSetupForTrainingBattle()` uses `preset.fixedEnemyLevel` only as the current shared-core two-dummy fallback. Player level never changes it. After S34 injects the S30 roster, each S30 row's own fixed level/stats/AI/abilities are authoritative and must not be rescaled to this fallback scalar.

### Difficulty hint

`resolvePlayerDifficultyHint()` is presentation-only:

- player ≥ recommended + 7 → Easy
- player within -2..+5 → Normal
- player -3..-7 → Hard
- player ≤ recommended - 8 → Very Hard

Changing the hint does not mutate enemy level/stats.

### Infinite Training Recovery Policy

Source: `web/src/training/m7-recovery.ts`.

`InfiniteTrainingRecoveryPolicy`:

- HP: +200
- MP: +200
- readiness cost: 10
- item cost: 0
- use limit: unlimited
- provenance: `RECONSTRUCTION_POLICY`

Runtime/UI:

- keyboard `H` → HP recovery
- keyboard `M` → MP recovery
- touch/desktop buttons: `HP +200`, `MP +200`
- requires active battle + ready action slot
- full HP/MP rejects without consuming readiness
- clamps to max
- does not leave battle
- does not reset existing shield/mana/status state
- buttons are at least 44 px high in the S33 mobile CSS contract

### Developer Character Preset

Sources:

- `web/src/training/m7-developer-preset.ts`
- `web/src/ui/m7-training-camp.ts`
- production adapter in `web/src/m4-runtime-integration.ts`

Capabilities:

- profession selector: swordsman / wizard
- level input: 1–65
- exact M7 stage resolver
- quick levels: 1 / 6 / 16 / 26 / 36 / 46 / 56 / 65
- sets progression EXP consistently using the existing progression authority
- sets the corresponding B-stage ID
- fills HP/MP through the current combat profile
- picks first eligible owned weapon/armor under current M6 equipment rules
- exposes reconstruction debug skill-point budget `max(0, level - 1)`
- `Unlock all implemented skills` uses the first-seven-stage runtime skill provider and marks a Lv6 override contract

Debug persistence rule:

- Developer preset / all-skills override is runtime-only.
- `makeSave()` rejects a normal SaveV2 while either debug state is active.
- loading a normal save or creating a new profession clears S33 debug state.
- no SaveV2 schema field was added.

## S34 shared-core hooks required

### 1. Battle scene selection

Current `web/src/scene.ts` still does:

- `enterBattle()` → `OFFLINE_TRAINING_ENCOUNTER_AUTHORITY.resolve(... P.battleMapId)`
- `applyBattleEntry(...)` is private.

Therefore S33 can carry the 15 verified target zone IDs and can launch a battle with fixed balance, but it **cannot make the runtime use Zone 1/3/9/.../91** without violating the S33 shared-core boundary.

Recommended S34 patch:

- add a narrow public battle-entry hook, e.g. `enterBattle(entry?: BattleEntry)` or `setNextBattleEntry(entry)`
- default behavior must remain the existing Zone 0 training entry
- S34 maps `preset.battleZoneId` to an explicit reconstruction `BattleEntry`
- keep the mapping tagged `RECONSTRUCTION_POLICY`

### 2. S30 monster roster / visuals

Current shared core still hardcodes:

- `battle.ts beginBattle()`: two enemies
- `scene.ts ensureEnemyVisualActors()`: `dummy-melee -> 4524`, `dummy-ranged -> 4544`
- selected enemy defaults to `dummy-melee`

Recommended S34 patch:

- consume S30 monster catalog and difficulty matrix
- extend the reconstruction battle setup with an injected enemy roster
- have scene visuals bind roster monster IDs to S30 visual-family/resource bindings
- consume each preset's `candidateMonsterIds` against `M7_MONSTER_ARCHETYPE_CATALOG`
- preserve each S30 row's fixed stats/level/AI/abilities; do not rebuild them from player level or S33 fallback level
- use S33 role contracts as training-purpose metadata, not as a replacement stat authority
- do not rewrite S33's 15-level/scene/purpose table

Until that hook is merged, S33 runtime starts all 15 presets with the existing two-dummy shared-core roster. S33 does **not** claim monster-roster acceptance is complete.

### 3. S31/S32 skill-level runtime

Both upstream branches are now present and were re-checked after S33 preflight.

S31 public integration contracts include:

- `availableM7SwordsmanSkillKeys(level)`
- `createM7SwordsmanSkillProgression(level)`
- `createDeveloperM7SwordsmanSkillProgression()`
- `planM7SwordsmanSkillUse(...)`

S32 currently exposes:

- `M7_WIZARD_SKILL_KEYS`
- `m7WizardAllowedSkillKeys(level)`
- `createM7WizardSkillBook(level)`
- `developerM7WizardSkillBook(level)`
- `m7WizardSkillLevel(...)`
- status/runtime helpers in `wizard-seven-stage-runtime.ts`

S34 should:

- replace the current compatibility skill provider with these M7 providers after integrating S31/S32
- connect S33's `skillLevelOverride: 6` to the real developer skill books/progression rather than treating it as coefficient metadata
- preserve normal stage/skill-point legality outside debug
- keep developer books/overrides out of ordinary SaveV2
- retain S33's profession/level preset and UI; do not duplicate a second Developer Preset flow

S33 does not claim that its metadata field alone changes skill coefficients before those upstream runtime adapters are integrated.

### 4. Old M6 promotion buttons

The existing production `m6PromotionRuleForCharacter()` still represents the M6 ten-stage reconstruction cadence. S33 deliberately does not rewrite that shared progression contract.

For M7 final integration, S34 must ensure the **first seven stages** use the approved `6 / 16 / 26 / 36 / 46 / 56` player-facing cadence while preserving the M6 ten-stage capability outside the M7-focused path. Developer Preset already uses the approved M7 axis.

## Tests added

- `web/tests/s33-training-camp.test.ts`
  - exact 15 recommended levels
  - seven-stage coverage
  - multiple verified scene targets
  - role diversity including healer/elite/boss
  - exact S30 candidate monster IDs for all 15 battles
  - distinct candidate-roster compositions
  - fixed enemy level independent of player level
  - 15 Start actions rendered
- `web/tests/s33-training-recovery.test.ts`
  - HP +200
  - MP +200
  - max clamp
  - readiness cost 10
  - full resource does not consume readiness
  - not-ready rejection
  - unrelated battle state remains intact
- `web/tests/s33-developer-preset.test.ts`
  - 6/16/26/36/46/56 boundaries
  - both profession B-stage IDs
  - Lv6 debug override metadata
  - UI input/quick presets
- `web/e2e/s33-training-recovery-debug.spec.ts`
  - wizard Lv56 → B169 developer preset
  - debug Save button disabled
  - 412×915 touch viewport: 15 Start actions, recovery buttons, exit confirmation
  - real skill MP spend → MP Recovery → remains in battle

## Evidence boundaries

- Story battle scene structures: `VERIFIED-STATIC-ORIGINAL`.
- Training battle ↔ scene binding: `RECONSTRUCTION_POLICY`.
- S33 monster role contracts: `RECONSTRUCTION_POLICY`.
- Exact retail monster AI/stats and field→encounter mapping: `SERVER-BOUNDARY`.
- Infinite recovery actions: `RECONSTRUCTION_POLICY`.
- Developer preset, skill-point budget and debug override: `RECONSTRUCTION_POLICY`.
- No claim is made that the fixed client proves retail server monster scaling, reward balance, AI, or encounter routing.

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

| # | Recommended | Fixed enemy | Stage | Target zone | Monster-role contract | Band |
|---:|---:|---:|---:|---:|---|---|
| 1 | 2 | 2 | 1 | 1 | melee×1 | Normal |
| 2 | 5 | 5 | 1 | 3 | melee×1 / fast×1 | Normal |
| 3 | 6 | 6 | 2 | 9 | melee×1 / ranged×1 | Normal |
| 4 | 10 | 10 | 2 | 11 | fast×1 / ranged×1 | Normal |
| 5 | 15 | 15 | 2 | 13 | tank×1 / ranged×1 | Hard |
| 6 | 16 | 16 | 3 | 15 | tank×1 / melee×1 | Normal |
| 7 | 25 | 25 | 3 | 21 | dot×1 / ranged×1 | Hard |
| 8 | 26 | 26 | 4 | 23 | healer×1 / tank×1 | Hard |
| 9 | 35 | 35 | 4 | 31 | control×1 / fast×1 | Hard |
| 10 | 36 | 36 | 5 | 41 | magic×1 / tank×1 | Hard |
| 11 | 45 | 45 | 5 | 51 | dot×1 / magic×1 / ranged×1 | Hard |
| 12 | 46 | 46 | 6 | 61 | healer×1 / control×1 / tank×1 | Hard |
| 13 | 55 | 57 | 6 | 71 | elite×1 / magic×1 | Elite |
| 14 | 56 | 58 | 7 | 81 | elite×1 / healer×1 / ranged×1 | Elite |
| 15 | 65 | 70 | 7 | 91 | boss×1 / elite×1 / control×1 | Boss |

The preset stores **roles**, not S30 monster IDs. This is deliberate: S30 was not yet available at S33 preflight, so S33 does not invent cross-worker monster identities. S34 should map these role contracts to S30 `MonsterArchetypeCatalog` IDs.

`reconstructionSetupForTrainingBattle()` always uses `preset.fixedEnemyLevel`; player level only affects player stats and the UI difficulty hint. There is no S33 player-level enemy scaling.

### Difficulty hint

`resolvePlayerDifficultyHint()` is presentation-only:

- player ≥ recommended + 6 → Easy
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
- map S33 role contracts to concrete S30 monster IDs
- do not rewrite S33's 15-level/scene/purpose table

Until that hook is merged, S33 runtime starts all 15 presets with the existing two-dummy shared-core roster. S33 does **not** claim monster-roster acceptance is complete.

### 3. S31/S32 skill-level runtime

S33's Developer all-skills UI intentionally consumes the runtime skill provider. At preflight S31 was unavailable and S32 had only appeared as an upstream branch.

S34 should, after integrating S31/S32:

- make first-seven-stage runtime providers expose all implemented skills
- connect `skillLevelOverride: 6` to the S31/S32 data-driven skill-level state
- preserve normal stage/skill-point legality outside debug
- keep debug override out of ordinary SaveV2

S33 does not claim that its metadata field alone changes skill coefficients.

### 4. Old M6 promotion buttons

The existing production `m6PromotionRuleForCharacter()` still represents the M6 ten-stage reconstruction cadence. S33 deliberately does not rewrite that shared progression contract.

For M7 final integration, S34 must ensure the **first seven stages** use the approved `6 / 16 / 26 / 36 / 46 / 56` player-facing cadence while preserving the M6 ten-stage capability outside the M7-focused path. Developer Preset already uses the approved M7 axis.

## Tests added

- `web/tests/s33-training-camp.test.ts`
  - exact 15 recommended levels
  - seven-stage coverage
  - multiple verified scene targets
  - role diversity including healer/elite/boss
  - distinct battle compositions
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

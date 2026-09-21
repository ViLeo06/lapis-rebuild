# S31 — M7 Swordsman Seven-stage Skill Completion

Date: 2026-09-21  
Branch: `codex/s31-m7-swordsman-skills`  
Baseline: `main@1d592d0e2194567c5d7d863e6a48250407dabeb3`

## Status

S31 supplies the complete **data/status/runtime adapter layer** for the approved M7 swordsman Lv1–65 scope. Shared runtime core is intentionally not wired on this worker branch; S34 is the designated integration owner.

The base `Plan.md v3.5` still contains an older roadmap description for M7. Per the parallel-worker boundary, S31 does not edit Plan and treats the approved M7 Combat Content Expansion worker contract as the execution authority for this branch.

## Added files

- `web/src/classes/swordsman-seven-stage-skills.ts`
  - seven-stage Lv1–65 resolver;
  - seven-skill catalog;
  - 42 Lv1–Lv6 rows;
  - skill-point progression;
  - Developer all-skills-Lv6 override;
  - `ReconstructionSwordsmanSacrificePolicy`.
- `web/src/combat/m7-status-effects.ts`
  - shared status-effect representation and validation;
  - refresh/no-stack replacement;
  - time advancement + periodic self-damage;
  - physical damage / attack / max-HP / command-range / readiness modifiers;
  - next-action stun consumption.
- `web/src/classes/swordsman-seven-stage-runtime.ts`
  - skill action plans;
  - MP/readiness resource consumption;
  - self-buff application;
  - target-status conditional application;
  - burst current-HP/max-HP synchronization;
  - status time advancement.
- `web/src/classes/swordsman-seven-stage-save.ts`
  - isolated validated JSON-safe skill-level persistence payload for S34 SaveV2 integration.
- `manifests/m7-s31-swordsman-seven-stage-skills.json`
  - machine-readable seven-stage / 42-row export.
- `web/tests/s31-swordsman-seven-stage.test.ts`
  - S31 unit/contract acceptance.
- `docs/research/s31-swordsman-seven-stage-evidence.md`
  - evidence classification and server-boundary notes.

## Public S31 contracts for S34

### Stage / unlock

Use:

- `swordsmanM7StageForLevel(level)`
- `availableM7SwordsmanSkillKeys(level)`
- `createM7SwordsmanSkillProgression(level)`
- `investM7SwordsmanSkillPoint(...)`
- `createDeveloperM7SwordsmanSkillProgression()`

M7 stage bands are:

`1–5 / 6–15 / 16–25 / 26–35 / 36–45 / 46–55 / 56–65`.

Do not rewrite or delete the existing M6 ten-stage data just to achieve the M7 front-seven presentation. S34 should route the M7 combat/Developer UX through the M7 resolver and preserve the M6 ten-stage domain beyond this milestone.

### Battle action plan

Use:

`planM7SwordsmanSkillUse(skillKey, skillLevel, targetRank)`

The returned plan provides:

- MP cost;
- readiness cost;
- hit multipliers;
- whether multi-hit accuracy rolls are independent;
- optional self status;
- optional target stun status + chance.

The first five skills retain their fixed-client authored MP costs. Stage 6/7 MP/readiness values are explicit reconstruction policy.

### Status integration

S34 should tick timed effects using:

`advanceM7SwordsmanCombatState(state, elapsedMs)`

and consume stun immediately before a combatant action with:

`consumeM7BlockedAction(statuses)`.

Important semantics:

- Strong Defence reduces **physical only**, never magic.
- Burst raises attack and max HP, raises current HP by the temporary max-HP delta on cast, and adds an incoming physical-damage penalty.
- Burst and Sacrifice are different status IDs and can be balanced independently.
- Sacrifice is a 60 s buff with 10 s HP ticks and cannot reduce the actor below 1 HP by its own periodic cost.
- Battle Command exports command range and readiness/action-efficiency modifiers for future lieutenant/command systems.
- Stun Strike is lower damage and substantially higher control than Heavy Strike; boss stun chance is reduced.

### SaveV2

Current `M6SaveExtension` uses a strict field whitelist and `schema:1`. S31 deliberately does not smuggle skill state into quest fields or silently change the shared save schema.

Recommended S34 patch:

1. introduce an M7 save extension or explicitly version the existing M6 extension;
2. embed `S31SwordsmanSkillSavePayload` for swordsman profiles;
3. keep normal/debug profile provenance explicit;
4. validate skill levels against the player level on load;
5. do not persist active battle buffs unless S34 explicitly changes the existing field-only save boundary.

The isolated adapter already supplies:

- `createS31SwordsmanSkillSavePayload(...)`
- `validateS31SwordsmanSkillSavePayload(...)`
- `serializeS31SwordsmanSkillSavePayload(...)`
- `deserializeS31SwordsmanSkillSavePayload(...)`.

## Shared-core patch map for S34

S31 did **not** edit the following files.

### `web/src/battle.ts`

Recommended hook points:

- when a swordsman M7 skill is chosen, resolve the skill key + level and call `planM7SwordsmanSkillUse`;
- consume MP/readiness through the S31 adapter;
- route `hitMultipliers` through the existing S19 damage authority rather than introducing a second damage formula;
- apply target status after each required hit/accuracy decision;
- apply/tick self statuses through the shared M7 status layer;
- test stun before resolving the target's next action.

Do **not** convert `battle-command` or `stun-strike` into fabricated retail numeric IDs. They intentionally use internal keys because the fixed S25 B150/B160 stage-entry ID is zero.

### `web/src/main.ts` / UI

- normal mode: expose only stage-unlocked skills and their legal invested levels;
- Developer mode: call `createDeveloperM7SwordsmanSkillProgression()` for all seven at Lv6;
- label the override as Developer/Debug and keep it isolated from normal save rules.

### stage integration

The existing M6 progression module still carries the prior M6 ten-level promotion reconstruction. For M7 combat acceptance use the approved front-seven band resolver above. If S34 changes production promotion timing, it must do so centrally and ensure stages 8–10 remain reachable/consistent for the M6 ten-stage capability.

## Acceptance covered on S31

The S31 test file proves:

1. stage boundary resolution at every Lv5/6/15/16/25/26/35/36/45/46/55/56/65 edge;
2. cumulative unlocks for all seven skills;
3. 7 skills x 6 levels = 42 rows;
4. first-five fixed-client identity/MP evidence remains distinct from reconstructed numbers;
5. skill-point investment + Lv6 cap;
6. Developer all-skills-Lv6 override;
7. Heavy Strike vs Stun Strike tactical difference;
8. Double Slash two independent hits;
9. Strong Defence physical-only mitigation and refresh/no-stack;
10. Burst attack/max-HP/physical-risk behavior;
11. Sacrifice 60s/10s periodic non-lethal behavior;
12. Battle Command range/efficiency hook;
13. next-action stun consumption;
14. MP/readiness consumption;
15. isolated save round-trip and locked-skill rejection;
16. status input validation;
17. all 42 numeric rows remain `RECONSTRUCTION_POLICY`.

## Local validation before branch push

- Node 22 `--experimental-strip-types --test web/tests/s31-swordsman-seven-stage.test.ts`: **17 passed / 0 failed / 0 skipped**.
- `tsc --strict --noEmit` over the four new source modules: **passed**.

Repository CI is the authoritative second-layer result after push/PR.

## Evidence boundary

- first five fixed-client skill identity/name/MP/high-level description: `VERIFIED-STATIC-ORIGINAL`;
- late Stage 6/7 identity/high-level role: `VERIFIED-HISTORICAL` per approved archaeology contract;
- user recollection about Sacrifice periodic HP cost: `PLAYER_MEMORY` only;
- all S31 numeric behavior/timing/probability/readiness/status arithmetic: `RECONSTRUCTION_POLICY`;
- exact retired-server combat/status/unlock formulas: `SERVER-BOUNDARY`;
- fixed-client numeric IDs for Stage 6/7 skills: `UNVERIFIED`.

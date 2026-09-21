# S26 — M6 Swordsman Ten-stage Progression

Branch: `codex/s26-m6-swordsman-progression`  
Baseline: `main@4aea5b81fa4cca00c9a80b3ff2389eb391c09b17`  
Scope: independent S26 domain only; shared runtime integration is deferred to S29.

## Result

S26 turns the existing one-stage S11 swordsman slice into a ten-stage, data-driven domain for:

`100 → 110 → 120 → 130 → 140 → 150 → 160 → 170 → 180 → 190`

The implementation deliberately does **not** modify `main.ts`, `scene.ts`, `battle.ts`, `Plan.md`, `Backlog.md`, or `docs/evidence-ledger.md`.

S25 had not produced a handoff/matrix on its dedicated branch when S26 started, so S26 follows the M6 rule: preserve current verified data, isolate every missing retail rule behind an explicit reconstruction policy, and leave a stable interface for later S25 reconciliation.

## Delivered files

- `web/src/classes/swordsman-ten-stage.ts`
  - canonical ten-stage stage table adapter;
  - authored stats and stage identity;
  - verified visual-family/resource binding;
  - representative staged skills;
  - equipment eligibility adapter;
  - EXP consumption and legal promotion;
  - centralized `RECONSTRUCTION_SWORDSMAN_PROGRESSION_POLICY`.
- `web/src/classes/swordsman-save.ts`
  - SaveV2 stage persistence adapter;
  - validation-context expansion for all ten stage IDs;
  - no schema-version bump required.
- `web/tests/s26-swordsman-progression.test.ts`
  - ten-stage completeness/order;
  - visual bindings;
  - progression/promotion;
  - skills/MP;
  - equipment;
  - stat sanity;
  - SaveV2 round-trip;
  - M5.1 regression boundary.

## Canonical authored stage data

All values below come from the existing fixed-hash-derived `data/classes/swordsman.json`; S26 does not interpolate missing stats.

| Stage | Name | HP | MP | Move | Hit | Magic hit | Range | authored stage-entry skill |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 见习剑士 | 125 | 100 | 5 | 160 | 160 | 1 | 1101 |
| 110 | 剑士 | 137 | 105 | 5 | 160 | 160 | 1 | 1201 |
| 120 | 高级剑士 | 150 | 110 | 5 | 170 | 170 | 1 | 1301 |
| 130 | 剑术师范 | 162 | 115 | 5 | 170 | 170 | 1 | 1401 |
| 140 | 皇家剑士 | 175 | 120 | 5 | 180 | 180 | 1 | 1501 |
| 150 | 狂战士 | 187 | 125 | 5 | 180 | 180 | 1 | 0 |
| 160 | 大剑师 | 200 | 130 | 5 | 190 | 190 | 1 | 0 |
| 170 | 英雄 | 212 | 135 | 5 | 190 | 190 | 1 | 0 |
| 180 | 战神 | 225 | 140 | 5 | 200 | 200 | 1 | 0 |
| 190 | 传说战神 | 237 | 145 | 5 | 200 | 200 | 1 | 0 |

### Provenance

**VERIFIED-STATIC-ORIGINAL**

- the ten authored rows above;
- each stage's B-family identity;
- every `B100..B190 _00/_01/_02/_03/_05` ANI and matching SPR exists in the private fixed-hash 2.2 inventory;
- numeric action state 3 / `_03` is linked by S5 to the hit-reaction path;
- authored stage-entry skill IDs are preserved exactly.

Private source indexes used for the resource inventory:

- `lapis-rebuild-assets/30_parsed/animations/ani-index.csv`
- `lapis-rebuild-assets/30_parsed/tables/client-files-verified-20260915.csv`

No original binary/image resource is added to Git.

**RECOVERED_SECONDARY**

- the semantic labels `idle/move/attack-or-cast` for slots `_00/_01/_02`.

**UNVERIFIED**

- universal meaning of `_05`. S26 explicitly exports it as `unknown-special`, not death.

## ReconstructionSwordsmanProgressionPolicy

The retired server's actual promotion level, promotion quest/condition, stat-growth formula and reward logic are not recovered. S26 therefore centralizes the offline replacement in:

`RECONSTRUCTION_SWORDSMAN_PROGRESSION_POLICY.id = m6-swordsman-ten-stage-v1`

Default promotion gates:

| From | To | Required reconstructed level |
| ---: | ---: | ---: |
| 100 | 110 | 10 |
| 110 | 120 | 20 |
| 120 | 130 | 30 |
| 130 | 140 | 40 |
| 140 | 150 | 50 |
| 150 | 160 | 60 |
| 160 | 170 | 70 |
| 170 | 180 | 80 |
| 180 | 190 | 90 |

Every row above is **RECONSTRUCTION_POLICY**. It is not a claim about mainland 2.2 retail promotion levels.

The policy consumes the existing S12 reconstruction EXP authority rather than introducing a second EXP curve.

## Skills

S26 only exposes staged availability for S11 skills that already have complete authored skill definitions:

| Skill | Authored MP | S26 availability begins | Availability provenance |
| ---: | ---: | ---: | --- |
| 1101 | 25 | stage 100 | RECONSTRUCTION_POLICY |
| 1201 | 23 | stage 110 | RECONSTRUCTION_POLICY |
| 1301 | 20 | stage 120 | RECONSTRUCTION_POLICY |

Important separation:

- MP cost is authored table data already preserved by S11.
- Stage availability is reconstruction policy.
- stage 130 and 140 preserve authored entry references `1401` and `1501`, but S26 does **not** fabricate playable definitions for them because the current S11 `mvp.json` contract does not include their full Magictbl/Magicptn data.
- exact retail unlock level/quest/eligibility remains `SERVER-BOUNDARY / UNVERIFIED` until stronger evidence arrives.

## Equipment

Current repository content has three swordsman-compatible training items:

- weapon: item 1, item 3;
- armor: item 25.

The item rows/text are retail-derived, but the `training.role/training.slot` compatibility mapping is reconstruction data. S26 therefore:

- accepts these items at all ten swordsman stages;
- rejects the current wizard items;
- makes **no stage-specific equipment restriction claim**;
- preserves ownership when promotion reconciles equipped items.

A future S25 matrix can replace this resolver without changing the S26 stage/progression API.

## SaveV2 contract

No new SaveV2 schema field is necessary for S26.

The existing `character` field already stores a numeric character/stage ID as a string. S26 uses:

- `"100"` ... `"190"` for the current swordsman stage;
- existing `progression` for level/EXP;
- existing `inventory.equipped` for equipment.

Representative skill availability is derived deterministically from stage + the named reconstruction policy, so no duplicate skill list is serialized.

`withSwordsmanSaveStages()` expands a normal M5.1 validation context to all ten swordsman IDs. Therefore:

- old M5.1 SaveV2 with `character:"100"` remains valid;
- S26 saves can restore the same stage, progression and equipment;
- SaveV2 stays version 2 on this branch;
- any broader M6 schema additions owned by S28/S29 remain independent.

## Stable handoff API for S29

S29 may consume these without copying S26 internals:

- `SWORDSMAN_STAGE_IDS`
- `SWORDSMAN_STAGES`
- `swordsmanStageById(stageId)`
- `availableSwordsmanSkillIds(stageId)`
- `swordsmanSkillAvailable(stageId, skillId)`
- `swordsmanSkillMpCost(skillId)`
- `swordsmanEligibleEquipmentIds(stageId)`
- `createInitialSwordsmanState()`
- `applySwordsmanExperience()`
- `promotionRequirementForStage()`
- `canPromoteSwordsman()`
- `promoteSwordsman()`
- `withSwordsmanSaveStages()`
- `applySwordsmanStateToSaveV2()`
- `restoreSwordsmanStateFromSaveV2()`

### S29 glue still required

S26 intentionally does not wire:

- Phaser scene/UI stage selection;
- battle skill buttons;
- visual asset loading for stages beyond the current player runtime;
- quest/promotion triggers;
- final shared SaveV2 M6 extensions;
- desktop/mobile integration.

Those shared runtime changes belong to S29 after S25–S28 handoffs stabilize.

## Evidence boundaries / gaps

Still **SERVER-BOUNDARY / UNVERIFIED**:

- original promotion levels;
- original promotion quest or NPC predicates;
- exact stat-growth formula between/within stages;
- exact skill unlock predicates;
- exact reward schedule;
- stage-specific equipment requirements not represented by recoverable client evidence;
- server-side damage/hit/critical/defence formula.

S3's server-authority boundary remains unchanged; S26 does not derive damage from the authored HP/MP/hit fields.

## Regression boundary

The existing S11 `playableClassById(100)` still exposes its original three-skill M5.1 showcase contract. S26 adds a separate staged adapter instead of changing that shared runtime contract during the parallel M6 round. This allows S29 to integrate S26 deliberately without silently changing the already user-accepted M5.1 path.

## Validation contract

The new unit suite is included in the normal `npm test` glob and is designed to prove:

1. all 10 stage IDs and authored rows are complete/in order;
2. all five action-resource bindings exist in the stage contract;
3. legal progression can advance 100→190 only through the progression authority + promotion API;
4. early/over-max promotion is rejected;
5. representative skill legality and MP costs are correct;
6. current swordsman equipment legality is stable at every stage;
7. SaveV2 round-trip restores stage/progression/equipment/derived skills;
8. the existing M5.1 S11 contract remains unchanged.

Repository CI remains responsible for full `npm test`, `npm run typecheck`, production build and browser/offline regressions. No new browser harness is added because this PR intentionally does not touch player-facing runtime glue.

# S28 — M6 World / Quest / Equipment Expansion

Status: implementation complete on `codex/s28-m6-world-progression-content`; final branch validation and PR gate recorded below.

Baseline: `main@4aea5b81fa4cca00c9a80b3ff2389eb391c09b17`.

Plan: `Plan.md v3.4`.

## Scope

S28 adds a data-driven offline world/progression content layer for M6 without taking ownership of S26/S27 class runtime or S29 shared runtime integration.

The implementation deliberately does **not** modify:

- `web/src/scene.ts`
- `web/src/main.ts`
- `web/src/battle.ts`
- `Plan.md`
- `Backlog.md`
- `docs/evidence-ledger.md`

S25/S26/S27 integration notes were not present on their dedicated branches when S28 implementation started, so this branch uses injected contracts and current-main evidence rather than duplicating their future implementations.

## Deliverables

### Progression / receipts / promotion

- `web/src/progression/m6-stage-promotion.ts`
  - generic stage tracks;
  - adjacent-stage-only transition guard;
  - replaceable promotion requirements;
  - quest flag / completed quest / item / minimum-level predicates;
  - persisted promotion receipts;
  - idempotent replay behavior.
- `web/src/progression/m6-growth-authority.ts`
  - composes S12 reward receipts, M6 quest chain, promotion, inventory capacity and equipment;
  - shared contract works for both swordsman and wizard;
  - battle rewards remain a separate receipt-bearing operation from quest objective progress.

No retail promotion level, promotion quest, attribute-growth formula or server reward is asserted by this layer.

### Inventory / equipment

- `web/src/progression/m6-inventory.ts`
  - explicit inventory policy interface;
  - total quantity / item-type capacity validation;
  - default capacity is a **technical reconstruction guardrail**, not recovered retail bag capacity.
- `web/src/progression/m6-equipment.ts`
  - `weapon | armor | accessory` loadout model;
  - class-family, stage and level eligibility;
  - stat-contribution adapter;
  - illegal equipment rejection;
  - promotion-time reconciliation;
  - `legacyTrainingEquipmentRules()` adapter for current M5.1 catalog.

Important boundary: current `data/items/training-catalog.json` proves item records/names/descriptions from the fixed client, but its training role/slot/bonus compatibility layer is not sufficient evidence for retail class/stage/level eligibility. The legacy adapter therefore preserves `UNVERIFIED` / `SERVER-BOUNDARY` labels instead of promoting those fields to original facts.

Accessory is supported structurally. S28 does not invent an accessory item or retail accessory restriction where the current stable catalog has none.

### Data-driven quest chain

- `web/src/world/m6-quest-chain.ts`
  - prerequisites by completed quest and flag;
  - lifecycle: `locked -> available -> active -> ready_to_turn_in -> complete`;
  - battle objectives;
  - item-ownership objectives;
  - NPC objectives;
  - explicit NPC turn-in;
  - deterministic quest reward receipt;
  - completion flag;
  - optional promotion-rule trigger;
  - cycle, stale definition and malformed-save checks.

S23 explicit dialogue choice remains the intended UI front end. S28 does not reintroduce automatic NPC acceptance or automatic turn-in.

### World progression

- `web/src/world/m6-progression-gates.ts`
  - quest/flag/level/stage gates for:
    - scene transitions;
    - NPC interaction;
    - encounter carriers.

This is intentionally a gate contract only. It does not fabricate retail map exits, NPC coordinates or map-to-battle bindings. S18 remains the spatial transition controller and S29 owns final runtime glue.

### SaveV2 extension / migration

- `web/src/progression/m6-save-extension.ts`
- `web/src/progression/m6-save-migration.ts`
- small compatible extension to `web/src/progression/save-schema.ts`

Save schema remains `SaveV2`. M6 adds an optional strict `m6` extension:

- extension schema = `1`;
- class family;
- stage state + promotion receipts;
- M6 quest-chain state;
- M6 equipment loadout;
- explicit `RECONSTRUCTION_POLICY` provenance.

`migrateSaveToM6()` first calls the existing S7/S12 migration and then materializes M6 state.

Compatibility properties:

- old M5.1 SaveV2 continues to load;
- S7 v1 continues to migrate through existing code and can then be upgraded to M6;
- legacy `quest`, gold, inventory, progression, reward receipts and map state are preserved;
- unknown M6 extension fields fail closed;
- future unknown M6 extension schema fails closed;
- S29 can adopt the M6 migration entry point without forcing S28 to edit the current M5.1 runtime.

The old `inventory.equipped.weapon/armor` representation is intentionally left intact for M5.1 compatibility. M6 equipment is persisted in the extension, including the accessory slot. S29 must synchronize the final UI/runtime projection when M6 is integrated.

### Machine-readable handoff

- `manifests/m6-s28-world-progression-contract.json`

This records the stable module entry points, save extension, supported objectives/gates and server-boundary list for S29.

## Representative synthetic chain

`web/tests/s28-m6-world-progression-content.test.ts` proves the same S28 authority can drive both families.

For each family the test performs:

`create -> accept battle quest -> win objective -> explicit turn-in -> reward/EXP/item -> level-up -> equip upgrade -> accept gated promotion quest -> item objective -> NPC objective -> explicit turn-in -> reward -> promotion -> world gate -> Save -> Reload`

The test uses:

- swordsman track IDs `100..190` by the M6 target sequence;
- wizard track IDs `109..199` by the M6 target sequence;
- only the first transition is exercised by S28;
- the stage/promotion conditions in the test are synthetic reconstruction policy, not claimed retail conditions.

S26/S27 remain responsible for their real ten-stage domain tables and progression policy. S28 only proves that both can consume one world/progression contract.

## Idempotency / transaction behavior

### Rewards

S12 `rewardReceipts` remains the authority for battle and quest reward deduplication.

Quest reward receipt form:

`quest:<chain-id>:<quest-id>:turn-in`

A retry after a reward receipt exists does not duplicate gold, EXP or items.

### Promotion

Promotion has a separate persisted receipt:

`promotion:<track-id>:<promotion-rule-id>`

A replay never regresses a later stage.

### Quest completion

The growth authority computes reward, quest completion and promotion as immutable candidates. If a required promotion predicate is blocked, it returns the original state rather than partially committing the reward/quest transition.

This is an offline reconstruction transaction model. It is not a claim about the historical server transaction implementation.

## Evidence boundary

### VERIFIED / VERIFIED-STATIC-ORIGINAL inputs retained

- S12 SaveV2 engineering behavior and existing migration contract.
- Fixed-client item table records already represented by the training catalog where the catalog labels them `VERIFIED`.
- M6 target class/stage IDs supplied by the project plan are accepted as identities; S28 does not infer retail promotion requirements from numeric adjacency.

### RECONSTRUCTION_POLICY

- inventory gameplay capacity;
- class/stage/level equipment eligibility when not supplied by later canonical evidence;
- equipment stat contribution policy;
- quest prerequisites;
- battle/item/NPC objective rules;
- quest reward values;
- completion flags;
- promotion requirements;
- world progression gates;
- offline transaction authority.

### SERVER-BOUNDARY

Per S4 and the existing evidence ledger, S28 does not claim recovery of:

- retail quest eligibility;
- server-selected Quest step authority;
- retail reward values;
- retail warp destination decision;
- retail encounter decision;
- retail promotion level/condition;
- retail class/stage/level equipment eligibility;
- server-side derived stats or growth formula.

### Historical / secondary research

The Google Drive `lapis-rebuild-assets` research material was reviewed read-only. The 2026-09-18 research report contains later-region/historical clues about task prerequisites, facilities and equipment/drop observations. None of those were promoted into mainland 2.2 runtime facts in S28.

No new private original asset or private report was generated by S28, so Google Drive was not modified.

## Reconstruction policy list

The following values must remain replaceable and centralized:

1. inventory gameplay capacity;
2. equipment class/stage/level restrictions not backed by canonical matrix evidence;
3. equipment stat contribution mapping;
4. quest prerequisite graph;
5. objective counts and target bindings;
6. reward bundles;
7. completion flags;
8. promotion level/quest/item predicates;
9. multi-map availability gates;
10. NPC/transition/encounter bindings.

Do not hard-code these policies into UI, `scene.ts` or `battle.ts`.

## S25 handoff

When S25 publishes the canonical matrix:

1. convert proven item restrictions into `M6EquipmentRule` entries with their exact provenance;
2. replace `legacyTrainingEquipmentRules()` where stronger evidence exists;
3. leave missing stage/level eligibility as `SERVER-BOUNDARY` or an explicit reconstruction policy;
4. do not infer eligibility from nearby IDs or later-version similarity.

## S26 handoff

S26 can provide a swordsman `M6StageTrack`, class-specific equipment rules and its own progression/promotion policy.

S28 does not require the swordsman policy to use the synthetic test conditions.

Stable consumer surfaces:

- `ReconstructionM6GrowthAuthority`
- `M6StageTrack`
- `M6PromotionRequirement`
- `M6EquipmentRule`
- `M6QuestChainDefinition`

## S27 handoff

S27 uses the same surfaces for wizard.

S28 imposes no magic/MP/readiness rule. Those remain S27/battle-domain responsibilities; the world layer only carries progression, quest, equipment and persistence state.

## S29 integration contract

Recommended integration order after S25-S27 stabilize:

1. Build one swordsman and one wizard `M6StageTrack` from S26/S27.
2. Build evidence-labelled equipment rules from S25 plus S26/S27 class policy.
3. Instantiate M6 quest definitions and promotion rules in content data, not UI code.
4. On new character, create the growth authority state.
5. On load, use `migrateSaveToM6()` and validate against current content contracts.
6. Route explicit S23 NPC choices into `acceptQuest()` / `turnInQuest()`.
7. On battle victory:
   - record the battle objective;
   - apply any battle reward through the receipt-bearing battle reward API.
8. On inventory changes, emit the relevant item-objective event.
9. On qualifying NPC interactions, emit the NPC-objective event.
10. Before S18 transition, NPC activation or encounter start, evaluate the corresponding M6 world gate.
11. After promotion, use the returned reconciled equipment loadout; never leave newly illegal equipment active.
12. Persist `m6` in SaveV2.
13. Synchronize the M6 loadout to the legacy runtime inventory projection until S29 replaces that projection.
14. Keep current desktop/mobile input behavior; S28 introduces no input path.

## Known gaps for S29 / later archaeology

- No retail inventory slot count has been recovered.
- No retail accessory item binding is asserted here.
- Item-objective semantics currently mean “ownership observed”; item consumption on turn-in needs an explicit policy if required.
- No retail promotion requirement is recovered.
- No retail multi-map progression binding is invented.
- No class runtime/UI/battle glue is included.
- S25/S26/S27 outputs still need to replace the injected synthetic/legacy adapters before final M6 acceptance.
- Final M6 private-original validation and wall-clock soak belong to S29.

## Validation

S28 branch CI runs the repository's normal synthetic gate:

- parser tests;
- TypeScript typecheck;
- Node unit tests, including the S28 synthetic chain;
- production build;
- standalone synthetic preview;
- Chromium integration/offline tests.

Early CI iterations found and fixed:
- two strict TypeScript callback annotations in the new quest-chain module;
- one test expectation where both independent equipment rejection reasons were correctly returned.

Final passing run / PR check is recorded in the S28 PR description before closeout.

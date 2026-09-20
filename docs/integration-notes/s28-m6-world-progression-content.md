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

S25/S26/S27 integration notes were not present when S28 implementation started. Before closeout, S25 and S26 became available and were read/reconciled; S27 was still unavailable. S28 therefore now consumes S25 evidence through an explicit adapter and aligns its generic stage contract with S26's stable handoff, while retaining injected interfaces so no parallel implementation is copied.

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

### Canonical evidence adapter

- `web/src/progression/m6-canonical-evidence-adapter.ts`
  - consumes S25 canonical stage rows without turning `next_class_raw` into a retail promotion rule;
  - preserves authored EXP / `next_class_raw` as `VERIFIED-STATIC-ORIGINAL` inputs;
  - converts S25 representative item evidence into S28 equipment candidates only through an explicit reconstruction adapter;
  - keeps raw `equip_level` and class flags separate from offline enforcement authority.

This adapter is intentionally data-injected instead of importing S25's branch file directly. After S25 is integrated into main, S29 can pass `manifests/m6-dual-class-ten-stage-matrix.json` records through this adapter without creating a second canonical matrix.

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

Important boundary: current `data/items/training-catalog.json` proves item records/names/descriptions from the fixed client, but its training role/slot/bonus compatibility layer is not sufficient evidence for retail class/stage/level eligibility. S25 additionally proves that `itemtbl.atr` contains equip-position, equip-level and ten class/category flag fields. S28 preserves those raw fields as `VERIFIED-STATIC-ORIGINAL`; the flag→class consumer relation remains `INFERRED`, and final eligibility/enforcement remains `SERVER-BOUNDARY` unless an explicit `RECONSTRUCTION_POLICY` chooses to apply it.

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
- S25 canonical matrix stage IDs, authored `levelabl.atr` EXP rows and `next_class_raw` values are `VERIFIED-STATIC-ORIGINAL`; interpreting the final row as a promotion trigger remains `INFERRED` and offline enforcement remains policy.
- S25 `itemtbl.atr` equip-position, equip-level and class/category flag fields are retained as static original evidence; their final consumer/enforcement semantics are not promoted.

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

## S25 handoff — consumed before closeout

S28 read S25's final schema-3 canonical matrix (`S25_SINGLE_CANONICAL_DUAL_CLASS_MATRIX`) and integration note before closing this branch.

1. `stageTrackFromS25CanonicalEvidence()` accepts the canonical stage chain while checking `next_class_raw` consistency and preserving transition interpretation as `INFERRED`.
2. `equipmentRuleFromS25CanonicalItem()` preserves raw equip-position/equip-level/class flags and requires an explicit reconstruction mapping before enforcing them.
3. `legacyTrainingEquipmentRules()` remains only a compatibility fallback for current M5.1 data; S29 should prefer S25-backed candidates where available.
4. Final class/stage/level equipment eligibility remains `SERVER-BOUNDARY` unless S29/S26/S27 intentionally installs a reconstruction rule.
5. No S25 matrix data is copied into a second production authority.

## S26 handoff — stable interface reviewed

S28 read S26's integration note before closeout. S26 exports the swordsman ten-stage domain and stable surfaces including `SWORDSMAN_STAGE_IDS`, stage lookup, skill/equipment eligibility, promotion APIs and SaveV2 adapters. S28 does not copy those implementations.

For S29, `SWORDSMAN_STAGE_IDS` maps directly to `M6StageTrack.stageIds`; any S26 promotion requirement remains a `RECONSTRUCTION_POLICY` input when adapted to `M6PromotionRequirement`. S28's synthetic test conditions are not normative for S26.

Stable S28 consumer surfaces remain:

- `ReconstructionM6GrowthAuthority`
- `M6StageTrack`
- `M6PromotionRequirement`
- `M6EquipmentRule`
- `M6QuestChainDefinition`
- `stageTrackFromS25CanonicalEvidence()`
- `equipmentRuleFromS25CanonicalItem()`

## S27 handoff

S27's integration note was still unavailable at S28 closeout. S27 should use the same generic S28 surfaces for wizard after its own domain stabilizes.

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

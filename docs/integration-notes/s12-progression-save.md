# S12 Progression & Persistence integration note

Branch: `codex/progression-save`  
Baseline: `6452effb0d6a9d26b3b285fc5fe4ead3e8b68ce7`

## Scope

S12 adds the system/model layer for sustainable inventory, equipment, rewards, progression, and versioned persistence. It deliberately does not modify `main.ts`, `scene.ts`, `battle.ts`, UI, `Plan.md`, `Backlog.md`, or the evidence ledger during the S8-S12 parallel round.

New modules:

- `web/src/progression/inventory.ts`
- `web/src/progression/equipment.ts`
- `web/src/progression/rewards.ts`
- `web/src/progression/progression.ts`
- `web/src/progression/save-schema.ts`
- `web/src/progression/save-migration.ts`
- `web/tests/progression-save.test.ts`

## Inventory and equipment

`InventoryState` stores item quantity, equipped slots, item metadata references, and bounded acquisition-source records. Static metadata is resolved from the existing `data/items/training-catalog.json` rather than copied into saves.

The existing training catalog's item names/descriptions are sourced from `Set.lib/itemtbl.atr`; its `training.role`, slot compatibility, and gameplay bonuses remain `UNVERIFIED`. `legacyTrainingCompatibility` therefore stays replaceable through `EquipmentCompatibilityResolver`.

Class switching is fail-safe: `reconcileEquipmentForCharacter()` keeps ownership but unequips incompatible weapon/armor. Target swordsman/wizard IDs use the already-established project class lists rather than a broad modulo inference.

## Unified reward pipeline

`RewardBundle` supports:

- gold
- item + quantity
- quest flags
- EXP

Both `applyBattleReward()` and `applyQuestReward()` delegate to `applyRewardBundle()`. A persisted `receiptId` prevents the same settlement from applying twice. Item acquisition records retain whether an item came from battle, quest, migration, starter state, or system policy.

S13 should replace direct runtime mutations such as battle `gold += reward` and any quest-side direct currency/item mutation with this pipeline.

## Progression evidence boundary

Current exported authored class data contains stage HP/MP/move/hit/magic-hit values. The converter also reads `levelabl.atr` for `(class, level=1) -> stage entry skill` selection. No retail EXP threshold/level-up formula has been recovered in the current repository evidence.

Therefore `RECONSTRUCTION_PROGRESSION_POLICY` is intentionally explicit:

- policy id: `m4-linear-100x-level-v1`
- cumulative threshold: `50 * (level - 1) * level`
- maximum modeled level: 99
- provenance: `RECONSTRUCTION_POLICY`

This curve exists only to make M4 reward EXP and level-up events functional and replaceable. It must not be described as the original server formula.

## Save schema and migration

`SaveV2` is identified by both `kind: "lapis-rebuild-save"` and `version: 2`. It persists:

- resource pack id
- character
- map + coordinates
- gold
- inventory + equipment
- quest JSON state
- quest flags
- progression
- reward receipts
- timestamp

Validation is performed before state application. Foreign resource packs, unknown characters, unsupported/future versions, out-of-bounds coordinates (when map bounds are supplied), incompatible equipment, invalid progression state, malformed JSON, and malformed receipts/flags fail closed.

`migrateSave()` accepts S7 version-1 saves and creates v2 state without mutating the input. Compatibility details:

- existing legacy inventory/equipment is migrated with quantity `1` per owned item;
- missing legacy inventory reproduces S7's current default catalog ownership, tagged `migration:s7-v1-default`;
- missing legacy `mapId` becomes map `0`, matching the pre-map persistence fallback used by the prototype;
- legacy quest state is preserved; absent quest state becomes `{guide: "not_started"}`;
- progression starts at level 1 / EXP 0 because no old progression state existed;
- reward receipt history starts empty because S7 did not persist it.

These migration defaults are compatibility policy, not retail behavior.

## S13 integration points

1. Replace the live `web/src/inventory.ts` state with `InventoryState`, or add a temporary adapter while S8/S11 integration settles.
2. Supply S11's class/equipment rules through `EquipmentCompatibilityResolver`; do not upgrade `training.role` to VERIFIED.
3. Route both battle settlement and S9 quest rewards through `RewardBundle` and persist receipt IDs.
4. Upgrade `web/src/save.ts` / IndexedDB storage to serialize v2, read through `deserializeSave()` / `migrateSave()`, and only mutate the scene after complete validation.
5. Populate `SaveValidationContext.mapBounds` from the selected pack/map metadata before applying a loaded position.
6. Surface level-up events to S8/S10 presentation without moving progression math into UI code.

## Provenance

### VERIFIED

- existing target swordsman/wizard class ID lists used by this branch;
- item text/metadata references already exported from the fixed-hash item table, subject to the existing per-field evidence markers.

### RECOVERED_SECONDARY

- none newly promoted by S12.

### RECONSTRUCTION_POLICY

- EXP curve and max modeled level;
- reward receipt/idempotency model;
- acquisition-source history model;
- v2 save schema and migration defaults.

### UNVERIFIED

- `training.role` equipment compatibility and training gameplay bonuses from the existing catalog;
- any claim that the reconstruction EXP thresholds match the retired retail server.

## Validation

The S12 unit suite covers:

- acquisition quantity/source tracking;
- legal/illegal equipment and class-switch auto-unequip;
- EXP reward + level-up events;
- Battle and Quest rewards through the same idempotent pipeline;
- v2 serialize/reload round trip;
- S7 v1 migration with and without optional inventory/map fields;
- corrupted, foreign, incompatible, and future-version saves failing closed.

Full repository CI remains responsible for the existing unit suite, typecheck, production build, and Chromium E2E. Because S12 does not wire the live UI/runtime entry points, existing S7 browser behavior should remain unchanged until S13 integration.

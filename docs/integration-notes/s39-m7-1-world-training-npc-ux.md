# S39 — M7.1 World Training NPC / Main UX

Date: 2026-09-23  
Branch: `codex/s39-m7-1-world-training-npc-ux`  
Baseline: `main@6094aae3c4ff0a04af5dd4376f2b59b8b342d430`  
Integration target: `codex/m7-1-gameplay-skill-integration`

## Scope and ownership

S39 owns the world-side training-manager contract, player-facing training list surface, recovered NPC visual selection, and direct field fullscreen control.

Per the M7.1 parallel freeze, S39 does **not** modify:

- `web/src/scene.ts`
- `web/src/battle.ts`
- `web/src/m4-runtime-integration.ts`
- skill/progression authorities
- `Plan.md`, `Backlog.md`, or `docs/evidence-ledger.md`

The shared runtime wiring described below is intentionally handed to S41.

## Evidence reviewed

S39 reviewed:

- S20 original UI archaeology / reference pack;
- S22 pointer arbitration;
- S23 NPC interaction/dialogue contract;
- S24 desktop/mobile real-input acceptance;
- S33 15-battle training authority;
- S16 NPC visual recovery and the fixed-hash private visual gallery;
- current field HUD, System menu, fullscreen action, and S33 training insertion.

### Training manager visual

Selected world-body resource: **B4023**.

The private S16 gallery shows B4023 as a distinctive blue-haired humanoid candidate, visually separate from the current helmeted/soldier-like B1001 guide. The archived fixed-hash pack contains the reviewed `B4023_00/_01/_02/_03` action exports.

Evidence split:

- B4023 client art / ANI+SPR resource family: **VERIFIED-STATIC-ORIGINAL**
- interpreting B4023 as a retail training administrator: **not claimed**
- binding B4023 to the offline `训练管理员`: **RECONSTRUCTION_POLICY**

This follows the S16 rule that visual appearance alone must not invent NPCScript identity.

## Implemented S39 contracts

### 1. Dedicated training-manager authority

`web/src/world/m7-training-manager.ts` defines:

- stable entity id `training-manager`;
- display name `训练管理员`;
- interaction radius 2;
- B4023 visual binding;
- one interaction resolver for pointer, touch, and keyboard sources;
- explicit rejection for entity/map/stale actor/out-of-range cases;
- success action `open-training-list`.

The success result exposes the **same** `M7_TRAINING_BATTLES` object owned by S33. No second 15-stage dataset is created.

`trainingManagerBattleById()` delegates to S33 `trainingBattleById()`.

### 2. World placement handoff

`web/src/world/m5-playable-world.ts` now prepares a distinct reachable field cell near the existing compatibility guide and exposes `trainingManager` in `M5PlayableWorld`.

When B4023 exists in the pack, the manager is appended to the existing world visual placements. The old B1001 guide/quest flow remains available as compatibility content; it is no longer intended to be the normal M7.1 training entry.

### 3. Fixed-hash private asset packaging

`tools/prepare_web.py` now exports B4023 alongside the already reviewed M5/M7 visual families.

The parser/source regression requires B4023 to remain in `WEB_VISUALS`.

### 4. Training-manager list surface

`renderM7TrainingManagerDialog()` renders the player-facing modal/list:

- exactly 15 battles;
- recommendation level;
- stage;
- difficulty;
- original battle-zone title/id;
- monster contract summary;
- current difficulty hint;
- existing `training-start` action.

Rows are generated directly from `M7_TRAINING_BATTLES`.

The old `renderM7TrainingCamp()` is retained temporarily and marked `data-training-surface="legacy-settings"` so this Worker does not break the frozen shared runtime before S41 removes its System-menu insertion.

### 5. Direct world fullscreen control

The field HUD now has a top-right `data-action="fullscreen"` button.

The existing shared action router already sends that action to `scene.toggleFullscreen()`, so S39 does not duplicate fullscreen authority.

Desktop keeps the compact original-style top strip; phone layout gives the fullscreen button a 44 px touch target.

## S41 integration handoff

S41 should perform only the shared glue below; it should not recreate S39 data.

1. **Training manager interaction routing**
   - Reuse the existing S22 scene target arbitration.
   - When resolved entity id is `training-manager`, construct one S39 intent from the current actor world state.
   - Mouse click and phone tap should arrive through the existing pointer path; keyboard E should resolve the same entity and call the same S39 resolver.
   - If S39 returns `out-of-range`, show its player-facing message.
   - On `open-training-list`, set the manager surface open.

2. **Render the manager list outside Settings**
   - Mount `renderM7TrainingManagerDialog(level, selectedBattleId)` in the player shell/overlay when open.
   - Add `training-manager-close` handling.
   - Existing `training-start` may continue to call the current `startTrainingBattle(id)`; close the manager surface before/when battle starts.

3. **Remove Settings as the normal training entry**
   - Delete the current production insertion:
     `panel.insertAdjacentHTML('beforeend', renderM7TrainingCamp(...))`
     from `web/src/m4-runtime-integration.ts`.
   - Keep the Developer Preset in diagnostics/System menu if still required.
   - Do not create a replacement training registry.

4. **Compatibility guide**
   - Keep the old B1001 quest/house content only as compatibility/story content.
   - It must not gate or precede the training-manager flow.

5. **World visual**
   - `M5PlayableWorld.visuals` already includes B4023 when the fixed-hash pack contains it.
   - S41 should consume the exposed `trainingManager` contract rather than hard-code a second entity/resource mapping.

6. **Fullscreen**
   - No new fullscreen authority is needed. The new field button already uses the shared `fullscreen` action.

## Acceptance contract

S39 unit/UI tests cover:

- pointer / touch / E sources use one manager authority;
- out-of-range and stale interaction rejection;
- all 15 rows are the S33 registry, not copied data;
- selected battle resolves S33 zone / recommended level / difficulty;
- B4023 static-resource evidence is separated from reconstructed role binding;
- direct field fullscreen markup;
- desktop manager list layout;
- mobile 44 px touch targets and no horizontal overflow.

Final integrated S41 E2E must additionally prove:

`world -> visible B4023 manager -> mouse/tap/E -> 15-stage list -> select -> correct battle`

without opening Settings or accepting the old guide quest.

## Evidence classification

| Claim | Level |
| --- | --- |
| B4023 is an original fixed-hash client visual family with reviewed 00/01/02/03 exports | VERIFIED-STATIC-ORIGINAL |
| S20 historical field HUD uses compact edge UI rather than a large central modal shell | VERIFIED-HISTORICAL |
| S22/S24 pointer/touch NPC interaction is a working shared input pattern | VERIFIED-ENGINEERING |
| S33 15-battle registry / zone bindings used by this UI | RECONSTRUCTION_POLICY over verified original scene identities |
| B4023 is the M7.1 training manager | RECONSTRUCTION_POLICY |
| manager placement, radius, direct 15-stage launch UX | RECONSTRUCTION_POLICY |
| field fullscreen delegates to existing viewport/fullscreen authority | VERIFIED-ENGINEERING |

# S9 World / NPC / Quest Playable Slice

Baseline: `6452effb0d6a9d26b3b285fc5fe4ead3e8b68ce7`

Branch: `codex/world-quest-slice`

## Goal

Replace the old button-driven M3 guide loop with an integration-ready, data-driven world interaction boundary that can express:

```text
Start
  -> NPC interaction
  -> Accept quest
  -> WarpRequest
  -> objective map
  -> EncounterRequest
  -> BattleResult(won)
  -> return to field
  -> turn in
  -> complete
```

S9 deliberately does **not** wire this into `main.ts`, `scene.ts`, or `battle.ts`; S13 owns integration.

## Evidence boundary

### VERIFIED / recovered client boundary reused by design

S1/S4 established that the fixed client separates field interaction requests from authoritative battle entry, and that NPCScript block selection, Quest `(questIndex, stepIndex)`, Warp acceptance, Quest rewards, and Quest-driven battle decisions cross the retired-server boundary.

Therefore S9 does not claim any reconstructed NPC-to-map, NPC-to-battle, reward, or quest predicate as retail truth.

### RECONSTRUCTION_POLICY

All concrete gameplay decisions in this slice are reconstruction policy:

- training guide NPC placement and interaction radius;
- short replacement dialogue;
- quest state machine and transition predicates;
- training-map -> outer-city warp;
- outer-city objective placement;
- objective -> `battleZoneId=1` binding;
- battle win -> return to training map;
- turn-in completion.

Every outward request/result produced by the S9 authority carries `RECONSTRUCTION_POLICY` provenance.

## Added modules

- `web/src/world/world-model.ts`
  - `WorldEntity`
  - `WorldInteractionIntent`
  - `InteractionResult`
  - `WarpRequest`
  - `EncounterRequest`
- `web/src/world/npc-model.ts`
  - NPC display data
  - quest marker / availability presentation
  - short reconstruction dialogue
- `web/src/world/quest-runtime.ts`
  - data-oriented state machine: `not_started -> accepted -> objective -> ready_to_turn_in -> complete`
- `web/src/world/warp-policy.ts`
  - applies explicit `WarpRequest`; callers do not directly mutate map id
- `web/src/world/world-content.ts`
  - bounded reconstruction content for the playable slice
- `web/src/world/world-authority.ts`
  - `ReconstructionWorldAuthority`
  - central decision point for NPC interaction, encounter request, battle result, return, and turn-in
- `web/tests/world-quest-slice.test.ts`
  - pure logic acceptance coverage

## Integration contract for S13

UI/scene code should only:

1. construct a `WorldInteractionIntent` after local selection/proximity checks;
2. call `ReconstructionWorldAuthority.interact(...)`;
3. present returned dialogue;
4. send returned `WarpRequest` to the world transition layer;
5. send returned `EncounterRequest` to the existing explicit battle-entry API;
6. after battle settlement, pass a `BattleResult` back to `resolveBattle(...)`;
7. apply returned world/quest state atomically.

The UI must not infer battle zone from current field map and must not advance quest state through scattered conditionals.

## Acceptance

The new pure-logic test proves:

```text
Start
-> training-guide
-> Accept
-> Map transition
-> outer-city-training-marker
-> EncounterIntent / battleZoneId=1
-> BattleResult(won)
-> Return
-> Turn in
-> Complete
```

Negative coverage verifies that wrong-map interaction, out-of-range NPC interaction, defeat, and wrong battle zone do not advance the quest.

## Intentionally unchanged

- `Plan.md`
- `Backlog.md`
- `AGENTS.md`
- `docs/evidence-ledger.md`
- `web/src/main.ts`
- `web/src/scene.ts`
- `web/src/battle.ts`
- existing M3 `quest.ts` and `data/npcs/m3-guide.json`

The old M3 path remains in place until S13 performs explicit integration/migration.

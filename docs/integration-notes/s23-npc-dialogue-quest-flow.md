# S23 — NPC Dialogue / Quest / Guide Runtime

Branch: `codex/s23-npc-dialogue-quest-flow`

Plan baseline: `57ff22363156bec7aad3acb7555208533485d193` / Plan v3.3.

## Goal

Provide the domain/runtime half of the M5.1 NPC interaction path without taking ownership of scene pointer hit-testing or the HUD shell:

```text
S22 pointer / keyboard target
  -> exact NPC interaction intent
  -> S23 begin dialogue
  -> dialogue view model + explicit choices
  -> accept / decline / turn-in choice
  -> quest state transition
  -> existing spatial objective / battle result flow
  -> ready_to_turn_in
  -> explicit turn-in
  -> complete
```

S23 does not edit `scene.ts`, `main.ts`, `battle.ts`, `web/src/ui/game-shell.css`, `Plan.md`, `Backlog.md` or `docs/evidence-ledger.md`.

## Evidence boundary

### Reused recovered client facts

The S4 archaeology remains authoritative for what the fixed 2.2 client does and does not prove:

- field interaction sends a concrete object/entity request to the server;
- NPCScript block selection is server supplied;
- Quest `(questIndex, stepIndex)` presentation state is server supplied;
- NPCScript numeric tuples recovered by S4 are dialogue/UI geometry, not field placement;
- no local universal `object -> dialogue/quest/reward/warp/battle` table has been recovered.

Therefore this offline guide flow cannot be labelled retail quest logic.

### Historical external evidence

`docs/research/external-web-research-20260918.md` and the private Drive archive were reviewed for S23.

Useful constraints:

- the 2006 Japanese Kaosia page records a training facility with two entrances;
- later Japanese / Traditional Chinese material records quest prerequisites and task progression semantics;
- those sources are historical/same-family evidence only.

S23 does **not** convert those observations into mainland 2.2 map IDs, NPC IDs, coordinates, quest IDs, or rewards. The current guide identity, placement, task predicates, map 7 training-house carrier and battle binding remain `RECONSTRUCTION_POLICY`.

## New runtime contract

### `web/src/world/npc-dialogue-runtime.ts`

Defines the S23 dialogue session boundary.

Input:

- exact `entityId`;
- actor/world map and cell state;
- `inputSource: pointer | keyboard | compatibility`;
- reconstruction provenance.

The runtime validates:

- exact selected entity;
- quest ID;
- current map;
- actor coordinates are not stale relative to world state;
- interaction radius.

A successful activation returns `NpcDialogueViewModel`:

- deterministic `sessionId`;
- NPC / quest identity;
- quest marker;
- phase: `offer | progress | turn-in | complete`;
- speaker / short reconstruction lines;
- explicit choices;
- provenance.

Choice contract:

- `accept-quest`
- `decline-quest`
- `turn-in-quest`
- `close`

Quest state is not changed by `beginNpcDialogue(...)`. State changes only through `applyNpcDialogueChoice(...)`.

A session is bound to the quest stage it opened on. Reusing the same session after the quest stage changes fails with `stale-dialogue`. This prevents double accept / double turn-in through repeated UI events.

### `web/src/world/world-authority.ts`

New explicit methods:

```ts
beginNpcInteraction(state, intent)
chooseNpcInteraction(state, session, choiceId)
```

These are the preferred S24 integration API.

The pre-M5.1 `interact(...)` API remains as a compatibility path. For the guide only, it opens the same S23 session and automatically selects the historical default action (`accept-quest` or `turn-in-quest`) so existing M4/M5 regression tests and the current runtime do not break before S24 installs the player-facing dialogue UI.

The compatibility path must not be used by the new pointer E2E as proof of explicit quest acceptance.

## Quest / battle behavior retained

The S9/S18 authority split remains intact:

- guide interaction owns offer / progress / turn-in presentation;
- S18 spatial door transition owns field/interior movement;
- entering the objective map advances `accepted -> objective`;
- battle entry remains an explicit `EncounterRequest`;
- defeat / escape do not advance the quest;
- a win for the configured battle zone advances `objective -> ready_to_turn_in`;
- only an explicit S23 `turn-in-quest` choice advances `ready_to_turn_in -> complete`.

No battle zone is inferred from a map ID.

## S22 -> S23 handoff

S22 should stop after it has resolved a concrete clickable NPC target and current actor cell. It should not advance quests.

For pointer input:

```ts
authority.beginNpcInteraction(worldState, {
  entityId: hitNpcId,
  mapId: actor.mapId,
  actorX: actor.x,
  actorY: actor.y,
  inputSource: 'pointer',
  provenance: 'RECONSTRUCTION_POLICY',
})
```

For keyboard E, use the same shape with `inputSource: 'keyboard'`.

Both paths must resolve the target first, then call the same S23 method. Do not maintain a separate keyboard quest path.

If S22 has more than one NPC in range, the pointer path must pass the exact hit target. S23 does not search for a different nearby NPC when the requested `entityId` is invalid.

## S24 integration handoff

S24 should:

1. call `beginNpcInteraction(...)` from the resolved S22 interaction intent;
2. render `session.view` in the player-facing dialogue/quest surface;
3. map UI buttons to the choice IDs returned by `session.view.choices`;
4. call `chooseNpcInteraction(...)` with the same session;
5. replace runtime world state with the returned state;
6. on `outcome.action === 'quest-completed'`, invoke the existing S12 quest settlement path; its reward receipt remains the idempotency boundary;
7. close or refresh the dialogue after a successful choice;
8. never call internal `talkGuide()` or the compatibility `interact(...)` path in the new real-input acceptance test.

The view model is reconstruction UI. S21 may style/place it according to the Original UI Reference Pack, but styling must not change S23 semantics.

## Tests

`web/tests/s23-npc-dialogue-quest-flow.test.ts` covers:

- pointer and keyboard input share one dialogue contract;
- begin does not auto-advance the quest;
- unknown / wrong target entity;
- wrong map;
- stale actor coordinates;
- out-of-range activation;
- all quest stages and available choice sets;
- stale session / repeated accept protection;
- defeat does not advance;
- win enables turn-in;
- explicit turn-in completes once;
- completed quest cannot be turned in again;
- SaveV2-restored `ready_to_turn_in` state resumes through the same S23 contract.

Existing S12 reward receipts remain the duplicate-reward guard; S23 deliberately does not duplicate progression/reward authority.

## Completion boundary

This branch provides the dialogue/quest runtime contract and tests. It does not own:

- NPC Phaser pointer hitboxes;
- event arbitration between NPC click and map movement;
- final dialogue window markup/CSS;
- shared `scene.ts` glue;
- final browser pointer E2E.

Those are S22 / S21 / S24 responsibilities respectively.

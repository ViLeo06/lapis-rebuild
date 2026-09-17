# S18 — World Scene Transition / Spatial Interaction

Baseline: `047c52af340076a00a6e0d347806708ad92844d1`

Branch: `codex/m5-world-scene-transition`

## Goal

Provide an integration-ready spatial world layer for the M5 path:

`field movement -> enter doorway -> explicit transition request -> coordinator installs destination -> field/interior commit -> leave through exit`.

NPC interaction zones are evaluated by the same spatial layer but never auto-switch scenes. Battle remains a separate lifecycle.

## Evidence boundary

### VERIFIED client facts reused

- Retail world entity types `101..103` have a local Manhattan-distance `< 4` gate before the recovered `49/21` action uplink.
- The recovered scene-object path has a Manhattan-distance `< 9` gate before its `49/04` action uplink.
- Warp UI stages a value and emits `A4 02`, then later `A4 01 <uint16 staged value>`.
- The recovered client path does not locally install the final accepted destination scene.

These facts support client-side proximity/spatial interaction. They do **not** prove a specific training-house door, destination map, spawn cell, quest predicate, or accepted warp result.

### RECONSTRUCTION_POLICY

The following S18 bindings are explicitly `RECONSTRUCTION_POLICY`:

- door / entrance / exit cells;
- field -> interior and interior -> field graph edges;
- destination spawn cells and facing;
- automatic `enter` activation for reconstructed doorways;
- NPC interaction-zone placement/radius projected into this runtime.

The current Web pack validates field map `1` and uses map `0` as a battle resource. S18 does **not** relabel map `0` as an interior. No training-house interior map is promoted without a separate validated asset binding.

## Modules

### `web/src/world/world-graph.ts`

Defines and validates explicit scene nodes, named spawn points, directed transition edges, optional strict reverse-edge pairs, and unique scene/map/trigger IDs. It never infers a destination from a field map ID.

### `web/src/world/spatial-trigger.ts`

Cell-space runtime for rectangle, Manhattan-radius, and explicit-cell zones. Supports automatic `enter` scene transitions, `interact` world/NPC offers, priority, enter/exit edge detection, and suppression-until-exit.

Because it consumes map/cell coordinates instead of canvas pixels, S15 camera/zoom/fullscreen changes do not change S18 spatial semantics.

### `web/src/world/scene-transition.ts`

`SceneTransitionController` uses a two-phase contract: movement produces a `SceneTransitionRequest`; the coordinator installs/validates the destination and then calls `commit()`.

Guards include duplicate-pending suppression, trigger/source-map consistency, stale-commit rejection, fail-closed uncommitted map changes, rejection cooldown until doorway exit, and arrival debounce so a spawn inside an exit zone does not immediately bounce back.

### `web/src/world/s18-world-policy.ts`

`createTrainingHousePolicy(...)` assembles a bidirectional field/interior graph. The coordinator supplies the actual validated map IDs, entrance/exit zones, spawn cells, facing, and optional NPC definitions. All output is `RECONSTRUCTION_POLICY`.

## Coordinator integration

S18 intentionally does not edit `scene.ts`, `main.ts`, `battle.ts`, `Plan.md`, `Backlog.md`, or `docs/evidence-ledger.md`.

1. Select and validate an actual interior map. Do not reuse battle map `0` merely because it is already available.
2. Define reconstructed entrance/exit and spawn cells in one S18 policy object.
3. Create `SceneTransitionController` and call `start()` from the current actor cell.
4. After field movement changes actor cell, call `update({mapId, cell})`.
5. On a returned transition, validate destination map availability and a walkable spawn.
6. Atomically stop the route, install the destination map/collision state, place the actor at `request.to.cell`, apply optional facing, then call `commit(request)`. If installation fails, call `rejectPending()`.
7. Feed `update().interactions` into the existing world/NPC authority. Do not infer NPC identity from visual/resource numeric equality.
8. For M5, the S9 quest-accept `WarpRequest` is legacy button-era behavior. Advance/present the quest, but let S18 spatial edges own field/interior movement rather than immediately applying that legacy warp.
9. Keep battle entry separate. An interior objective may later produce the explicit `EncounterRequest`, but a scene edge must never infer `battleZoneId` from field/interior map IDs.

Use the existing stable world/reference cell conversion, not raw canvas coordinates. This is the S15/S18 boundary.

## Tests and harness

`web/tests/s18-world-transition.test.ts` covers bidirectional graph validation, automatic entrance, arrival no-ping-pong, reverse exit, NPC interaction isolation, rejection suppression, zone math, missing trigger, stale commit, and uncommitted map-change failure.

`web/e2e/s18-world-transition-harness.spec.ts` is an isolated browser preview, not live integration. It writes:

- `test-results/s18-01-field-door.png`
- `test-results/s18-02-interior-arrival.png`
- `test-results/s18-03-interior-exit.png`
- `test-results/s18-04-npc-zone.png`

## Completion boundary

This PR proves the spatial transition runtime and its failure boundaries. It does **not** claim that a specific original training-house route was recovered. Final M5 acceptance still requires the coordinator to bind a validated interior map and demonstrate natural walk-in / walk-out behavior in the integrated game.
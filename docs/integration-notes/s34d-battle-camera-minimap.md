# S34D — Battle Camera / Large Battlefield / Minimap

Date: 2026-09-23  
Branch: `codex/s34d-battle-camera-minimap`  
Baseline: `5324354868d4a2b44103aea89d435162235db8b9`  
Integration target: `codex/s34-m7-integration-acceptance`

## Scope

This worker changes presentation/navigation only. It does not change poison balance, skill geometry, hotkeys, enemy encounter-group policy, damage, or AI.

## Battle camera

- Battle entry no longer frames `battleFocus` or shrinks the full encounter into one viewport; cover-only zoom prevents out-of-map blank space on undersized fallback maps.
- Battle never zooms out to fit the encounter. Large battlefields start at normal 1:1; an undersized map may zoom in only enough to cover the viewport, then center/clamp around the player.
- Desktop fine-pointer input supports smooth edge scrolling.
- Player proximity to the viewport safe edge provides delayed assist follow.
- When the player stops and manual camera control is not active, the camera eases back toward the player rather than snapping.
- Coarse/mobile pointers do not depend on hover edge scrolling; player edge assist remains active.
- All camera writes go through world-bound clamping so the camera does not expose out-of-map blank space.
- Minimap navigation eases the camera to a world target without moving the player. A short manual-control grace period prevents immediate follow-back.

The old fixed-client screen-edge dispatch and historical approximately 32px step are evidence that battle camera scrolling existed. The exact smoothing, edge margin, speed, safe inset, and manual-control grace used here are reconstruction policy.

## Minimap

S20 fixed-hash archaeology establishes `Dlg/SmallMap.Tdg`; historical UI evidence establishes a compact small map and a toggle. The confirmed battle-map legend uses blue for the player/friendly side and purple for enemies.

The S34D reconstruction uses one Phaser `Graphics` object with no per-frame DOM-node creation. The graphics object is anchored to the current camera world origin and inverse-scaled by camera zoom so it remains screen-fixed while the battlefield zoom changes. It renders:

- full battlefield bounds;
- blue player marker;
- every living enemy as purple markers, including non-active encounter groups;
- current viewport rectangle;
- slightly stronger/larger marker treatment for the currently active encounter group.

Placement is lower-right and shifted upward responsively to avoid the existing bottom battle HUD.

Click/tap-to-pan is explicitly **RECONSTRUCTION_POLICY**. It is required by the current user interaction design but is not claimed as verified retail behavior.

## Pointer containment

The scene-level pointer-down handler tests the minimap hit region before enemy selection or movement routing. A minimap hit is consumed immediately. Therefore a minimap click/tap can update only the camera target and cannot:

- move/teleport the player;
- select or directly attack an enemy;
- trigger ordinary movement routing.

Battle HUD and skill buttons remain DOM-level UI above the canvas and keep their existing pointer behavior.

## Exact `scene.ts` touch surface

Existing methods modified:

- `create()`
- `fit()`
- `applyBattleEntry()`
- `leaveBattle()`
- `snapshot()`
- `update()`

New private helpers:

- `coarsePointer()`
- `battleMinimapBottomInset()`
- `currentBattleMinimapModel()`
- `handleBattleMinimapPointer()`
- `updateBattleCamera()`
- `drawBattleMinimap()`

Class fields/imports were extended only for camera/minimap state.

## Tests

New unit coverage: `web/tests/s34d-battle-camera-minimap.test.ts`

- desktop edge pan and world clamp;
- coarse-pointer/mobile path;
- smooth player settle;
- player/all-living-enemy/dead-enemy minimap model;
- minimap screen-to-world camera targeting.

New browser coverage: `web/e2e/s34d-battle-camera-minimap.spec.ts`

- battle keeps normal scale instead of fitting the whole battlefield;
- desktop edge pan reaches additional battlefield area and stays clamped;
- 20-enemy minimap includes all living enemies;
- click moves the camera toward a remote enemy while preserving player anchor, route, target, and enemy HP;
- dead marker disappears;
- mobile tap pans the camera without player teleport or battle-input leakage.

Existing S15 viewport/unit coverage remains the regression guard for non-battle camera follow, zoom and clamping.
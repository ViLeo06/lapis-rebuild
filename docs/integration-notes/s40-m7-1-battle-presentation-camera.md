# S40 — Camera / Minimap / Range / Battle Presentation

Date: 2026-09-23  
Branch: `codex/s40-m7-1-battle-presentation-camera`  
Baseline: `6094aae3c4ff0a04af5dd4376f2b59b8b342d430`  
Integration target: `codex/m7-1-gameplay-skill-integration`

## Scope

S40 owns scene/camera/minimap/battle presentation only. It does not change S36/S37 numeric skill authority, S38 EXP/reward authority, S39 training NPC authority, `battle.ts`, `m4-runtime-integration.ts`, Plan, Backlog, or evidence ledger.

The task names an S34C integration note that is not present on the M7 baseline. S40 therefore used the integrated S34C implementation/tests plus `s34-five-fix-integration-readiness.md`. Existing direct-enemy-click, grouped encounter and all-living-enemy visibility contracts are preserved.

## Implemented

### Automatic range

- normal actionable state -> movement range;
- active skill targeting -> supplied cast cells + AoE preview;
- cancel -> movement range returns when actionable;
- Battle HUD has no Range button;
- `setBattleRangeOverlayVisible()` remains only as a compatibility shim and cannot hide the derived state.

The legacy Space dispatch lives outside S40 ownership; S41 may remove it without changing scene behavior.

### Battle camera

The S34D wall-clock grace timer is replaced by explicit modes.

- entry -> `FOLLOW_PLAYER`;
- minimap navigation or desktop edge pan -> `MANUAL_VIEW`;
- manual view never expires by time;
- the next successfully accepted player movement route -> `FOLLOW_PLAYER`;
- attack / skill do not force follow;
- smooth safe-inset tracking, delayed settle-to-center and world clamp are retained.

### Minimap

Battle minimap remains lower-right and shows battlefield bounds, player, all living enemies, viewport rectangle and mild active-group emphasis. Its pointer region still consumes input before movement/attack/skill targeting.

Field mode adds an upper-left live minimap with map bounds, player and viewport. `F8` toggles it. Historical evidence establishes the upper-left relationship; exact responsive geometry remains reconstruction.

### Monster movement

S17's reviewed `_01` movement-like sequence is consumed. Because `battle.ts` is frozen for S40, scene presentation captures a destination mutation, restores the pre-step position in the same frame, interpolates continuously, faces the route direction, plays `_01`, then returns to idle after arrival.

This is a presentation commit barrier, not a second AI/pathfinding authority.

### Target-anchored feedback

S40 exposes:

`scene.presentBattleFeedback({kind,target,amount,label,tone,durationMs})`

Existing HP-loss/poison tick events use it. Enemy target IDs resolve to that actor's current anchor; missing IDs return no anchor and never fall back to the player. Multiple targets therefore produce independent floating feedback.

### HUD contract

`PlayerHudState` now accepts `exp / expMax / atk / def`; `BattleHudState` accepts compact status chips. EXP / ATK / DEF are always visible as presentation slots, but show em dashes until S38/S41 supplies authoritative values.

The status surface supports Stun, Strong Defence, Burst, Sacrifice, Battle Command, Dark Veil, Poison, Nature Force, Healing Block, Petrify, Blind and Cursed Sword without embedding skill math in S40.

## Evidence boundary

| Claim | Level | Boundary |
| --- | --- | --- |
| `Dlg/SmallMap.Tdg` exists in fixed client | VERIFIED-STATIC-ORIGINAL | Resource presence only. |
| Same-era field UI places optional compact map upper-left | VERIFIED-HISTORICAL | Relationship, not exact pixels. |
| S17 reviewed `_01` as movement-like for common monster resources | RECOVERED_SECONDARY | Does not prove retired server semantics. |
| Interpolation timing/easing | RECONSTRUCTION_POLICY | Clamped from recovered sequence duration. |
| Explicit camera modes / battle minimap navigation | RECONSTRUCTION_POLICY | User-approved M7.1 UX. |
| Automatic range-state presentation | RECONSTRUCTION_POLICY | Skill geometry remains S37 authority. |
| EXP/ATK/DEF values and status mechanics | SERVER-BOUNDARY / external authority | S40 renders supplied values only. |

## S41 integration handoff

1. Remove obsolete runtime Range toggle/Space event plumbing if no compatibility consumer remains.
2. Supply `PlayerHudState.exp/expMax` from S38 and `atk/def` from unified combat presentation stats; do not derive formulas in HUD.
3. Map S36/S37 active statuses into `BattleHudState.statuses`.
4. Route S36/S37 feedback events through `scene.presentBattleFeedback()` with the exact actor target ID. Poison initial hit and every DOT target should emit independently.
5. Keep S39 training NPC/fullscreen glue outside this branch, then conflict-review its field overlays against the upper-left minimap.
6. Preserve direct enemy click, grouped encounters, all living enemies visible, empty-center poison targeting, confirmed retreat and mobile input.

## Known limitations

- Live EXP is intentionally not fabricated before S38/S41.
- Status durations/mechanics are not inferred in S40; only the display contract exists.
- Enemy interpolation wraps the frozen battle destination mutation. If S41 later exposes explicit movement-intent events, preserve the interpolation behavior while removing the compatibility barrier.
- World minimap pixel geometry is RECONSTRUCTION_POLICY; only its historical upper-left placement relationship is evidence-backed.

## Validation surfaces

- `web/tests/s40-m7-1-battle-presentation.test.ts`
- `web/e2e/s40-m7-1-battle-presentation.spec.ts`
- legacy HUD tests now reject reintroducing the independent Range button.

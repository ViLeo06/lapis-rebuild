# S34B — Poison AoE / Original Grid Geometry / Skill Targeting

Branch: `codex/s34b-poison-grid-targeting`  
Baseline: `5324354868d4a2b44103aea89d435162235db8b9`

## Fixed-hash authority

The original mainland 2.2 `Magictbl.atr` authority used by S25 has SHA-256:

`d885bbd1bddffd3d4bf05b2b4e36232c62d94fc78209d46861b01986779ef0d9`

For Poison Mist, the fixed table evidence used by S34B is:

| Lv | Dist | Area code | Original cells |
| ---: | ---: | ---: | ---: |
| 1 | 4 | 1 | 5 |
| 2 | 4 | 1 | 5 |
| 3 | 5 | 2 | 13 |
| 4 | 5 | 2 | 13 |
| 5 | 6 | 2 | 13 |
| 6 | 6 | 3 | 25 |

Original battle-grid area geometry is a diamond on the recovered parity grid:

- Area 1 = 5 cells
- Area 2 = 13 cells
- Area 3 = 25 cells
- Area 4 = 41 cells

The previous M7 reconstruction `areaCells -> sqrt -> radius` is removed from the battle adapter. The earlier poison sequence `1 / 5 / 9 / 13 / 17 / 25` is not treated as original evidence.

## Delivered contracts

### `web/src/combat/m7-grid-targeting.ts`

Pure authority/helper layer:

- pixel/cell conversion wrappers;
- original grid distance validation;
- original Area 1–4 diamond enumeration;
- exact Poison Lv1–Lv6 geometry;
- affected-enemy calculation constrained to the active encounter group;
- pure targeting state for idle / aiming / preview / confirmed / cancelled.

Mobile state contract:

1. first legal tap previews;
2. second tap on the same cell confirms;
3. tapping a different cell moves preview;
4. Cancel/Esc maps to `cancelM7SkillTargeting`.

PC state contract:

- hover -> `hoverM7SkillTargeting` preview;
- left click -> `confirmM7SkillTargeting` or equivalent confirmed transition;
- right click / Esc -> cancel.

### Battle authority

`useM7SkillTargeted(state,{targetCell,...},x,y,command)` is the new combat-layer entry point.

For `poison-mist`:

- a `targetCell` is required;
- no enemy is required on the center cell;
- cast distance is measured caster-cell -> target-cell using the fixed Lv1–Lv6 Dist authority;
- affected enemies are resolved from the original diamond cells;
- only enemies from the currently active encounter group are affected;
- status/DOT arithmetic continues through the existing S32/S34 wizard runtime and was not rebalanced here.

`useM7Skill(...targetId...)` remains only as a compatibility bridge for the current Scene. For Poison it derives a target cell from the selected enemy so existing S34 E2E does not break before the Scene worker lands. New UI/runtime wiring must use `useM7SkillTargeted`; once Scene is migrated, the compatibility auto-center path can be removed.

## Original vs reconstruction boundary

**VERIFIED-STATIC-ORIGINAL**

- Poison Lv1–Lv6 Dist values listed above;
- Poison Lv1–Lv6 Area codes listed above;
- Area code geometry 1/2/3/4 -> 5/13/25/41 cells.

**RECONSTRUCTION_POLICY / existing S34 policy preserved**

- poison immediate/status damage arithmetic and INT bridge;
- poison tick timing/multiplier;
- encounter-group gameplay binding;
- UI gesture implementation details.

S34B does not change poison damage balance.

## Scene/UI handoff

Scene should stop treating Poison as `selected enemy -> cast` and instead:

1. enter `beginM7SkillTargeting('wizard:poison-mist')`;
2. convert pointer location through `m7PixelToGridCell`;
3. reject/mark cells failing `validateM7CastCell(casterCell,targetCell,geometry.castDistance)`;
4. preview `enumerateM7DiamondArea(targetCell,geometry.areaCode)`;
5. on confirm call `useM7SkillTargeted(state,{targetCell},playerX,playerY,command)`;
6. on cancel do not call battle authority.

No `scene.ts` change is included on this worker branch to avoid parallel-worker conflict.

## Tests

`web/tests/s34b-poison-grid-targeting.test.ts` covers:

- Area 1 = 5;
- Area 2 = 13;
- Area 3 = 25;
- Area 4 = 41;
- cast distance 4/5/6 boundaries;
- empty target center;
- multiple enemies inside one AoE;
- outside enemies excluded;
- non-active encounter group excluded;
- preview/cancel purity;
- confirm-only battle mutation;
- invalid target does not spend MP/readiness;
- exact Poison Lv1–Lv6 manifest/authority geometry.

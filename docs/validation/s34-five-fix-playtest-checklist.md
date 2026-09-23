# S34 Five-fix Final Playtest Checklist

Date: 2026-09-23  
Scope: S34 five-fix integration only  
Status: **USER ACCEPTED FOR MERGE — 2026-09-23**

Accepted artifact: `lapis-s34-final-playtest-20260923.html`  
SHA-256: `862eceb493e87ff53be2d102923b67441eef7791193a1f73ea13649e59f6e409`  
Integration head: `80e7c4307156b18a31c3631542c304d3cf5969b8`  
Final CI: `35834469240` — success  
Merged main: `6094aae3c4ff0a04af5dd4376f2b59b8b342d430`

> The user approved the final build as a whole for merge. The individual boxes below remain the detailed manual checklist/reference and are not retroactively marked as individually observed unless that exact observation was explicitly recorded.

## Desktop

- [ ] Create/select a wizard and enter a many-enemy training battle.
- [ ] Confirm all living enemies are visible at battle start, including later clusters.
- [ ] Confirm no interactive cluster exceeds about five enemies.
- [ ] Press `A`: ordinary attack executes through the same authority as mouse attack.
- [ ] Press `S`: HP Recovery works when HP is not full.
- [ ] Press `D`: MP Recovery works when MP is not full.
- [ ] Press `F`: rest executes; fullscreen is not accidentally toggled.
- [ ] Confirm `Q/W/E/R` select/use the first four skills.
- [ ] Confirm `1..6` select/use the first six skills.
- [ ] Press `Space`: skill/range overlay appears and clears correctly.
- [ ] Enter skill targeting, then press `Esc`: targeting cancels with no MP/readiness spend and battle remains active.
- [ ] Click ground: player moves; no attack is triggered.
- [ ] Click a living enemy in the active cluster: immediate ordinary attack executes, not selection-only behavior.
- [ ] Walk toward a later cluster: active encounter group changes only when spatially near it.
- [ ] During that walk, later groups never disappear.
- [ ] Only the nearby active group advances/acts; inactive groups remain visible but do not act.
- [ ] Poison Lv1–Lv6 cast distance is exactly `4/4/5/5/6/6` cells.
- [ ] Poison Lv1–Lv6 AoE geometry is exactly `5/5/13/13/13/25` cells.
- [ ] Hover an empty target cell: preview is shown even though no enemy occupies the center.
- [ ] Confirm poison on an empty-centered area containing multiple enemies: all geometry-valid targets receive poison.
- [ ] Confirm poison DOT ticks without requiring the poisoned enemy to take an action.
- [ ] Confirm battlefield is larger than viewport at acceptance scene; game does not shrink the entire battle to fit.
- [ ] Move pointer to screen edge: battle camera pans.
- [ ] Camera is clamped to battle world bounds.
- [ ] Camera movement/follow is delayed/smooth rather than snapping every frame.
- [ ] Minimap shows player marker.
- [ ] Minimap shows every living enemy marker, including inactive clusters.
- [ ] Minimap shows the current viewport rectangle.
- [ ] Click minimap away from current camera: camera changes but player position does not.
- [ ] Request battle exit: confirmation appears.
- [ ] Cancel exit once: battle resumes normally.
- [ ] Request exit again and confirm: return to the prior scene with no victory/reward settlement.

## Mobile / touch

- [ ] Phone viewport has no control-blocking horizontal overflow.
- [ ] Tap ground: player moves.
- [ ] Tap enemy: immediate ordinary attack executes.
- [ ] Tap Poison skill and tap an empty center once: preview only; no resource spend.
- [ ] Confirm the same target cell with the approved second-tap/double-tap interaction: skill casts and hits multiple targets.
- [ ] Tap elsewhere/cancel targeting: no MP/readiness spend.
- [ ] Mobile camera follow/pan keeps the player usable on a battlefield larger than the viewport.
- [ ] Minimap tap changes camera only.
- [ ] All living enemy markers remain represented on the minimap.
- [ ] Battle exit request and confirmation are both touch-accessible.

## Regression / evidence boundary

- [ ] Existing M5.1 delayed field camera / map-edge clamp still works outside battle.
- [ ] Existing confirmed battle retreat path remains intact.
- [ ] Existing M7 20-enemy roster and four groups of five remain intact.
- [ ] No test or UI labels the modern `A/S/D/F + QWER`, mobile targeting, minimap camera jump, or mobile camera behavior as retail-exact; these remain `RECONSTRUCTION_POLICY`.
- [ ] Final report records exact integration SHA, focused E2E result, overall regression result, and exact standalone SHA used for user playtest.

# S34A — Combat Input / Hotkeys / HUD

Date: 2026-09-23  
Branch: `codex/s34a-combat-input-hotkeys`  
Baseline: `5324354868d4a2b44103aea89d435162235db8b9`  
Target: `codex/s34-m7-integration-acceptance`

## Changed

- Battle keyboard contract is centralized in `web/src/input/battle-hotkeys.ts`.
- `A` routes to the existing ordinary-attack authority (`scene.attack(null)`), so readiness, target legality and range remain authoritative.
- `S / D / F` route to HP Recovery / MP Recovery / Rest.
- `Q / W / E / R` address profession skill slots 1–4; `1–6` address slots 1–6. Both paths call the same `useSkill` authority.
- `H / M` remain hidden compatibility aliases only. They are not advertised by the battle HUD. Old `R = Rest` is removed because `R` is skill slot 4.
- `Space` toggles the battle-range input contract.
- `Esc` checks a targeting-cancel hook before the existing retreat-confirmation/dialog/menu behavior.
- HUD labels now match the production input contract.

## Space / Esc integration contracts

This worker intentionally does not redesign `scene.ts`.

If Scene provides `setBattleRangeOverlayVisible(visible:boolean)`, S34A calls it. Independently, every range toggle emits:

`window: lapis-battle-range-overlay -> CustomEvent<{visible:boolean}>`

This provides an explicit handoff for the final movement / attack / spell overlay implementation without creating a second overlay state machine here.

If a later targeting worker provides `cancelBattleTargeting(): boolean` on Scene, S34A calls it first on battle `Esc`. A `true` return consumes Esc before retreat confirmation, dialogue, or menu handling. Until that targeting state exists, the existing Esc behavior remains unchanged.

## Cross-file reason

`web/src/main.ts` required a minimal input-bridge guard. Its legacy listener maps WASD directly to movement and is registered before the M4 runtime listener; without the guard, battle `A/S/D/W` would both execute the new battle command and legacy movement. The guard makes legacy WASD field-only while leaving battle arrow-key movement available.

`web/src/m4-main.ts` only exposes an automation-only MP setter used to prove that hotkeys cannot bypass the production MP/readiness authority. It does not add a player-facing command or change battle rules.

## Tests

- Pure hotkey resolver contract: A/S/D/F, QWER, 1–6, Space, Esc, and non-battle isolation.
- HUD key-label consistency and hidden legacy H/M labels.
- S34 Playwright: non-battle A isolation, legal A attack/action consumption without WASD movement, S/D/F mapping, QWER and numeric-slot shared authority, readiness rejection, MP rejection, Space contract, and Esc retreat-confirm cancellation.
- Existing S34/M7 acceptance remains the regression suite.

## Evidence / reconstruction boundary

Historical S20 evidence records item quick slots `A/S/D/F` and magic quick slots `Z/X/C/V`. The S34A single-character bindings are a modern usability reconstruction requested for the rebuild; they are **not** claimed as exact retail 2.2 keyboard semantics.

No damage, readiness, MP-cost, range, target-legality, skill-effect, enemy grouping, camera, minimap, or encounter authority is reimplemented by this worker.

## Handoff / possible conflicts

- Final Scene overlay owner: implement `setBattleRangeOverlayVisible(visible)` or listen to `lapis-battle-range-overlay`.
- Final skill-targeting owner: implement `cancelBattleTargeting(): boolean` rather than adding another global Esc state machine.
- Any concurrent edits to the legacy keydown block in `web/src/main.ts` should preserve the S34A battle/field ownership guard.

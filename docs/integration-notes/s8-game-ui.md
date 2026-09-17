# S8 Game UI / UX Shell integration note

## Scope

S8 replaces the developer-first page hierarchy with an integration-ready player shell. It deliberately does **not** change battle rules, encounter authority, damage, AI, save semantics, quest semantics, `scene.ts`, `battle.ts`, or `main.ts`.

New UI modules: `web/src/ui/game-shell.ts`, `field-hud.ts`, `battle-hud.ts`, `game-menu.ts`, `debug-panel.ts`, `types.ts`, `ui-utils.ts`, and `game-shell.css`.

Validation: `web/tests/game-ui-shell.test.ts` and `web/e2e/s8-ui-shell.spec.ts`. The visual harness renders the shell without Phaser and captures desktop field, desktop battle, and narrow-window screenshots. This keeps S8 independently testable until S13 wires the real canvas and runtime events into it.

## Player-facing hierarchy

Normal field view keeps the map/canvas as the visual majority of the screen, with a compact player plate (portrait/class/HP/MP/gold), current map, short quest tracker, contextual NPC/object interaction prompt, and menu entry.

Normal battle view keeps the map visible, then adds player/selected-target vitals, readiness/action meter, battle status, ordinary attack, skills, rest, menu, and optional settlement/return.

The visual language intentionally follows a plain early-PC-RPG HUD: small framed panels, low ornament, no mobile-card dashboard layout, and no permanent full-screen diagnostic sidebar.

## Developer / Diagnostics

Diagnostics are not deleted. The shell moves map selector, raw ANI timing, action slot, direction, anchor/bounds, MagicRes inspector, and provenance behind an explicit `Developer / Diagnostics` opt-in. `renderGameShell()` does not render diagnostics when developer mode is disabled. When enabled, they are inside a closed `<details>` panel unless state explicitly requests it open.

## S13 integration contract

S13 should import `game-shell.css`; build a `GameShellState` adapter from `LabScene.snapshot()` and authored UI data; mount the real Phaser canvas in the shell; route `[data-action]` events to existing scene methods rather than moving rules into UI code; feed current skills into `BattleHudState.skills`; keep Developer/Diagnostics off by default; preserve existing E2E intent; and add integrated screenshots after wiring.

S8 contains a placeholder `data-game-canvas` region only. It is not a second runtime or competing scene implementation.

## Provenance classification

### VERIFIED

- Existing project rule that normal player view should not show route polyline or anchor/bounds by default.
- Existing project requirement that battle and field remain distinct lifecycle modes.
- Existing project requirement that desktop and narrow layouts avoid horizontal overflow.
- Existing runtime concepts exposed by the shell: HP, MP, gold, map, readiness, battle phase, current target, skills.

### RECOVERED_SECONDARY

None newly asserted by S8.

### RECONSTRUCTION_POLICY

The shell's visual composition, command grouping, hotkey labels, panel styling, and exact menu hierarchy. These are usability reconstruction choices, not claims about the 2003 retail client UI.

### UNVERIFIED

Exact retail HUD geometry, fonts, colors, button art, portrait framing, menu layout, and hotkeys; and any inference that a reconstructed shell element matches historical server/client UX exactly.

## Non-goals / conflict avoidance

S8 intentionally does not modify `Plan.md`, `Backlog.md`, `AGENTS.md`, `docs/evidence-ledger.md`, `web/src/main.ts`, `web/src/scene.ts`, or `web/src/battle.ts`. That leaves shared runtime integration to S13 and minimizes conflict with S9-S12.

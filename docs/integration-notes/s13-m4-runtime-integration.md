# S13 — M4 Runtime Integration

Branch: `codex/m4-runtime-integration`

Base: post-S8–S12 main (`ff849ac29a75f955447af190aa4367201182d1e6`)

## Goal

Wire the five independent M4 modules into the already validated S7 Phaser runtime without re-merging their responsibilities into one monolithic scene implementation.

The integration deliberately keeps the S7 scene/battle core as the rendering and tactical host while adding an M4 runtime adapter that owns player-facing world quest state, progression/rewards/save-v2 state, class/skill catalogs, the new HUD, and presentation feedback.

## Runtime structure

The Web entrypoint is now `m4-main.ts`.

- human/default browser: M4 player mode is enabled;
- existing Playwright legacy regression: M4 is not enabled by default when `navigator.webdriver` is true, preserving the S7 selectors and historical regression contract;
- M4 browser acceptance: tests use `?m4=1` to force the new player-facing runtime.

This keeps both old regression coverage and the new game-facing acceptance path alive during the transition.

## S8 UI integration

S8 HUD renderers are mounted over the real Phaser canvas:

- field HUD: class/vitals/gold/map/quest/nearby interaction;
- battle HUD: target/readiness/attack/showcase skills/rest/result return;
- game menu: save/load/inventory/developer toggle/class switch;
- diagnostics remain available only after explicit Developer opt-in.

The legacy developer UI stays in the DOM as a compatibility/debug surface but is visually suppressed for normal human play.

## S9 world/quest integration

`ReconstructionWorldAuthority` is now the player-facing offline world authority.

Playable slice:

`training guide -> accept -> outer city -> encounter -> battle -> return -> turn in -> complete`

S13 aligns the reconstruction encounter request with the current playable training battle resource (`battleZoneId=0`). This mapping remains `RECONSTRUCTION_POLICY`; it is not promoted to recovered retail truth.

The world layer continues to use explicit `EncounterRequest` rather than deriving a battle zone from a field map.

## S10 presentation integration

`BattlePresentation` is connected as a consumer of the existing combat authority:

- attack timeline uses recovered ANI cadence;
- authoritative HP deltas drive hit feedback;
- enemy/player terminal transitions feed death/victory/defeat presentation policies;
- compact floating damage/camera feedback/terminal banners are reconstruction UI;
- MagicRes planning consumes the recovered effect resources while placement/staging remains reconstruction;
- audio routes are tracked centrally. The current Phaser host still runs with `noAudio:true`, so S13 does not claim playable retail audio.

Combat rules remain in the battle runtime. Presentation never calculates damage or command legality.

## S11 class/content integration

The player-facing runtime now uses `PlayableClassDefinition` and the explicit class skill catalogs for class identity, authored HP/MP, skill roster, MP costs and range pre-validation.

Swordsman:

- class 100
- authored HP 125 / MP 100
- showcase skills 1101 / 1201 / 1301

Wizard:

- class 109
- authored HP 100 / MP 130
- showcase skills 19101 / 19201 / 19301

Exact damage remains delegated to the existing reconstruction damage authority. No retail formula is inferred from authored effect fields.

## S12 progression/persistence integration

The M4 adapter owns:

- quantity inventory;
- class-compatible equipment reconciliation;
- unified battle/quest reward receipts;
- reconstruction EXP/level policy;
- SaveV2 serialization;
- S7 SaveV1 migration;
- fail-closed save validation.

Battle settlement uses one idempotent receipt and quest turn-in uses another, preventing repeated reward application.

The old scene inventory is maintained only as a compatibility projection so the already-tested equipment bonus hooks continue to work until the legacy inventory module is retired.

## Evidence boundary

### VERIFIED / RECOVERED_SECONDARY reused

- ANI common timing;
- `_03` HP-loss hit reaction;
- battle-entry explicit zone boundary;
- readiness profile and authored class rows already classified by earlier sessions.

### RECONSTRUCTION_POLICY

- M4 HUD and menu hierarchy;
- S9 NPC placement, quest, warp and battle binding;
- showcase skill gameplay behavior;
- current equipment compatibility role model;
- EXP curve and reward model;
- damage formula;
- death/impact/MagicRes staging feedback;
- S13 alignment of the quest battle request to playable `battleZoneId=0`.

### UNVERIFIED

- exact retail HUD;
- retired-server quest/reward/progression rules;
- exact retail damage formula;
- historical enemy program payloads;
- universal death state and exact MagicRes composition;
- full retail audio trigger/fade/loop behavior.

## Validation gates

S13 must pass:

- existing parser/unit/build/browser/offline suite unchanged in legacy automation mode;
- new M4 unit tests;
- new `?m4=1` integrated browser tests;
- standalone build.

After S13 is merged, S14 must run fixed-hash private-original validation and a new human/manual-style player path against the M4 interface.

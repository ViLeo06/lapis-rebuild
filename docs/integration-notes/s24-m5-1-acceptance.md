# S24 — M5.1 Player-input Acceptance / Integration

Date: 2026-09-19  
Branch: `codex/s24-m5-1-acceptance`  
Plan baseline: `57ff22363156bec7aad3acb7555208533485d193`

## Goal

S24 is the post-integration acceptance line for M5.1. The player-facing acceptance path is:

`start -> original-structure HUD -> move / zoom / fullscreen -> pointer NPC -> explicit dialogue -> accept -> spatial entrance -> visible monsters -> battle -> return -> pointer NPC -> explicit turn-in`

The gate must be exercised through normal browser input. Internal helper calls, debug selectors, the S23 compatibility auto-advance path, and Developer diagnostics do not count as player acceptance.

## Integrated upstream heads

S24 has integrated the following work into its own branch only. Main has not been changed by S24.

| Line | Integrated head / evidence | S24 use |
| --- | --- | --- |
| S20 UI archaeology | `a457cf5cbc06b6a6b4a0b1580e8527b331aec047` (final delivered head; initial integration merge `90f043963709a96a4968693d8c7f5a635fe7045a`) | implementation-ready Original UI Reference Pack, HUD region map, asset manifest, S21 handoff, Drive preview delivery and local parser validation |
| S21 HUD | `a30f0e388cc1ed778e32336a4c7568951b69643b` final note plus earlier player code | supplied the compact reconstruction shell and responsive harness; S24 then corrected its pre-S20 geometry to the S20 evidence |
| S22 pointer | `e3dc2483dae22be466a56cc275b8fb419ee4dd60` | live NPC hit bounds, hover cursor, pointer-before-move arbitration, exact entity handoff |
| S23 dialogue | `994ea9146e73ff258bd8b4dbf19a54727f494caa` | explicit dialogue session, accept/decline/turn-in/close choices, stale-session rejection |

The S21 final note records an earlier complete synthetic green checkpoint. S22 has a complete synthetic + fixed-hash private-original green run (`35416789970`). These are upstream evidence, not substitutes for a final integrated S24 run.

## S20 synchronization and HUD correction

S20's implementation-ready pack materially changed the target from the earlier S21 provisional shell. S24 therefore corrected the integrated HUD on its own integration branch rather than treating the pre-S20 S21 layout as final.

Current field relationships:

- shallow full-width top command strip;
- optional/placeholder small-map region upper-left under that strip;
- compact player portrait/status lower-left;
- low bottom-center chat/system deck;
- fixed lower-right ITEM and MAGIC quick-slot banks;
- A/S/D/F item slots and Z/X/C/V magic slots retained as disabled placeholders;
- M5.1 guide tracker remains upper-right and explicitly reconstruction-only;
- Developer diagnostics remain opt-in with zero player-HUD footprint while closed.

Current battle relationships:

- shallow top strip;
- battle command block lower-left;
- target/status compact at upper-right;
- player battle status compact at lower-right.

NPC dialogue now follows the S20 historical relationship: near-full-width bottom dock, portrait column on the left, text/choices on the right. The portrait is deliberately a placeholder until a concrete portrait binding is recovered.

These are relationship/anchor corrections. Exact mainland 2.2 pixels, alpha, fonts and control artwork remain unverified unless separately classified in S20.

## S24 shared glue

S24 connects the S22 and S23 contracts in `web/src/m4-runtime-integration.ts`.

### Pointer path

```text
real browser pointer
  -> Phaser camera world coordinate
  -> S22 world pointer target
  -> exact entity id
  -> beginNpcInteraction(..., inputSource='pointer')
  -> S23 dialogue session
  -> player clicks explicit dialogue choice
  -> chooseNpcInteraction(...)
  -> quest state transition
```

An NPC click is consumed before map movement. Opening a dialogue does not mutate the quest.

### Keyboard path

Keyboard `E` resolves a nearby NPC and calls the same S23 begin-dialogue API with `inputSource='keyboard'`. It does not maintain a second quest path.

### Explicit choices

The S20-aligned bottom-docked player surface renders S23 choices as real buttons:

- `accept-quest`
- `decline-quest`
- `turn-in-quest`
- `close`

Only clicking an available choice can advance the reconstruction quest. The old `ReconstructionWorldAuthority.interact(...)` compatibility adapter remains for older regressions, but S24 acceptance does not use it as proof.

On `quest-completed`, S24 routes settlement through the existing S12 reward authority. The receipt remains the idempotency boundary.

### Stale-session boundaries

An active dialogue is cleared on:

- battle entry;
- world/map transition;
- system-menu opening;
- class switch;
- save restore/read;
- Escape.

S23 separately rejects stale sessions when the quest stage no longer matches the stage on which the session opened.

## Player dialogue surface

S24 adds a compact player-facing dialogue layer under `#m4-dialogue-root`.

It is intentionally:

- separate from Developer diagnostics;
- bottom-docked and near-full-width, replacing/overlaying the lower deck relationship;
- portrait-left / text-and-actions-right;
- hard-bordered and compact;
- moderately translucent;
- free of glass/modern dashboard treatment.

This exact geometry and alpha are **RECONSTRUCTION_POLICY** until S20 supplies stronger retail UI evidence.

The DOM exposes only acceptance semantics:

- `data-ui="npc-dialogue"`
- `data-input-source="pointer|keyboard"`
- `data-dialogue-choice="<choice-id>"`

These are engineering test hooks, not retail UI claims.

## Local validation while hosted runners are unavailable

GitHub hosted runner allocation became unavailable during the integration pass: affected S20/S21/S23/S24 jobs terminate before checkout with `runner_id=0` and `steps=[]`. S24 therefore performed local checks that do not require the private-original runtime.

Completed locally on the current S20-aligned UI:

- TypeScript syntax/transpile checks for the changed HUD renderers;
- rebuilt `game-ui-shell` unit suite: **7/7 passed, 0 failed**;
- system Chromium geometry review at **1366x768** and **1920x1080**:
  - top strip = 32 px;
  - 1366 player plate approximately 280 x 60, left/bottom gap 8/6 px;
  - 1920 player plate remains approximately 280 x 60;
  - small map 152 x 76 under the top strip;
  - quest frame stays hard-right;
  - bottom-center deck and lower-right quick-slot bank stay on the bottom edge with no overlap;
  - 8 quick slots remain disabled;
  - no horizontal overflow;
- dialogue geometry at 1366x768:
  - 8 px left/right, 6 px bottom;
  - 1350 px wide;
  - approximately 23% viewport height;
  - 250 px portrait column;
- battle geometry at 1366x768:
  - command block lower-left;
  - target/state upper-right;
  - player plate lower-right;
  - no horizontal overflow.

Manual screenshot review found no return to the previous large-card/dashboard layout.

Preliminary structure screenshots were uploaded to private Drive folder `lapis-rebuild-assets/40_previews/S24-m5-1-acceptance-20260919/` as:

- `s24-local-static-field-1366x768.png`
- `s24-local-static-field-1920x1080.png`
- `s24-local-static-dialogue-1366x768.png`
- `s24-local-static-battle-1366x768.png`

They are explicitly local/static structure evidence, **not** final fixed-hash private-original acceptance screenshots.

## Acceptance harness

`web/e2e/s24-m5-1-acceptance.spec.ts` currently contains:

### Desktop HUD gate

At 1366x768 and 1920x1080:

- no horizontal overflow;
- formal HUD regions remain in viewport;
- top command strip stays 28–36 px and spans the desktop width;
- player plate stays compact at lower-left (<= 300 px wide / <= 70 px high in the current reconstruction geometry);
- small-map placeholder stays upper-left below the top strip (<= 160 px wide);
- quest frame stays within 10 px of the right edge below the top strip;
- bottom-center deck and lower-right quick-slot bank stay within 10 px of the bottom edge and do not overlap the player plate or each other;
- all 8 historical A/S/D/F and Z/X/C/V quick-slot placeholders remain disabled;
- Developer diagnostics are absent by default;
- screenshots and geometry JSON are captured.

S20's implementation-ready relationship map is now integrated. Exact mainland 2.2 pixel geometry, font metrics, alpha and decoded control artwork remain unverified; the current responsive pixel values are still `RECONSTRUCTION_POLICY`.

### Synthetic dialogue glue gate

A public/synthetic-pack browser test proves the S24/S23 semantics independently of private original pixels:

1. start at the guide;
2. real keyboard `E` opens a dialogue;
3. the quest remains `not_started`;
4. dialogue reports `data-input-source="keyboard"`;
5. a real click on `accept-quest` advances to `accepted`;
6. a second `E` opens the progress dialogue;
7. Escape closes the dialogue without changing the quest;
8. Developer diagnostics remain off.

### Final fixed-hash private gate

The private-original gate requires:

1. recovered B1001 guide visible;
2. hover cursor is `pointer`;
3. real pointer click is consumed by the NPC and creates no movement route;
4. quest remains `not_started` until the player clicks `accept-quest`;
5. zoom/reset/fullscreen use browser keyboard input;
6. equipment is changed through the player UI;
7. spatial door moves to the interior;
8. B4524/B4544 recovered monster visuals are visible;
9. encounter enters battle without debug selectors;
10. battle reports `m5-reconstruction-combat-balance-v2` / `RECONSTRUCTION_POLICY`;
11. real tactical move/target/attack input can win the encounter;
12. return produces `ready_to_turn_in`;
13. a second real NPC pointer click opens a turn-in dialogue;
14. only a click on `turn-in-quest` completes it;
15. final reward remains 15 gold / 300 EXP / Lv.3 for this reconstruction slice;
16. SaveV2 exports quest stage `complete`;
17. diagnostics stay off;
18. final 1366x768 and 1920x1080 screenshots are captured.

## Evidence boundary

### VERIFIED / VERIFIED-ENGINEERING reused

- S22 pointer hit arbitration has passed synthetic and fixed-hash private-original CI on its own branch.
- S21 has a recorded prior full synthetic green checkpoint.
- fixed-hash 2.2 map/ANI/SPR source bytes and the existing M5 private asset pipeline remain original-client inputs where already classified by earlier sessions.

### RECONSTRUCTION_POLICY

- B1001 identity as this training guide;
- B4524/B4544 use in this training encounter;
- training-house carrier/map binding;
- offline dialogue text and quest rules;
- exact dialogue window styling/alpha;
- S19 combat balance and final reward arithmetic.

### Not yet final / blocked

- S20 PR #35 is now open and non-draft at `a457cf5...`. Its Drive reference pack has been delivered and local TDG parser/static syntax checks passed. The GitHub-hosted private contact-sheet workflow still cannot execute because runner assignment fails before steps begin.
- The latest S20/S21/S23/S24 GitHub Actions attempts are currently failing before checkout with no hosted runner assignment (`runner_id=0`, `steps=[]`). Re-running the latest S24 failed job produced the same infrastructure-level result.
- Therefore the integrated S24 head has not yet received a fresh code-executing full synthetic/private-original/soak run.
- The local Chromium checks above validate structure only. They do not replace the final fixed-hash runtime acceptance.

## Final closeout checklist

S24 is not complete until all of the following are done:

1. Recheck S20/S21/S22/S23 heads for any changes after the currently integrated versions and synchronize only durable final deltas.
2. When hosted runners recover, execute S20's private contact-sheet workflow and compare it against the already delivered Drive reference pack and integrated relationship map.
3. Full TypeScript typecheck, unit tests and production build execute successfully on the integrated head.
4. Chromium E2E executes successfully, including the synthetic explicit-dialogue test.
5. A fixed-hash 2.2 `[private-smoke]` run executes the final real pointer/dialogue/battle flow.
6. The standalone private HTML passes offline/no-external-request acceptance.
7. The required `[private-soak]` wall-clock soak executes successfully.
8. Final HTML size and SHA-256 are recorded.
9. Final S24 acceptance screenshots are copied to private Drive under `lapis-rebuild-assets/40_previews/S24-m5-1-acceptance-20260919/`.
10. S24 opens its PR to main, but does not merge it.
11. The user performs the final hands-on playtest; only that can close the M5 Playability Gate.

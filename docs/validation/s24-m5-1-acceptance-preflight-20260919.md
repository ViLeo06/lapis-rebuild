# S24 M5.1 Player-input Acceptance — Preflight + Final Record

Date: 2026-09-19  
Branch: `codex/s24-m5-1-acceptance`  
Plan baseline: `57ff22363156bec7aad3acb7555208533485d193`  
Validated executable head: `3eb57f19d0bfcb9ea60d1ca05f2af39c76ca8cf7`

## Purpose

This file began as the S24 preflight record. It now also records the final post-integration acceptance so the earlier runner outage is not mistaken for the current status.

S24 closes the M5.1 engineering path:

`pointer NPC -> explicit dialogue -> click Accept -> spatial entrance -> visible monsters -> battle -> return -> pointer NPC -> click Turn in`

The player flow must use browser input rather than debug selectors or direct gameplay mutation helpers.

## Integrated dependency heads

Final S24 integration uses:

- S20 UI archaeology/reference pack: `a457cf5cbc06b6a6b4a0b1580e8527b331aec047`
- S21 HUD final note/head: `a30f0e388cc1ed778e32336a4c7568951b69643b`
- S22 pointer: `e3dc2483dae22be466a56cc275b8fb419ee4dd60`
- S23 dialogue/quest: `994ea9146e73ff258bd8b4dbf19a54727f494caa`

S24 applies the S20 edge-chrome relationships to the integrated player shell and binds S22 pointer arbitration to the S23 explicit dialogue authority.

## Final workflow evidence

GitHub Actions run `35429647238` on head `3eb57f19...` completed successfully.

| Gate | Result |
| --- | --- |
| synthetic job | PASS |
| private-original job | PASS |
| parser / locked dependency / typecheck / unit / build steps | PASS |
| Chromium integration tests | PASS |
| private standalone preview | PASS |
| real-resource browser + offline tests | PASS |
| Real thirty-minute diagnostic soak | PASS |

Private E2E report:

- expected/pass: `57`
- skipped: `4`
- unexpected: `0`
- flaky: `0`

All four S24 specs executed and passed:

- required desktop viewport geometry / diagnostics-off gate;
- standalone offline/no-network gate;
- synthetic explicit-dialogue glue gate;
- final real-pointer private gate.

## Final private artifact

`private-original-validation`

- artifact id: `10581071412`
- archive size: `51,953,619` bytes
- artifact digest: `sha256:9b0c133fd631750d235bb509eb1de27f1fd86740b662c47c02dd8ecaf6442474`

Standalone HTML inside the artifact:

- `_temp/lapis-private.html`
- size: `11,210,188` bytes
- SHA-256: `b08b9b851f6dd89a4fb265d91c2fd6000a4c5726ca588efaabaa2f0fac8be8d5`

The offline S24 spec loads that HTML through `file://`, asserts the field HUD is active with diagnostics off, records HTTP(S) requests and requires the list to be empty. It passed.

## Real-pointer acceptance proof

The final private S24 gate is not an internal helper simulation. It uses Playwright mouse/keyboard input and validates state only through read-only snapshots/assertions.

It proves:

1. recovered guide visible; hover cursor is `pointer`;
2. pointer click is consumed by NPC and produces no movement route;
3. quest remains `not_started` while dialogue is merely open;
4. explicit player click on Accept advances to `accepted`;
5. real keyboard zoom/reset/fullscreen path works;
6. player UI equipment changes apply;
7. pointer movement to the door transitions to map 7 / objective stage;
8. recovered resource IDs 4524 and 4544 are visible;
9. pointer movement to encounter enters battle zone 0;
10. tactical target/move/attack input wins under `m5-reconstruction-combat-balance-v2`;
11. Return restores the field with `ready_to_turn_in`;
12. second pointer NPC activation opens the turn-in dialogue without click-through movement;
13. explicit Turn in click produces `complete`;
14. final reconstruction result is 15 gold / 300 EXP / Lv.3;
15. SaveV2 persists `quest.stage=complete`;
16. diagnostics stay off and page errors remain empty.

## Screenshot / geometry proof

Final screenshots from the same artifact were inspected directly:

- `s24-final-player-input-1366x768.png` — exactly 1366x768
- `s24-final-player-input-1920x1080.png` — exactly 1920x1080

Both show the completed field state with no Developer diagnostics. `s24-hud-geometry.json` confirms no horizontal overflow and keeps the required desktop shell regions in bounds. The artifact also includes the visible-NPC, interior-monsters, battle, victory and quest-complete stage screenshots.

## Soak proof

`test-results/soak/report.json`:

- status: `passed`
- elapsed: `1,800,632 ms`
- sample count: `59`
- errors: `[]`
- final sample at `1,800,026 ms`, `35 FPS`
- playable recovery, camera follow, guide visibility and SaveV2 remained valid in the sampled state.

## Evidence boundary

The green S24 gate is engineering proof for this reconstruction and fixed-hash private asset pipeline. It does **not** prove that the reconstruction-only NPC identities, monster encounter identities, map/trigger binding, quest rules, exact UI styling, combat formula or rewards match the retired retail server.

Those items remain `RECONSTRUCTION_POLICY` unless separately upgraded by stronger historical evidence.

## Final conclusion

**S24 M5.1 engineering acceptance: PASSED.**

PR #36 can be moved from Draft to **Ready for review**. Do not merge `main` yet. The final gate is the user's hands-on playtest of the standalone private HTML for control feel, readability, navigation clarity and difficulty.

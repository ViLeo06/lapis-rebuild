# S24 M5.1 Player-input Acceptance — Preflight + Final Record

Date: 2026-09-19  
Branch: `codex/s24-m5-1-acceptance`  
Plan baseline: `57ff22363156bec7aad3acb7555208533485d193`  
Validated executable head: `dcc0c412635245b4d26118ce5ec3f675bc959001`

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

GitHub Actions run `35433856641` on head `dcc0c412...` completed successfully.

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

- passed: `58`
- skipped: `4`
- unexpected: `0`
- flaky: `0`

All five S24 specs executed and passed:

- required desktop viewport geometry / diagnostics-off gate;
- standalone offline/no-network gate;
- synthetic explicit-dialogue glue gate;
- mobile touch NPC / world movement / battle skill gate;
- final real-pointer private gate.

## Final private artifact

`private-original-validation`

- artifact id: `10582154008`
- archive size: `53,011,314` bytes
- artifact digest: `sha256:99627bfc7bc0934b8e0a48ef3d711b1ab244c808f77f3aeae2a4d0bff1c68da0`

Standalone HTML inside the artifact:

- `_temp/lapis-private.html`
- size: `11,211,980` bytes
- SHA-256: `768bf6e26eb3f933733f19fb290940e62c5fea33d6d3a284c0a1f2fb8806c696`

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

## Mobile-touch acceptance proof

The new phone gate runs at `390x844` with Playwright touch enabled and no keyboard dependency for the tested flow.

It proves:

1. direct NPC tap opens a pointer-sourced dialogue and does not create a movement route;
2. a visible touch interaction button can open the same dialogue authority;
3. Decline and Accept choices are tappable and remain explicit quest-state boundaries;
4. touch movement reaches the training-house door;
5. off-screen destinations are approached through visible touch points while camera-follow recenters the phone viewport;
6. touch movement reaches the encounter and enters battle;
7. enemy target selection works through touch;
8. tapping skill `1301` executes the skill and consumes MP/readiness;
9. mobile menu, interaction and battle controls checked by the gate meet the 44 px touch-target floor;
10. no horizontal overflow occurs at 390 px width.

The first private mobile run failed only because the test attempted a direct tap on an off-screen encounter cell. The final test uses visible phone-sized touch steps and passed on the fixed-hash private pack.

Artifact screenshots:

- `s24-mobile-touch-field-390x844.png` — exactly 390x844
- `s24-mobile-touch-battle-390x844.png` — exactly 390x844

## Screenshot / geometry proof

Final screenshots from the same artifact were inspected directly:

- `s24-final-player-input-1366x768.png` — exactly 1366x768
- `s24-final-player-input-1920x1080.png` — exactly 1920x1080

Both show the completed field state with no Developer diagnostics. `s24-hud-geometry.json` confirms no horizontal overflow and keeps the required desktop shell regions in bounds. The artifact also includes the visible-NPC, interior-monsters, battle, victory and quest-complete stage screenshots.

## Soak proof

`test-results/soak/report.json`:

- status: `passed`
- elapsed: `1,800,712 ms`
- sample count: `58`
- errors: `[]`
- external HTTP(S) requests: `[]`
- final sample at `1,800,054 ms`, `32 FPS`
- playable recovery, camera follow, guide visibility and SaveV2 remained valid in the sampled state.

## Evidence boundary

The green S24 gate is engineering proof for this reconstruction and fixed-hash private asset pipeline. It does **not** prove that the reconstruction-only NPC identities, monster encounter identities, map/trigger binding, quest rules, exact UI styling, combat formula or rewards match the retired retail server.

Those items remain `RECONSTRUCTION_POLICY` unless separately upgraded by stronger historical evidence.

## Final conclusion

**S24 M5.1 engineering acceptance: PASSED.**

PR #36 can be moved from Draft to **Ready for review**. Do not merge `main` yet. The final gate is the user's hands-on playtest of the standalone private HTML for control feel, readability, navigation clarity and difficulty.

# S24 — M5.1 Player-input Acceptance / Integration

Date: 2026-09-19  
Branch: `codex/s24-m5-1-acceptance`  
Plan baseline: `57ff22363156bec7aad3acb7555208533485d193`  
Validated executable head: `dcc0c412635245b4d26118ce5ec3f675bc959001`

## Final engineering status

**PASSED.** GitHub Actions run `35433856641` completed successfully on the exact executable head above, including the mobile-touch extension.

- `synthetic`: **success**
- `private-original`: **success**
- private-original `Real thirty-minute diagnostic soak`: **success**
- `private-original-validation` artifact: `10582154008`
- artifact archive size: `53,011,314` bytes
- artifact digest: `sha256:99627bfc7bc0934b8e0a48ef3d711b1ab244c808f77f3aeae2a4d0bff1c68da0`

The earlier hosted-runner allocation issue is resolved for this acceptance run. The prior local/static screenshots remain useful historical preflight evidence, but they are no longer the final acceptance basis.

## Accepted player path

The final fixed-hash private gate executes the player-facing path through normal browser input:

`start -> original-structure HUD -> zoom/fullscreen -> pointer NPC -> explicit dialogue -> click Accept -> spatial entrance -> visible recovered monsters -> encounter -> tactical battle -> victory -> return -> pointer NPC -> explicit Turn in -> SaveV2`

The S24 E2E gate proves the following on private original resources:

1. the recovered guide is visible and hover resolves to a `pointer` cursor;
2. a real browser pointer click is consumed by the NPC, leaves route length at zero and does not fall through to field movement;
3. opening the NPC dialogue leaves the quest at `not_started`;
4. only a real click on `accept-quest` advances the quest to `accepted`;
5. zoom/reset/fullscreen are exercised with browser keyboard events;
6. equipment is changed through player UI;
7. pointer movement into the configured door cell transitions spatially to the interior and advances to `objective`;
8. recovered B4524 and B4544 monster visuals are visible before battle;
9. pointer movement into the encounter cell enters battle without a debug selector;
10. battle uses `m5-reconstruction-combat-balance-v2` with provenance `RECONSTRUCTION_POLICY`;
11. actual tactical target/move/attack input wins the encounter;
12. Return goes back to the field and produces `ready_to_turn_in`;
13. a second real NPC pointer click opens a pointer-sourced turn-in dialogue without moving the player;
14. only a real click on `turn-in-quest` completes the quest;
15. final reconstruction reward is 15 gold / 300 EXP / Lv.3;
16. SaveV2 exports quest stage `complete`;
17. Developer diagnostics remain off throughout the final player gate and no page errors are accepted.

The private E2E report for the run records `58 passed`, `4 skipped`, `0 unexpected`, `0 flaky`. All five S24 acceptance specs executed and passed, including the mobile-touch gate and the final desktop pointer gate. The skipped cases are older compatibility choreography superseded by the private M5 path; they are not S24 acceptance skips.

## Standalone private HTML / offline evidence

Final standalone private HTML from artifact `10582154008`:

- file: `_temp/lapis-private.html`
- bytes: `11,211,980`
- SHA-256: `768bf6e26eb3f933733f19fb290940e62c5fea33d6d3a284c0a1f2fb8806c696`

The S24 standalone test opens this file through `file://`, waits for the M4/M5 player runtime and formal HUD, asserts Developer diagnostics are absent, records every HTTP(S) request, and requires that request list to remain empty. That test passed in run `35433856641`.

## Thirty-minute soak

Artifact `test-results/soak/report.json` records:

- status: `passed`
- elapsed: `1,800,712 ms`
- samples: `58`
- errors: `[]`
- external HTTP(S) requests: `[]`
- final sample elapsed: `1,800,054 ms`
- final sampled FPS: `32`
- `playableRecovery=true`
- `cameraFollow=true`
- recovered guide visible
- SaveV2 version `2`

The soak covers real-time field stability, class switching, legal equipment, save/load, camera follow, recovered guide visibility and diagnostics toggling. The full spatial quest/battle/turn-in chain is covered separately by the final S24 private gate above.

## Final screenshot gate

Artifact screenshots were checked directly:

- `test-results/s24-final-player-input-1366x768.png` — PNG, exactly `1366x768`
- `test-results/s24-final-player-input-1920x1080.png` — PNG, exactly `1920x1080`

Both show the completed field state with the compact original-structure reconstruction shell, no Developer diagnostics and no horizontal overflow. The geometry report confirms:

- 32 px full-width top strip at both desktop sizes;
- compact 280 x 60.5 px lower-left player plate;
- 152 x 76 px upper-left small-map region;
- upper-right guide tracker stays inside the viewport;
- bottom-center deck and lower-right quick-slot bank stay on the bottom edge without overlap;
- all 8 A/S/D/F and Z/X/C/V quick-slot placeholders remain disabled.

The same artifact also contains the visual chain:

- `m5-01-visible-npc-camera.png`
- `m5-02-auto-interior-visible-monsters.png`
- `m5-03-recovered-monster-battle.png`
- `m5-04-balanced-victory.png`
- `m5-05-quest-complete.png`

These corroborate the runtime assertions for visible guide -> interior monsters -> battle -> victory -> completed field return.

## Mobile-touch revalidation

S24 now treats phone interaction as a first-class player-input contract rather than a desktop fallback.

At a Playwright mobile viewport of `390x844` with touch enabled, the fixed-hash private-original gate proves:

1. keyboard `E` remains available on desktop, but phone play does not require a keyboard;
2. directly tapping the visible guide NPC opens the same S23 dialogue authority used by desktop pointer interaction;
3. a nearby-NPC `data-action="interact"` control provides an explicit touch fallback and routes through the same NPC authority;
4. Accept / Decline / Turn in / Close dialogue choices are touch controls;
5. touch movement reaches the training-house door and transitions to the interior;
6. when the encounter target is initially off-screen, repeated touches on visible HUD-safe world points plus camera-follow can advance naturally until the target enters the viewport;
7. touch target selection works in battle;
8. skill `1301` is activated by tapping the rendered skill button, consuming MP/readiness without keyboard hotkeys;
9. primary phone controls used by this gate are at least 44 px high;
10. the mobile document remains within the 390 px viewport with no horizontal overflow.

The first private mobile attempt failed because the test tried to tap an encounter cell outside the phone viewport. The runtime itself had already transitioned correctly to the interior. Commit `dcc0c412...` corrected the acceptance choreography to use only visible touch points, matching actual phone interaction.

Final mobile screenshots in artifact `10582154008`:

- `test-results/s24-mobile-touch-field-390x844.png` — exactly `390x844`
- `test-results/s24-mobile-touch-battle-390x844.png` — exactly `390x844`

## Evidence boundary

### VERIFIED / VERIFIED-ENGINEERING

- run `35433856641` executed successfully on executable head `dcc0c412...`;
- synthetic and fixed-hash private-original jobs are green;
- final S24 pointer/dialogue/spatial/battle/turn-in gate passed;
- standalone private HTML loads offline with zero HTTP(S) requests;
- final 1366x768 and 1920x1080 screenshot/geometry gates passed;
- required real 30-minute soak passed.

### RECONSTRUCTION_POLICY remains

- B1001 identity as this training guide;
- B4524/B4544 use in this training encounter;
- training-house carrier/map binding and trigger cells;
- offline quest/dialogue rules;
- exact UI pixels/alpha/fonts where S20 did not recover authoritative retail values;
- S19 combat balance and reward arithmetic.

Passing S24 does not promote these reconstruction choices to historical retail facts.

## Closeout

S24 engineering acceptance is complete. PR #36 may be **Ready for review**, but it must **not** be merged to `main` yet.

The remaining M5.1 gate is the user's final hands-on playtest of the standalone private HTML. That manual playtest, not CI, decides whether the player experience is acceptable for merge/release.

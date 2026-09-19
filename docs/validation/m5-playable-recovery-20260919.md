# M5 Playable Recovery — Final Validation

Date: 2026-09-19

Integration branch: `codex/m5-playable-recovery-integration`

Validated executable head before the final soak trigger:

`ce37fa870e09ab7ae3fc628e2acb0a04a50932ff`

Current main before the integration PR:

`3406f234bf43c5447d9a37b138ca6d53ac1ec881`

## Private M5 smoke result

GitHub Actions run:

`35398106772`

Result:

- synthetic: success
- fixed-hash 2.2 private-original: success
- private standalone HTML: success
- real-resource Chromium/offline: success
- 52 Playwright cases discovered
- 48 passed
- 4 skipped because the private M5 path supersedes the older M4 compatibility choreography

The M5 private-original playable-recovery acceptance passed in 52.2 seconds.

## Proven player flow

The successful M5 acceptance exercises the player-facing path without a debug map selector:

`start -> camera/zoom/fullscreen -> visible recovered NPC -> accept quest -> walk to door -> automatic transition to map 7 -> visible recovered monsters -> automatic proximity encounter -> balanced 2v1 battle -> victory -> return -> NPC turn-in -> SaveV2`

Private pack inputs include:

- map 0
- map 1
- map 7
- B1001 world-character visual
- B4524 monster visual
- B4544 monster visual

All original pixels come from the fixed-hash 2.2 client pipeline. Their M5 gameplay bindings remain `RECONSTRUCTION_POLICY`.

## S19 simulator / runtime alignment

The first private M5 run exposed a real simulator/runtime mismatch:

- S19 simulator used a 1.9s enemy base cadence with per-enemy stagger;
- live `battle.ts` still used the older provisional 1.6s interval;
- live 2v1 therefore produced materially more enemy pressure than the simulator predicted.

The runtime now consumes the S19 cadence directly.

Combat balance policy was advanced to:

`m5-reconstruction-combat-balance-v2`

v2 also changes damage to a calibrated subtractive reconstruction:

`round(offense * skillMultiplier - defense * 0.65)`

The direction is informed by the 2007 Japanese player candidate archived through PR #27, but the coefficient and complete formula remain reconstruction policy. It is not claimed as the mainland retail server formula.

Representative level-1 equipped swordsman guardrails:

- player normal hit against the training melee profile: about 27
- melee training enemy normal hit into the swordsman: about 8
- ranged training enemy normal hit into the swordsman: about 7
- wizard remains more fragile to physical attacks

## Evidence boundary

VERIFIED / recovered inputs:

- fixed-hash 2.2 asset bytes
- existing authored class anchors
- recovered ANI/SPR decoding
- S15–S19 module behavior and automated test results
- 2007 later-region player formula as an external historical observation only

RECONSTRUCTION_POLICY:

- B1001 identity as this training guide
- B4524/B4544 identity as this training encounter
- map 7 use as this training-house interior
- trigger locations and quest binding
- final battle arithmetic
- enemy timing policy where old-server authority is missing
- rewards/progression values

## Final result

Final smoke/soak head:

`6c174516f6575a26c1cc2583a07a24acf51c39b9`

Final GitHub Actions run:

`35405864082`

Final result:

- synthetic: **success**
- fixed-hash 2.2 private-original: **success**
- private standalone HTML: **success**
- real-resource Chromium/offline: **success**
- M5 private playable-recovery acceptance: **success**
- real M5 30-minute wall-clock soak: **success**

The final soak recorded:

- status: `passed`
- elapsed: `1,800,406 ms`
- samples: `59`
- browser/page errors: `[]`
- external HTTP(S) requests: `[]`
- camera follow: active throughout sampled field states
- B1001 guide visual: visible throughout sampled field states
- repeated swordsman/wizard switching, legal equipment, SaveV2 save/load and diagnostics toggling

Final private HTML:

- bytes: `11,190,078`
- SHA-256: `12cd51547679d4aae225f5382941ddd93c878e3a93a56910607012f5fe3d9140`
- artifact: `10572758666`

Final player-flow acceptance ended with:

- battle phase: `won`
- sampled player HP at victory: `44 / 125`
- both training enemies: `0 HP`
- quest: `complete`
- gold: `15`
- EXP: `300`
- level: `3`
- SaveV2 receipt/state persisted

## Acceptance conclusion

**M5 Playable Recovery engineering acceptance: PASSED.**

This proves the fixed-hash private reconstruction can now execute the complete intended M5 loop with recovered client visuals and explicit reconstruction authority.

It does **not** prove that B1001/B4524/B4544/map7 were the historical retail identities for this exact training flow, nor that balance v2 reproduces the retired-server formula.

The remaining gate is user-experience validation: the user should play the final HTML and judge control feel, readability, navigation clarity and difficulty. Those findings belong to M5.1.

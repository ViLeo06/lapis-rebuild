# M5 Playable Recovery — S15–S19 Runtime Integration

Branch: `codex/m5-playable-recovery-integration`

Base after S15–S19 merge: `899774a1cedd8618945894d07f424a849adbdc5e`

## Goal

Wire the five M5 modules into the player-facing runtime so the private single HTML supports a natural loop:

`viewport/fullscreen -> camera-follow movement -> visible NPC -> quest accept -> spatial door -> interior -> visible monsters -> balanced battle -> return -> turn-in`

The integration deliberately preserves the existing synthetic/legacy runtime as a compatibility fallback. M5 private-only behavior is enabled only when the fixed 2.2 pack contains map 7 plus recovered visual families B1001, B4524 and B4544.

## S15 viewport / camera

The real Phaser scene now uses `ViewportController` and `BrowserFullscreenPort`.

Player-facing controls:

- menu fullscreen toggle
- zoom in / zoom out / reset 1:1
- keyboard F / + / - / 0
- field player camera follow with world-edge clamp
- battle framing remains battle-specific

Existing Phaser world-point input remains the final pointer conversion, while S15 coordinate tests guard zoom/camera transforms.

## S16 NPC visual

Fixed 2.2 private pack now exports B1001 actions 00–03.

B1001 was manually reviewed in the S16 private gallery as a coherent knight-like world-character family. The pixels/actions are original client resources.

The binding:

`training-guide -> B1001`

is **RECONSTRUCTION_POLICY**. It is not claimed to be the original identity of a specific retail quest NPC.

The earlier S16 conclusion remains: `NPC350.Tip` is a portrait library; it is not used as field placement or as proof that NPCScript block IDs equal visual IDs.

## S17 monster visual

Fixed private pack exports:

- B4524 -> M5 melee training visual
- B4544 -> M5 ranged training visual

The roster visual-model → live unit → ANI model dataflow is recovered static evidence. The concrete training bindings `dummy-melee/dummy-ranged` remain reconstruction choices.

Runtime uses:

- slot 00 idle
- slot 01 movement when available
- slot 02 attack
- slot 03 verified hit reaction

No universal retail death slot is claimed. Dead training monsters are removed/faded by reconstruction presentation.

## S18 spatial world transition

Private pack adds real client map 7:

`布日古斯_本城_大厅`

M5 uses it as the interior carrier for:

`训练屋（重构场景）`

This does **not** claim map 7 was historically the exact retail training house.

The flow is data-driven:

- map 1 field
- visible `训练屋入口` marker
- entering the spatial trigger after accepting the quest automatically transitions to map 7
- map 7 has a visible exit marker
- returning through the exit returns to map 1

No debug map selector is required.

## S19 combat balance

M5 player battles opt into:

`m5-reconstruction-combat-balance-v1`

The old server formula remains unrecovered.

M5 battle creation uses:

- authored class HP/MP/hit/magic-hit as retained anchors
- S19 player ATK/DEF/MATK/MDEF/HIT/EVA/CRIT reconstruction stats
- level-aware normal melee/ranged enemy profiles
- bounded hit/critical/damage rules
- equipment bonuses
- S19 encounter rewards through the existing idempotent reward pipeline

Synthetic/legacy tests without an M5 battle setup continue to use the old training policy so historical regressions remain meaningful.

## Private pack additions

`tools/prepare_web.py` now adds:

- map 7
- B1001 actions 00–03
- B4524 actions 00–03
- B4544 actions 00–03

These generated original pixels remain private build artifacts and are not committed to Git.

## Acceptance gate

Private-original M5 E2E must prove, without debug selectors:

1. recovered B1001 NPC is visible;
2. zoom controls change the real camera and reset to 1:1;
3. fullscreen path is exercised when supported;
4. moving toward the door changes the camera via player follow;
5. entering the door automatically loads map 7;
6. B4524/B4544 are visible before battle;
7. proximity automatically starts battle;
8. battle reports S19 policy provenance;
9. recovered monster visual IDs are bound in battle;
10. equipped swordsman can win the two-enemy reconstruction encounter;
11. S19 battle reward is applied;
12. return to map 1 and NPC turn-in complete SaveV2 quest state.

## Evidence boundary

VERIFIED / recovered inputs are kept separate from reconstruction bindings.

- original map/ANI/SPR bytes: fixed-hash private resources
- B1001 identity as the training guide: RECONSTRUCTION_POLICY
- B4524/B4544 use as this training encounter: RECONSTRUCTION_POLICY
- map 7 use as the training-house interior: RECONSTRUCTION_POLICY
- spatial trigger positions and quest binding: RECONSTRUCTION_POLICY
- all S19 final arithmetic/rewards: RECONSTRUCTION_POLICY

Passing the acceptance proves a playable reconstruction path. It does not promote any of those reconstruction choices to retail truth.

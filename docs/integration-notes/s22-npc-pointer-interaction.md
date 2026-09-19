# S22 — NPC Pointer / Hitbox / Input Arbitration

> Branch: `codex/s22-npc-pointer-interaction`  
> M5.1 plan baseline: `57ff22363156bec7aad3acb7555208533485d193`

## Goal

Repair the user-facing break reported on 2026-09-19:

`visible NPC -> real pointer target -> shared world interaction intent -> quest/dialogue authority`

NPC clicks must never fall through to field click-to-move. Keyboard `E` remains an alternate input, but both paths enter the same `M4RuntimeIntegration.interactWorld(...)` authority.

## Existing boundary reused

- S9/S13 already provide `ReconstructionWorldAuthority` and the keyboard `E` path.
- S16 provides presentation-only NPC visuals. S22 does not infer NPC identity from sprite/resource numbers.
- S18 provides map/cell spatial semantics. S22 does not change transition or encounter policy.
- S15 camera state is respected by converting Phaser pointer coordinates through the active camera before hit-testing.

## Implementation

- `web/src/input/world-pointer-arbitration.ts`
  - pure world-space rectangle arbitration;
  - visible NPCs only for the S22 interaction path;
  - overlapping targets resolve by render depth;
  - sprite + visible label bounds are unioned;
  - a small padded/minimum rectangle makes old cropped sprites reliably clickable.
- `LabScene`
  - exposes a world-interaction handler;
  - derives live NPC hitboxes from the currently rendered `VisualActor` and label;
  - checks NPC targets before the legacy field `moveTo(...)` path;
  - publishes hitboxes in diagnostics for browser acceptance.
- `M4RuntimeIntegration`
  - installs the scene handler;
  - accepts an optional explicit entity id for pointer input;
  - pointer and keyboard paths both call the same world authority.
- `m5-playable-recovery.spec.ts`
  - accepts the training quest by a real browser mouse click on the rendered guide;
  - asserts no route/map movement was created by that NPC click;
  - keeps keyboard `E` for turn-in so both inputs exercise the same authority.

## Evidence boundary

The existence of recovered retail proximity-gated interaction is supported by earlier S1/S4 work. The exact browser hitbox padding/minimum size is **RECONSTRUCTION_POLICY**, not recovered retail UI geometry. S22 changes input ergonomics only and does not upgrade reconstructed NPC placement, NPC identity binding, quest rules, or server-authoritative behavior to VERIFIED.

## Acceptance

Required on this branch:

- `npm run typecheck`
- `npm test`
- `npm run build`
- Chromium E2E
- private-original M5 E2E where the fixed-hash assets are available

The private-original acceptance must deliver an actual pointer click to `training-guide`; direct calls to `talkGuide()`, `interactWorld()`, or debug-only buttons do not satisfy S22.

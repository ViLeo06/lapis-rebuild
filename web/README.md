# Web Lab

Private Web-first diagnostic and provisional training implementation. Not V1.

## Development

Node >= 22.12 and Python >= 3.12. From the repository root:

```sh
python tools/prepare_web.py --client-root /path/to/extracted/client
cd web
npm ci --ignore-scripts
npm run dev
```

The private generator validates pinned original inputs before conversion and refuses to overwrite existing output. Current real-resource pack contains maps `0000` and `0001`, B100/B109 diagnostic character actions, and MagicRes `001/002/003/035/036/037/038`. CI without private resources uses `python tools/testing/make_web_fixture.py --out web/public/game-data`; synthetic packs are labelled explicitly.

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Private no-install preview

```sh
python tools/package_web_preview.py --dist web/dist --pack web/public/game-data --out /path/to/private-preview.html
```

The resulting file is an interactive client-side Web application with runtime and assets embedded, not a screenshot. It needs no backend, local HTTP server, Node, Python or Godot. Keep original-resource previews private. IndexedDB behavior on `file:` origins varies by browser; JSON export/import remains the portable fallback.

## Manual validation handoff

Human review is a first-class gate, not an informal extra. The first user review caught two issues that structural/E2E tests did not:

- SPR multi-span rows were horizontally sliced because the span skip field had been decoded as absolute x. It is now decoded as a relative transparent skip from the previous opaque run end.
- Movement facing was horizontally mirrored. Real B100/B109 `Body_` walk rows are now mapped as `S,SW,W,NW,N,NE,E,SE` for raw rows `0..7`.

After changes to sprite decoding, direction mapping, anchors, map occlusion or effect placement, generate a fresh private standalone HTML and manually check both B100 and B109. Automated browser green status proves runtime invariants; it does not prove the image/animation looks correct.

## Current Web checkpoint

- Maps: `0000 / 对练场` and `0001 / 布日古斯_外城`.
- Characters: B100 swordsman and B109 wizard, slots `_00/_01/_02/_03/_05`, raw eight-direction inspection, pause/step/bounds/anchor diagnostics.
- Character SPR rows: relative transparent-skip decoding, with synthetic regression and fixed-hash real-resource smoke.
- Body_ direction rows checked on B100/B109: `0 S,1 SW,2 W,3 NW,4 N,5 NE,6 E,7 SE`.
- Movement: click/WASD over provisional IMF routing.
- Training: two provisional enemies, normal attack, three representative skills per class, settlement and equipment.
- MagicRes: seven real `FOCUS` resources in verified sequential SPR file order; placement/blending/timing remain `UNVERIFIED`.
- Save: IndexedDB plus JSON export/import; map, inventory/equipment and M3 task state validated before restore.
- M3 functional quest: `M3 引导员` drives `0000 -> 0001 -> 0000 -> complete`; it remains explicit `UNVERIFIED` scaffolding rather than original quest semantics.
- Source-backed diagnostics can load private Quest.lib-derived NPC/Quest/tutorial/help content without committing original dialogue bodies to Git.

## Controls and limits

Select character, raw action, direction, map and diagnostic effect; pause or step frames. Click walkable points or use WASD. Toggle grid, collision projection and bounds. Start training, select a dummy, attack/use skills, return and save. Use the M3 guide button to exercise the NPC/map/task persistence loop.

Training enemies, balance, routing policy and the M3 guide task are provisional. Maps are currently flattened diagnostic renders; foreground occlusion, authentic FOCUS placement/timing, original death behavior, audio, real NPC placement/trigger binding and full progression remain incomplete. No login, telemetry, cloud save or multiplayer.

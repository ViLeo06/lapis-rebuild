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

The private generator validates pinned original inputs before conversion and refuses to overwrite existing output. Current real-resource pack contains maps `0000` and `0001`, B100/B109 diagnostic character actions, and MagicRes `001/002/003/035/036/037/038`. CI without private resources uses `python tools/testing/make_web_fixture.py --out web/public/game-data` on a clean checkout; the page labels synthetic packs explicitly.

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

Open the HTML in a desktop browser. Runtime and assets are embedded without external CDN requests. Keep this file private. IndexedDB on file origins can vary; JSON export/import is the portable fallback. Third-party software licenses are included; original game art remains subject to its own rights.

## Current Web checkpoint

- Maps: `0000 / 对练场` and `0001 / 布日古斯_外城`.
- Characters: B100 swordsman and B109 wizard diagnostic actions `_00/_01/_02/_03/_05`, eight raw direction slots, step/pause/bounds/anchor inspection.
- Movement: click/WASD using provisional routing over parsed IMF data.
- Training: two provisional enemies, normal attack, three representative skills per class, settlement and equipment.
- MagicRes: seven real `FOCUS` resources can be inspected in verified sequential SPR file order. Placement, blending and timing semantics remain `UNVERIFIED`.
- Save: IndexedDB plus JSON export/import; map, inventory/equipment and M3 task state are validated before restore.
- M3 functional quest: `M3 引导员` drives `0000 -> 0001 -> 0000 -> complete` and persists through save/load. This task is explicitly `UNVERIFIED` scaffolding, not original quest data.

## Controls and limits

Select character, raw action, direction, map and diagnostic effect; pause or step frames. Click walkable points or use WASD. Toggle grid, collision projection and bounds. Start training, click a dummy, attack/use skills, return and save. Use the M3 guide button to exercise the NPC/map/task persistence loop.

Training enemies, balance, routing policy and the M3 guide task are provisional. Maps are currently flattened diagnostic renders; foreground occlusion, authentic FOCUS placement/timing, original death behavior, audio, real NPC/quest data and full progression remain incomplete. No login, telemetry, cloud save or multiplayer.

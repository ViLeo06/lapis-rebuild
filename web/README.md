# Web Lab

Private Web-first diagnostic and provisional gameplay implementation. Not V1.

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

Human review is a first-class gate, not an informal extra. The first two user review rounds caught issues structural/E2E tests did not:

- SPR multi-span rows were horizontally sliced because the span skip field had been decoded as absolute x. It is now decoded as a relative transparent skip from the previous opaque run end.
- Movement facing was horizontally mirrored. Real B100/B109 `Body_` walk rows are now mapped as `S,SW,W,NW,N,NE,E,SE` for raw rows `0..7`.
- The normal view exposed a route polyline and continuously visible SPR bounds/anchor box. Both are diagnostic overlays, not normal gameplay presentation; route drawing is removed from normal movement and bounds are opt-in only.
- The first battle prototype incorrectly treated combat as ordinary realtime movement on the field. Period 2003 documentation instead distinguishes non-battle state from a battle screen and describes an action-gauge tactical loop. The Web prototype now has explicit field/battle modes.

After changes to sprite decoding, direction mapping, anchors, battle flow, map occlusion or effect placement, generate a fresh private standalone HTML and manually check both B100 and B109. Automated browser green status proves runtime invariants; it does not prove the image/animation/gameplay feels like the original.

## Historical battle references

The current high-level combat architecture is based on contemporary sources, not on guessed genre conventions:

- 17173, 2003-04-03, `全新战棋策略网游《佣兵传说》精彩介绍`: explicitly states that a character waits for the **行动槽** to fill, may then move/attack, and must wait for the gauge again. `https://news.17173.com/content/2003-4-3/n586_502831.html`
- 新浪游戏, 2003-05-19, `佣兵传说Q&A`: distinguishes the **战斗画面** status/commands from the non-battle colored-orb UI and describes joining the same **战斗场景**. `https://games.sina.com.cn/zhqu/yb/article/2003-05-19/6407.shtml`
- 新浪游戏, 2003-10-27, official update report: describes “进入回合制战斗画面后” followed by realtime interaction inside the battle, supporting a semi-turn/action-gauge interpretation rather than free realtime field combat. `https://games.sina.com.cn/newgames/2003/10/10277332.shtml`
- 新浪玩家资料, 2003-12-31: refers to “移动格子”, “自己有行动回合的时候” and “加快回合循环”. `https://games.sina.com.cn/z/yb/2003-12-31/88889.shtml`

These sources verify the broad architecture. They do **not** verify the current 700 ms gauge fill, enemy cadence, path tie-break, exact action costs or battle-scene resource mapping. No trustworthy public original source-code repository has been identified yet.

## Current Web checkpoint

- Maps: `0000 / 对练场` and `0001 / 布日古斯_外城`.
- Characters: B100 swordsman and B109 wizard, slots `_00/_01/_02/_03/_05`, raw eight-direction inspection, pause/step/bounds/anchor diagnostics.
- Character SPR rows: relative transparent-skip decoding, with synthetic regression and fixed-hash real-resource smoke.
- Body_ direction rows checked on B100/B109: `0 S,1 SW,2 W,3 NW,4 N,5 NE,6 E,7 SE`.
- Field mode: click/WASD movement over provisional IMF routing; no route line; bounds/anchor box hidden by default.
- Battle mode: a distinct state/UI entered from the field prototype; action gauge must be ready before move/attack. B100 currently uses the statically recovered move baseline 5 and B109 uses 4 as provisional maximum tactical movement cells.
- Battle exit restores the field map/position saved on entry. Training enemies, exact gauge timing, AI, damage and whether every movement/attack consumes one action exactly this way remain `UNVERIFIED`.
- MagicRes: seven real `FOCUS` resources in verified sequential SPR file order; placement/blending/timing remain `UNVERIFIED`.
- Save: IndexedDB plus JSON export/import; saves are restricted to non-battle state and validate map, inventory/equipment and M3 task state before restore.
- M3 functional quest: `M3 引导员` drives `0000 -> 0001 -> 0000 -> complete`; it remains explicit `UNVERIFIED` scaffolding rather than original quest semantics.
- Source-backed diagnostics can load private Quest.lib-derived NPC/Quest/tutorial/help content without committing original dialogue bodies to Git.

## Controls and limits

In non-battle mode, click walkable points or use WASD and switch maps/characters for diagnostics. Use **进入战斗画面** to enter the current tactical prototype. In battle, wait for the action gauge to reach READY, then move within the provisional movement limit or select a target and attack/use a skill. **退出战斗** returns to the saved field position. Grid, collision and bounds remain developer diagnostics; bounds are disabled by default.

No trustworthy public original source-code repository has been found so far. The field/battle split and action-gauge concept are supported by contemporary documentation, while the current timing, training enemy implementation and many detailed battle rules are deliberately reversible approximations. Maps are still flattened diagnostic renders; foreground occlusion, authentic FOCUS placement/timing, original battle-scene selection/placement, death/audio, real NPC placement/trigger binding and full progression remain incomplete. No login, telemetry, cloud save or multiplayer.

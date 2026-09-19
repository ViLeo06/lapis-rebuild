# S20 Original UI Archaeology / Original UI Reference Pack

Status: **implementation-ready**  
Date: 2026-09-19  
Plan baseline: `57ff22363156bec7aad3acb7555208533485d193`  
Original main baseline: `abf05e1873b18bc89aaeb8dcb89aed491d4f4306`

## Evidence policy

Priority: fixed-hash 2.2 static client > same-era mainland screenshots/guides > same-era JP/KR/TW lineage > later Lapis > reconstruction inference.

- **VERIFIED** — fixed-hash 2.2 resource/binary/static parser fact.
- **VERIFIED-HISTORICAL** — dated historical screenshot/guide fact; not promoted to mainland 2.2 byte truth.
- **RECOVERED_SECONDARY** — strong recovered project evidence short of a full 2.2 UI runtime capture.
- **INFERRED** — useful candidate role/layout interpretation.
- **UNVERIFIED** — not established.

No retail executable or unknown DLL is executed in S20. Original-derived PNG/contact sheets remain private.

## Main conclusion

The surviving evidence does **not** support the current large floating-card reconstruction shell as the target. The original layout is a compact edge-chrome PC MMORPG UI:

- thin full-width top command/menu strip;
- optional upper-left small map;
- lower-left portrait/status anchor;
- low bottom chat/status/command deck;
- compact item/magic quick-slot groups around the bottom edge;
- battle-only lower-left commands plus compact right/upper-right actor status;
- NPC/quest dialogue as a wide **bottom-docked** pane with portrait left and text/actions right.

This is specific enough for S21 to restore structure without waiting for missing server behavior.

## Historical screen anchors

### 2003 mainland NPC dialogue

Source page: https://games.sina.com.cn/zhqu/yb/rwgl/zhixian.shtml  
Representative image: https://image2.sina.com.cn/gm/zhuanqu/yb/images/gongjianshou.jpg

**VERIFIED-HISTORICAL** observations:

- top command strip spans almost the full width; visible categories include Help/Status/Item/Magic/Chat/Option families;
- square-ish small map sits directly under the top strip at upper-left;
- dialogue is not a centered modal: it docks across the bottom;
- speaker portrait occupies the left sub-region; text and response actions occupy the right;
- dialogue replaces/overlays the normal bottom HUD rather than stacking a modern card over it.

### Same-era field HUD

Source: https://newgame.17173.com/album-view-58966.html  
Representative image: https://i.17173cdn.com/0561y4/YWxqaGBf/gamebase/screenshot/WasEGvbmCgolAEe.jpg

**VERIFIED-HISTORICAL** relationship evidence: thin top chrome, lower-left portrait/status anchor, compact bottom deck, map remains the visual majority. Portal scaling/cropping means exact pixels are not retail geometry.

### Same-era battle HUD

Source: https://newgame.17173.com/album-view-1995.html  
Representative image: https://i1.17173cdn.com/gdthue/YWxqaGBf/newgame/54/JXTpnybiulzvFpm.jpg

**VERIFIED-HISTORICAL** observations: compact lower-left command/slot block, broad low bottom text/status strip, compact right-side status, upper-right actor/target plate, tactical scene dominant above the deck.

2003 Sina Q&A independently states that dragon-soldier battle commands are selected from the **lower-left**, and character battle status is opened from the **lower-left portrait button**.

### 2003 interface guide constraints

Sources:

- https://games.sina.com.cn/zhqu/yb/article/2003-05-20/7640.shtml
- https://games.sina.com.cn/zhqu/yb/article/2003-05-19/6407.shtml
- https://games.sina.com.cn/zhqu/yb/article/2003-05-20/7648.shtml

**VERIFIED-HISTORICAL**:

- item window: equipment upper portion, items below;
- item quick slots: A/S/D/F;
- magic quick slots: Z/X/C/V;
- non-battle resource indicators described as red HP, blue MP, green EXP, yellow stamina orbs;
- battle dragon-soldier commands are lower-left.

## Fixed-hash 2.2 resource facts

**VERIFIED** inventory:

- `Dlg/`: 70 `.Tdg` resources;
- `NRes/`: 27 `.Tip` resources, 3547 frames total;
- all 27 TIP files parse structurally;
- `NPC350.Tip` is a portrait/image library, not NPC placement/behavior;
- fixed client runtime evidence exists for `MessageBox.Tdg`, `Employ.Tdg`, `Warp.Tdg`, and `CombatSelect.Tdg` paths from earlier S4/battle work.

### TDG container recovery

S20 adds a strict static parser for `DIALOG LIBRARY.` resources using only the byte mechanics that close exactly like the recovered TIP family: header, canvas, frame count, offset table, descriptors, row/run framing and payload sizing.

For `Dlg/CombatSelect.Tdg` the following are **VERIFIED**:

- SHA-256 `b9ac3dbf0de545dce34285e95e52868e6ca88f9f5c75bfc926af852e905c7e05`;
- size `646241` bytes;
- magic `DIALOG LIBRARY.`;
- canvas `615 x 538`;
- `45` frames/entries.

These structural facts do not prove per-frame control semantics or original alpha/blend.

### High-priority dialog candidates

| Resource | Candidate role | Provenance / boundary |
| --- | --- | --- |
| `Dlg/MyInfo.Tdg` | character/status | historical status behavior + inferred file binding |
| `Dlg/MyInfo_Com.Tdg` | compact/combat status | INFERRED |
| `Dlg/Myitem.Tdg` | inventory/equipment | historical window behavior + inferred file binding |
| `Dlg/Magic.Tdg` | magic/skill | historical behavior + inferred file binding |
| `Dlg/SmallMap.Tdg` | minimap | historical upper-left map + fixed resource |
| `Dlg/MessageBox.Tdg` | NPC/quest dialogue | RECOVERED_SECONDARY runtime construction + historical bottom dialogue |
| `Dlg/CombatSelect.Tdg` | battle selection | RECOVERED_SECONDARY, fixed reference + verified container |
| `Dlg/CommanderInfo.Tdg` / `EnemyInfo.Tdg` | actor/target status | INFERRED; fixed option strings include COMMANDERINFO/ENEMYINFO |
| `Dlg/Employ.Tdg` | recruitment | RECOVERED_SECONDARY |
| `Dlg/Warp.Tdg` | warp/transport | RECOVERED_SECONDARY |
| `Dlg/Option.Tdg` | options/system | RECOVERED_SECONDARY option-string evidence |
| `Dlg/Buy.Tdg` / `Repair.Tdg` / `Bank.Tdg` | facility/economy | INFERRED |
| `Dlg/ChatRoom.Tdg` / `SetChat.Tdg` / `WhisperList.Tdg` | chat | INFERRED |

### High-priority TIP candidates

| Resource | Verified structure | Candidate role | Role provenance |
| --- | --- | --- | --- |
| `NRes/Menu.Tip` | 338x202 / 19 | menu/control chrome | INFERRED |
| `NRes/MStatus.Tip` | 300x30 / 40 | compact status strip | INFERRED |
| `NRes/ToolTip.Tip` | 160x20 / 3 | tooltip chrome | INFERRED |
| `NRes/MagicIcon.Tip` | 640x640 / 400 | magic/skill icons | INFERRED |
| `NRes/ItemRes.Tip` | 4000x1000 / 2500 | item icon/art atlas | INFERRED |
| `NRes/NPC350.Tip` | 3000x1125 / 50 | NPC portraits | VERIFIED loader mapping IDs 100..149 |
| `NRes/Char350.Tip` | 3000x2250 / 100 | character portraits | VERIFIED loader mapping IDs 0..99 |
| `NRes/ChatRoom.Tip` | 207x164 / 8 | chat art | INFERRED |
| `NRes/ChatBalloon.Tip` | 288x426 / 12 | chat balloon art | INFERRED |
| `NRes/CombatMap.Tip` | 569x197 / 10 | combat-selection thumbnails | RECOVERED_SECONDARY; not battle world background |
| `NRes/Interface_Help1.Tip` | 800x600 / 1 | interface help overlay | INFERRED |

## HUD region map for S21

Exact pixel geometry is not claimed because historical portal images are resized/cropped. S21 should use relationship/anchor fidelity first.

| Region | Anchor | Size relationship | Provenance | S21 instruction |
| --- | --- | --- | --- | --- |
| top command strip | top/full width | shallow one-row chrome | VERIFIED-HISTORICAL | original categories remain, disabled if missing |
| small map | upper-left below strip | compact square-ish | VERIFIED-HISTORICAL | optional/toggleable; no large central map |
| player portrait/status | lower-left | corner plate, not wide card | VERIFIED-HISTORICAL | replace oversized top status card with compact original relationship |
| bottom chat/status deck | bottom center | low and wide | VERIFIED-HISTORICAL | preserve world visibility |
| item/magic quick slots | bottom/right edge | small fixed slot groups | VERIFIED-HISTORICAL | keep empty/disabled slots |
| NPC dialogue | bottom near/full width | taller than normal deck | VERIFIED-HISTORICAL + runtime dialog evidence | portrait-left/text-right bottom dock |
| battle commands | lower-left | compact | VERIFIED-HISTORICAL | attack/defence family stays lower-left |
| battle actor/target status | right / upper-right | compact plates | VERIFIED-HISTORICAL | do not cover tactical field |
| quest/guide tracker | upper-right | compact overlay | RECONSTRUCTION_POLICY | user-required M5.1 tracker; do not call retail placement |
| Developer diagnostics | separate opt-in | zero footprint when closed | RECONSTRUCTION_POLICY | never reserve player HUD space |

### Reconstruction grid for responsive implementation

**INFERRED / RECONSTRUCTION_POLICY**, not retail pixels:

- top strip: about 28-36 px effective desktop height;
- lower-left portrait/status: clamp to a corner plate, roughly 15-22% viewport width maximum;
- normal bottom deck: about 96-138 px max at 1366x768 / 1920x1080;
- dialogue: about 20-26% viewport height, near full width, portrait column around 25-30%;
- quick slots: fixed-size cells, no viewport-width stretching;
- guide tracker: compact hard-right max-width overlay beneath/adjacent to top chrome;
- M5.1 translucency is allowed for readability but is **not** retail evidence.

## Yesterday's external archaeology

`docs/research/external-web-research-20260918.md` changes interpretation, not provenance:

- Japanese `kaosia.gif`, facility pages and two training-ground entrances are useful **VERIFIED-HISTORICAL** world/facility evidence, not mainland 2.2 HUD geometry/object IDs;
- JP/TW task material helps identify dialogue/facility categories but does not promote foreign task IDs/coordinates;
- later Korean Lapis UI is lineage context only and must not override 2003 mainland layout evidence;
- a 2.1 client URL remains a lead, but S20 did not obtain and hash-verify a second byte set here, so no 2.1↔2.2 UI diff is claimed.

## Remaining unknowns

- exact frame/control semantics for all TDG resources;
- exact role/order of many `Menu.Tip` / `MStatus.Tip` frames;
- TIP/TDG run-kind 2/3/4 alpha/blend semantics;
- exact 2.2 fonts/text rasterization and multi-resolution pixel geometry;
- whether a persistent quest tracker existed in the exact mainland 2.2 presentation.

Unknowns require placeholders inside the recovered structure, not a return to free-form RPG UI design.

## Private preview pack

The S20 workflow produces private artifact `s20-original-ui-reference-pack` with full TDG/TIP inventory JSON, selected contact sheets, historical source captures, an HTML comparison page and Chromium full-page screenshot. Copy those original-derived previews to Drive `lapis-rebuild-assets/40_previews/`; do not commit them to Git.

## Delivery / validation status

- Private Drive pack: `lapis-rebuild-assets/40_previews/S20-original-ui-reference-pack-20260919/`.
- Drive pack contains the evidence-comparison board, fixed-hash 2.2 `NPC350.Tip` derived contact sheet, pre-M5 reconstruction baseline, S21 evidence-informed checkpoint, and a provenance/source index.
- Local parser regression: `python3 -m unittest -v tests/parsers/test_tdg.py` => **2/2 passed**.
- Local static syntax validation: `python3 -m py_compile tools/convert/tdg.py tools/probe_original_ui_assets.py` => **passed**.
- GitHub Actions run `35419253429` was retried twice. Both attempts ended before any step ran (`runner_id=0`, empty step list). This is recorded as runner/infrastructure unavailability, not as a successful or failed S20 parser/probe execution.
- The workflow remains in the branch so the full fixed-hash TDG/TIP private contact-sheet job can execute normally when Actions runners are available.
## Acceptance answer

If functionality is ignored and the UI is redrawn only from current evidence: keep the thin top menu, upper-left optional map, lower-left portrait/status anchor, low bottom chat/command deck, bottom/right quick slots, bottom-docked portrait dialogue, lower-left battle commands and compact right/upper-right battle status. Preserve missing original categories as disabled placeholders. Keep the M5.1 tracker as a compact upper-right reconstruction overlay and Developer diagnostics separate/opt-in.

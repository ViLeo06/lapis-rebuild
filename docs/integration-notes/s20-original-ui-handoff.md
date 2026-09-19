# S20 -> S21 Original UI implementation handoff

Date: 2026-09-19

## Required layout change

S21 should treat the current S8 shell as a reconstruction scaffold, not as the target UI.

1. **Top:** shallow full-width command strip. Keep the original category family (`Help/Status/Item/Magic/.../Chat/Option`). Missing functions stay disabled/placeholder rather than disappearing.
2. **Upper-left:** optional compact `SmallMap` region. Closed state must not reserve a large panel.
3. **Lower-left:** portrait/status anchor. This is the strongest historical location for primary player status/control and battle status entry.
4. **Bottom-center:** low, wide chat/system/status deck. Keep the game world dominant.
5. **Bottom-right:** compact item/magic quick-slot groups. Preserve empty slots for missing behavior.
6. **NPC dialogue:** bottom-docked, near/full width; portrait left; text/actions right. Avoid centered modern modal cards.
7. **Battle:** lower-left command block; bottom log/deck; compact right-side/upper-right actor/target status.
8. **M5.1 guide tracker:** user-required upper-right overlay, but `RECONSTRUCTION_POLICY`; it must not displace native chrome or be described as verified retail placement.
9. **Developer diagnostics:** explicit opt-in only; closed state leaves no gap.

## Responsive target

Exact retail pixels are not recovered. Use clamped desktop geometry that protects the historical relationships:

- top strip: about 28-36 px effective height at 1366/1920 desktop widths;
- lower-left portrait/status: fixed/clamped corner plate, not a viewport-wide card;
- normal bottom deck: roughly 96-138 px max at the required resolutions;
- dialogue: roughly 20-26% viewport height, near full width;
- quick slots: fixed compact cells; do not stretch with viewport width;
- upper-right tracker: hard-right, max-width clamp;
- moderate M5.1 translucency is allowed for readability, but its alpha is **not** retail evidence.

Validate `1366x768` and `1920x1080`, fullscreen/resize, and that player-adjacent world space is not obscured.

## High-priority original resource candidates

Do not commit decoded original art. Use private-original generation or CSS placeholders.

### Dialog/window family

- `Dlg/MyInfo.Tdg` — status window candidate.
- `Dlg/Myitem.Tdg` — inventory/equipment candidate.
- `Dlg/Magic.Tdg` — magic/skill candidate.
- `Dlg/SmallMap.Tdg` — small-map candidate.
- `Dlg/MessageBox.Tdg` — runtime-backed NPC/quest message surface.
- `Dlg/CombatSelect.Tdg` — runtime-backed combat selection; verified `615x538`, 45-entry container.
- `Dlg/CommanderInfo.Tdg`, `EnemyInfo.Tdg`, `PartyInfo.Tdg`, `Allyinfo.Tdg` — compact actor/status candidates.
- `Dlg/Option.Tdg` — system/options family.
- `Dlg/Employ.Tdg`, `Warp.Tdg` — runtime-backed special dialogs.

### TIP family

- `NRes/Menu.Tip` — `338x202`, 19 frames; menu/control chrome candidate.
- `NRes/MStatus.Tip` — `300x30`, 40 frames; compact status candidate.
- `NRes/ToolTip.Tip` — `160x20`, 3 frames.
- `NRes/MagicIcon.Tip` — `640x640`, 400 frames.
- `NRes/ItemRes.Tip` — `4000x1000`, 2500 frames.
- `NRes/NPC350.Tip` — verified 50-entry NPC portrait library.
- `NRes/Char350.Tip` — verified 100-entry character portrait library.
- `NRes/ChatRoom.Tip`, `ChatBalloon.Tip` — chat presentation candidates.
- `NRes/Interface_Help1..5.Tip` — interface help/overlay family.

Anything tagged `INFERRED` remains a candidate in code/comments and must not be described as a proven retail binding.

## Do not do

- Do not keep the current large top/left status card merely because it exists.
- Do not invent a modern bottom-center MMO ability bar and call it original.
- Do not center NPC dialogue in a SaaS/card modal.
- Do not delete unimplemented original categories; use disabled/empty placeholders.
- Do not convert Japanese/Korean later UI geometry into mainland 2.2 VERIFIED placement.
- Do not claim M5.1 transparency values are original behavior.
- Do not expose Developer diagnostics by default.

## Screenshot review checklist

At both required resolutions, reviewers should immediately see:

- map/world remains dominant;
- chrome is concentrated at top/bottom edges;
- primary player status is compact and corner-anchored;
- guide/quest overlay is genuinely top-right and narrow;
- bottom regions sit on the screen edge rather than floating upward;
- dialogue overlays/replaces the lower deck in a historical bottom-docked form;
- disabled placeholders preserve original menu/slot rhythm.

Evidence/provenance: `docs/research/s20-original-ui-reference-pack.md` and `manifests/s20-original-ui-assets.json`.

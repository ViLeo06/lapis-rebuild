# S21 — Original HUD Shell / Layout Polish

Date: 2026-09-19  
Branch: `codex/s21-field-hud-restoration`  
Plan baseline: `57ff22363156bec7aad3acb7555208533485d193`

## Scope

S21 changes only the player-facing HUD shell, UI CSS, and UI tests/E2E. It does not change scene movement, NPC/quest authority, battle rules, world transitions, or evidence-ledger claims.

## Evidence boundary

- **VERIFIED**: the current M4/M5 runtime exposes player HP/MP/gold/level, map name/id, quest text, interaction prompt, menu actions, battle state, and developer diagnostics.
- **VERIFIED-HISTORICAL**: the archived 2026-09-18 external research contains same-lineage Japanese/Korean/Taiwanese material, but does not establish exact 2.2 Chinese HUD coordinates.
- **RECONSTRUCTION_POLICY**: the S8 shell geometry and styling were explicitly documented as reconstruction choices.
- **INFERRED / temporary S21 layout**: while S20 has not yet produced a reference pack, this branch follows the 2026-09-19 playtest constraints directly: compact top-left status, top-right guide/quest, two bottom edge panels, smaller left-bottom subpanel, moderate transparency, and no permanent development chrome.
- **UNVERIFIED**: the disabled bottom slots are placeholders only. Their exact retail labels, icons, artwork, and command semantics must be replaced when S20 provides stronger evidence.

No placeholder in this branch is presented as recovered retail functionality.

## Player-facing changes

1. Player plate moves to a compact top-left frame, with portrait reduced to 42 px and compressed HP/MP/gold presentation.
2. Quest/guide frame is independently anchored to the top-right edge.
3. The field HUD gains two stable bottom frames:
   - left: compact map subframe plus disabled placeholder slots;
   - right: disabled command placeholders plus the active system/menu button.
4. Bottom frames sit 5–8 px from the viewport edge at desktop sizes.
5. The left-bottom map subframe is constrained to roughly 132 px at desktop sizes.
6. Reconstruction brand/header chrome is removed from the player shell.
7. Integrated M4/M5 mode also hides the inherited `#app > header` and `#app > footer` developer chrome so the map/HUD uses the full viewport.
8. HUD panels use semi-transparent dark fills with hard old-PC-game borders; no blur/glass-card treatment is introduced.
9. Missing functions remain visibly disabled instead of being removed and collapsing layout.
10. Developer/Diagnostics remains absent unless explicitly enabled.

## Responsive acceptance

The S21 E2E harness checks both static shell and integrated M5 runtime at:

- 1366×768
- 1920×1080

Assertions include:

- player plate <= 330 px wide and <= 64 px high;
- quest frame <= 10 px from the right edge;
- both bottom frames <= 10 px from the bottom edge;
- left-bottom map subframe <= 140 px wide;
- bottom left/right frames do not overlap;
- no horizontal overflow;
- inherited app header/footer are hidden in integrated M4/M5 mode;
- diagnostics absent by default;
- an opened diagnostics `<details>` can be closed.

Screenshots are emitted as:

- `s21-static-1366x768.png`
- `s21-static-1920x1080.png`
- `s21-runtime-1366x768.png`
- `s21-runtime-1920x1080.png`

## S20 synchronization rule

At PR-ready time, re-check `codex/s20-original-ui-archaeology`. If S20 supplies stronger evidence for exact region geometry or identified 2.2 UI assets, replace the temporary slot geometry/art before merge. Do not silently promote S20 historical/inferred evidence to VERIFIED retail behavior.

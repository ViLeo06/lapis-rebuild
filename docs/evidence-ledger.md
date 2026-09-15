# Evidence ledger

## 2026-09-15 / Web checkpoint

| ID | Level | Claim | Reproduction / scope |
| --- | --- | --- | --- |
| WEB-001 | VERIFIED | Installer matches `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88` | 470,688,152 bytes; hash-pinned static CI download and local 18-part reconstruction |
| WEB-002 | VERIFIED | Static extraction: 22,885 regular files / 2,699,237,296 bytes | No original executable run |
| WEB-003 | VERIFIED | Reference coordinates roundtrip on even-parity anchors | Exhaustive 47x47 test + all 607 walkable map0 cells; **not** a global inverse claim |
| WEB-004 | INFERRED | Compatibility coordinate helpers reflect old conventions | 2026 compatibility reference source; not a 2003 runtime capture |
| WEB-005 | UNVERIFIED | Training combat, route tie-break, movement speed and animation millisecond policies | `web/src/config.ts`, `battle.ts`, `coordinates.ts`; functional scaffolding only |
| WEB-006 | VERIFIED | Web checkpoint passes Python parser tests, TypeScript/unit/build, Chromium and offline single-HTML integration | Ongoing regression CI |
| WEB-007 | VERIFIED | Browser diagnostic loads real maps/B100/B109, inspects animation/bounds/collision, moves, executes training actions and persists browser state | Private decoded asset pack; no original executable run |
| WEB-008 | VERIFIED | 100 target ANI/SPR pairs and 92 SGR parse with 0 structural errors | Repeated static validators; note WEB-026 corrected SPR pixel placement semantics |
| WEB-009 | VERIFIED | Original Web character/map inputs are hash pinned before generation | `manifests/web-source-baseline.json` |
| WEB-010 | VERIFIED | MVP MagicRes resources `1,2,3,35,36,37,38` are `FOCUS`; `frames_per_direction == SPR frame_count`, raw timing `30.0`, and only ANI row0 is wholly inside paired SPR frame range | `tools/inspect_magicres.py`, fixed 2.2 client |
| WEB-011 | VERIFIED | Seven MVP FOCUS ANI row0 sequences are exactly `0..N-1` | Supports sequential diagnostic playback only, not direction/timing/blend/placement semantics |
| WEB-012 | VERIFIED | Seven MVP MagicRes ANI/SPR inputs are individually SHA-256 pinned | `manifests/web-effects-baseline.json` |
| WEB-013 | VERIFIED | Static probe renders maps 0,1,3,7,9,11 using project-owned parsers | `tools/probe_maps.py`; absent numbers reported as absent rather than guessed |
| WEB-014 | VERIFIED | Map1: 2240×1280, IMF69×79, 2292 value-1 cells, 70 object images drawn, 4 optional images missing | Hash-pinned client static extraction |
| WEB-015 | VERIFIED | Map candidates/names include 对练场、布日古斯_外城、布日古斯_城_地下_监狱、布日古斯_本城_大厅、西奥_洞穴、扎魔拉_要塞_入口 | `zone_name.txt` resource-token parser |
| WEB-016 | VERIFIED | Two-map Web pack + real MagicRes diagnostic player pass synthetic/private-original browser regression | CI `34960418543` |
| WEB-017 | VERIFIED-ENGINEERING | M3 guide loop `0000 → 0001 → 0000 → complete` persists through save/reload | Verifies Web state machine, **not** original NPC/quest semantics |
| WEB-018 | VERIFIED | Map0001 MMF/SMF/IMF and additional SGR dependencies are SHA-256 pinned | `manifests/web-source-baseline.json` |
| WEB-019 | UNVERIFIED | `data/npcs/m3-guide.json` represents original quest/NPC content | Deliberate functional placeholder |
| WEB-020 | VERIFIED | `NRes/Quest.lib` uses recovered encrypted + PKWARE DCL `.lib` container family and has 15 extractable members | SHA-256 `23fa...7397`; no client execution |
| WEB-021 | VERIFIED | Quest.lib includes `NPCScript.txt`, Quest0–9, Tutorial, HelpScript, Neohelp and Prologue | Member hashes pinned in `manifests/content-source-baseline.json`; bodies not stored in Git |
| WEB-022 | VERIFIED | NPCScript has 39 deterministic NPC blocks, IDs 11–49, 125 active and 5 disabled entries; declared active counts match | `tools/convert/quest_content.py` |
| WEB-023 | VERIFIED | Quest0–9 deterministic grammar: 10 files, 42 steps, 179 dialogue commands; aggregate `CANCEL=161 / SELECT=9 / SCRIPT=9` | Token names are file facts, not runtime semantics |
| WEB-024 | VERIFIED | Private Web pack derives source-backed Quest/NPC JSON from Quest.lib while Git keeps only parser/structure/hashes | `tools/prepare_web.py`; synthetic CI uses non-original fixtures |
| WEB-025 | VERIFIED | `.Tip` is an image/sprite library family; 27/27 files strict-parse, 3547 frames total | `tools/convert/tip.py`, `tools/validate/validate_tip_assets.py` |
| WEB-026 | VERIFIED | SPR row-span first word is a **relative transparent skip from previous opaque run end**, not absolute x | Real B100/B109 multi-span evidence (`[[13,1],[1,32]]`, etc.) + manual visual failure/recovery; `tools/inspect_spr_runs.py`; parser regression |
| WEB-027 | VERIFIED | B100/B109 `Body_` raw direction rows visually map `0 S,1 SW,2 W,3 NW,4 N,5 NE,6 E,7 SE` | Direct inspection of real decoded walk frames; old Web east/west mapping was mirrored; 8-direction unit test now locks mapping |
| WEB-028 | VERIFIED | First user manual HTML review exposed horizontal sprite slicing and backwards/mirrored movement that structural/browser automation had not detected | Screenshot/manual observation 2026-09-15; reproduced by old decoder and old direction function |
| WEB-029 | VERIFIED | Corrected SPR decoder + direction mapping regenerate the fixed-hash private pack and pass synthetic + private-original Chromium/offline regression | CI run `34971954768`, both jobs success |
| WEB-030 | VERIFIED | A real 30-minute wall-clock diagnostic soak completed successfully | CI run `34969057806`; this is stability evidence, not proof of visual/original semantics |
| WEB-031 | VERIFIED | `NPC350.Tip` is a sprite library: canvas 3000×1125, 50 frames of 300×225 arranged 10×5 | It is **not** accepted as NPC placement/behavior data |
| WEB-032 | VERIFIED | Tutorial static structure: 42 TALK blocks / 173 text records with NAME/NEXT/NOTCLOSE/RGB/BR/DRAWTOP-family controls | Static Quest.lib member parser; control semantics beyond structure remain bounded |
| WEB-033 | VERIFIED | HelpScript static structure: 5 HELP / 14 STEP / 30 four-integer records | Static parser/validation |
| WEB-034 | VERIFIED | Neohelp has 18 sections / 336 records; all observed nonnegative third-field references resolve to an existing section ID | Does not yet claim field semantics |
| WEB-035 | VERIFIED | Prologue has 19 structural rows / 17 non-empty text rows | Static parser/validation |
| WEB-036 | VERIFIED-HISTORICAL | The original game explicitly distinguishes **non-battle state** and **battle screen/battle scene**; battle commands/status UI differ from the non-battle orb UI | 2003 Sina Q&A: battle-screen lower-left commands/status portrait, non-battle colored orbs, joining an existing battle scene; 2003 official update text: “进入回合制战斗画面后” |
| WEB-037 | VERIFIED-HISTORICAL | Combat is a semi-turn/ATB-like tactical loop: a character acts only after its **行动槽** fills, may move/attack, then waits for the gauge again | 2003 17173 introduction; corroborated by period player notes referring to “移动格子”, “行动回合” and “回合循环” |
| WEB-038 | VERIFIED-MANUAL | Normal play should not display the diagnostic route polyline or continuously flashing SPR bounds box | User manual validation 2026-09-15; the line and box are reconstruction debug overlays, not required gameplay UI; defaults changed to hidden |
| WEB-039 | UNVERIFIED | Exact action-gauge fill time, whether movement and attack share/consume one action exactly as current prototype, enemy AI cadence, battle-entry trigger mapping and the precise battle-scene background | Current `battle-screen-policy-2` is a reversible engineering approximation pending stronger static/dynamic evidence |

## Interpretation boundaries

- `Body_` direction evidence applies to the checked character family; it must not be mechanically applied to `FOCUS` MagicRes or other layer families.
- Sequential FOCUS SPR playback is a diagnostic representation of verified file order. Original timing, compositing, location and direction semantics remain `UNVERIFIED`.
- Rendered maps are flat diagnostic images. Foreground occlusion and original runtime z-order remain separate fidelity work.
- M3 guide completion proves engineering continuity only; it does not identify an original NPC, trigger, reward or map binding.
- Recovered Quest/NPC text proves static source content exists. It does not by itself prove live entity placement, step gating or server/runtime conditions.
- Browser/E2E success proves load/runtime invariants; manual visual review is separately required for sprite composition, direction, anchor and gameplay feel.
- Contemporary 2003 documentation is strong evidence for the **field → battle-screen + action-gauge** architecture, but it does not by itself prove milliseconds, path tie-breaks, AI cadence or exact internal state-machine code.
- No public original game source-code repository has been identified in the searches performed so far. Current combat reconstruction therefore combines period documentation, hash-pinned client static evidence and reversible `UNVERIFIED` policies; it does not pretend to be recovered source code.
- Full recovered dialogue/story text is generated only inside private derived packs/artifacts and is not committed to Git.
- Private asset evidence does not grant redistribution rights.
- Original client binaries are not executed by CI or normal development environments.

Format evidence: `docs/ani-format.md`, `docs/client-analysis.md`, `docs/tip-format.md` and `docs/validation/manual-20260915-visual.md`.

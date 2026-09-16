# Evidence ledger

## 2026-09-15 / Web checkpoint

| ID | Level | Claim | Reproduction / scope |
| --- | --- | --- | --- |
| WEB-001 | VERIFIED | Installer matches `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88` | 470,688,152 bytes; hash-pinned static CI download and local 18-part reconstruction |
| WEB-002 | VERIFIED | Static extraction: 22,885 regular files / 2,699,237,296 bytes | No original executable run |
| WEB-003 | VERIFIED | Reference coordinates roundtrip on even-parity anchors | Exhaustive 47x47 test + all 607 walkable map0 cells; **not** a global inverse claim |
| WEB-004 | INFERRED | Compatibility coordinate helpers reflect old conventions | 2026 compatibility reference source; not a 2003 runtime capture |
| WEB-005 | UNVERIFIED | Training combat, route tie-break, movement speed and reconstruction damage policies | Functional scaffolding only; later rows replace several older animation assumptions with stronger evidence |
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
| WEB-026 | VERIFIED | SPR row-span first word is a **relative transparent skip from previous opaque run end**, not absolute x | Real B100/B109 multi-span evidence + manual visual failure/recovery; parser regression |
| WEB-027 | VERIFIED | B100/B109 `Body_` raw direction rows visually map `0 S,1 SW,2 W,3 NW,4 N,5 NE,6 E,7 SE` | Direct inspection of real decoded walk frames; 8-direction unit test locks mapping |
| WEB-028 | VERIFIED | First user manual HTML review exposed horizontal sprite slicing and backwards/mirrored movement that structural/browser automation had not detected | Screenshot/manual observation 2026-09-15 |
| WEB-029 | VERIFIED | Corrected SPR decoder + direction mapping regenerate fixed-hash private pack and pass synthetic + private-original Chromium/offline regression | CI run `34971954768`, both jobs success |
| WEB-030 | VERIFIED | A real 30-minute wall-clock diagnostic soak completed successfully | CI run `34969057806`; stability evidence, not proof of original semantics |
| WEB-031 | VERIFIED | `NPC350.Tip` is a sprite library: canvas 3000×1125, 50 frames of 300×225 arranged 10×5 | It is **not** accepted as NPC placement/behavior data |
| WEB-032 | VERIFIED | Tutorial static structure: 42 TALK blocks / 173 text records with NAME/NEXT/NOTCLOSE/RGB/BR/DRAWTOP-family controls | Static Quest.lib member parser |
| WEB-033 | VERIFIED | HelpScript static structure: 5 HELP / 14 STEP / 30 four-integer records | Static parser/validation |
| WEB-034 | VERIFIED | Neohelp has 18 sections / 336 records; all observed nonnegative third-field references resolve to an existing section ID | Does not claim field semantics |
| WEB-035 | VERIFIED | Prologue has 19 structural rows / 17 non-empty text rows | Static parser/validation |
| WEB-036 | VERIFIED-HISTORICAL | Original game distinguishes **non-battle state** and **battle screen/battle scene**; battle commands/status UI differ from non-battle orb UI | 2003 Sina Q&A + contemporary official/update material |
| WEB-037 | VERIFIED-HISTORICAL | Combat is readiness/action-gauge driven: character acts after gauge fills, may move/attack, then waits for gauge again | 2003 17173 introduction + period player notes |
| WEB-038 | VERIFIED-MANUAL | Normal play should not display diagnostic route polyline or continuously flashing SPR bounds box | User manual validation 2026-09-15; defaults changed to hidden |
| WEB-039 | UNVERIFIED | Exact 500ms readiness cadence, concrete historical AI payloads, retired-server encounter/Quest predicates, exact retail damage formula, universal death binding and unresolved MagicRes/occlusion semantics | Static S1–S5 work narrowed these unknowns but did not invent missing server/dynamic evidence |
| WEB-040 | VERIFIED-STATIC-ORIGINAL | Retail client contains AI grammar `ODNORMAL/ODATTACK/ODDEFENCE`, targets `AREA/SOILDER`, actions `REST/ATTACK/MAGIC`, max 20 rows, default `ODNORMAL REST(20),ATTACK(80)` | Fixed-hash decompressed NeoDark signatures; `tools/probe_retail_battle_runtime.py` |
| WEB-041 | VERIFIED-STATIC-ORIGINAL | AI executor uses `rand()%100`; recovered HP/MP thresholds and inclusive weighted row selection | Native `0x00402E30` family; static probe |
| WEB-042 | SERVER-BOUNDARY | Basic attack uplink `6A/82` contains request words and no final damage; incoming absolute HP overwrites live HP | Fixed client sender + HP consumer; exact server arithmetic not established client-side |
| WEB-043 | VERIFIED-STATIC-ORIGINAL | Nearby world entity types 101..103 within Manhattan `<4` emit `49/21/01 + word`; battle entry separately consumes server/session-supplied zone/geometry and loads `sz-%04d.mmf` | Fixed NeoDark signatures; later S1 refines the serialized field |
| WEB-044 | VERIFIED-STATIC-RESOURCE | Authored `sz-NNNN.lib` battle containers contain `.SRF/.DEO/.DEE` scene metadata, formations and ending scripts; zones 1,3,7,9,11,13,15 catalogued | `tools/probe_story_battles.py`; dialogue bodies omitted |
| WEB-045 | SERVER-BOUNDARY | No independently verified generic retail field-spawn or universal field-map→battle-zone table has been recovered | Battle zone is session-supplied; compatibility placements are replacement policy |
| WEB-046 | VERIFIED | Recovered-readiness Web checkpoint regenerates and passes fixed-hash 2.2 private-original + synthetic browser/offline smoke | CI run `35027023563`; later v4 smoke `35059120452` also success |

## 2026-09-16 / S1–S5 parallel archaeology closure

| ID | Level | Claim | Reproduction / scope |
| --- | --- | --- | --- |
| WEB-047 | VERIFIED-STATIC-ORIGINAL | Battle roster is `0xC8` stride; unit key `+0x00`, category `+0xB8`, local behavior string `+0xC4`; unit key is copied to live unit `+0x24` | S2 `tools/probe_ai_binding.py`, `manifests/enemy-ai-binding.json` |
| WEB-048 | VERIFIED-STATIC-ORIGINAL | Client has 100-slot/`0x110` network AI table installed by inbound `6A69`; matching network program overrides category-7/8 roster program; empty local program falls back to retail default | S2 binding/xref probe; concrete historical live payload rows are still absent |
| WEB-049 | VERIFIED-STATIC-ORIGINAL | After footprint/state/relation filtering, AI target acquisition selects `candidate[rand()%candidate_count]`; no separate nearest-distance ranking occurs inside the admitted pool | S2 native `0x00402A10` path; distance may still affect footprint eligibility |
| WEB-050 | VERIFIED-STATIC-ORIGINAL | S1 separates world-entity and scene-object interaction: types 101..103 + Manhattan `<4` send `49 21 01 + uint16(+0x1C)`; fallback `08` uses distinct `+0xB4`; scene object `<9` sends `49 04 02 00 + runtime +0x80 id` | `tools/probe_encounter_recovery.py`, `manifests/encounter-bindings-2.2.json` |
| WEB-051 | SERVER-BOUNDARY | Interaction requests are distinct from authoritative battle entry; `0x98 mode1` supplies `battleZoneId`/optional geometry; checked client does not prove universal local field-map→battle-zone selection | S1 encounter docs/probe; secondary mappings remain provenance-tagged and disabled as retail truth |
| WEB-052 | VERIFIED-STATIC-ORIGINAL | NPCScript presentation block is selected from server `0x92` payload; Quest `(questIndex,stepIndex)` is received through `0x2B` or grouped `6A55`; NPCScript numeric tuples feed `SetRect` UI geometry, not world placement | S4 quest runtime/server-boundary probes |
| WEB-053 | SERVER-BOUNDARY | `Employ.Tdg` and `Warp.Tdg` recovered paths emit network requests rather than proving final local roster/map mutation; general condition/reward/recruit/warp/battle rules cross retired-server authority | S4 `quest-runtime-server-boundary.md`; do not numeric-join SMF object IDs to NPCScript block IDs |
| WEB-054 | VERIFIED-STATIC-RESOURCE | `ability.atr`/`itemtbl.atr`/magic tables expose authored hit/evasion/critical/damage/defence/magic fields; ability column 25 `cry` maps to client hit-presentation selection | S3 `probe_damage_tables.py` + `probe_damage_binary.py`; source hashes fixed in damage manifest |
| WEB-055 | SERVER-BOUNDARY | Exact retail physical/magic hit, damage, critical, defence, elemental and modifier formula is not recovered; observed local `%9/%5` RNG occurs after authoritative HP loss and is presentation variation | S3 damage static recovery; future formula claims require independent packet/stat/video corpus |
| WEB-056 | VERIFIED-STATIC-ORIGINAL | Common ANI consumers use QPC-derived milliseconds and `frame_interval_ms = 1000/raw_timing`; at least one verified consumer uses `1000/(raw_timing-1)` | S5 fixed-hash visual semantic probe; raw timing must be preserved with consumer-specific policy |
| WEB-057 | VERIFIED-STATIC-ORIGINAL | Authoritative HP decrease path selects/plays hit SFX then sets character action state `3`; state number maps directly to `B%03d_%02d.ani`, so `_03` is runtime-verified hit reaction | S5 visual animation runtime recovery |
| WEB-058 | VERIFIED-STATIC-ORIGINAL | BGM selection is zone-driven and formats `Sound/NDS-8%03d.mid`; all 178,227 parsed SMF records have signed `layer=-1`, so that field is not recovered foreground z-order | S5 BGM/map/audio probe; SMF flags→occlusion remains unresolved |
| WEB-059 | VERIFIED-ENGINEERING | S1–S5 PR heads (#7–#11) all passed Web/parser CI before merge; dedicated fixed-hash static workflows used by S2/S3/S4/S5 also reported success | 2026-09-16 coordinated review before merge |

## Interpretation boundaries

- `Body_` direction evidence applies to checked character families; it must not be mechanically applied to `FOCUS` MagicRes or other layer families.
- FOCUS SPR sequence is valid file-order evidence, but placement, blend, stage composition and direction semantics remain unresolved.
- Rendered maps are flat diagnostic images. S5 proves SMF signed `layer` cannot be used as foreground z-order; exact flags→occlusion semantics remain open.
- Recovered Quest/NPC text proves static source content exists, but S4 now shows block/step selection crosses a server boundary; do not derive world placement or reward logic from dialogue numbering/text.
- Contemporary documentation proves field→battle-screen + action-gauge architecture, not exact milliseconds or retired-server formulas.
- AI grammar, chooser, roster/network binding precedence and random target-pool selection are client facts. **Concrete historical non-default per-enemy programs remain a live-payload/capture gap.**
- Basic attack + absolute-HP response proves an authoritative result boundary. Authored combat fields are real inputs, but any offline equation remains reconstruction policy until independent evidence predicts held-out original observations.
- Battle-zone content does not prove field trigger mapping. S1 explicitly separates interaction intent from battle entry; compatibility map→zone rows remain `RECOVERED_SECONDARY`.
- S4 reached a client evidence boundary for NPC/Quest/Employ/Warp: missing original condition/reward/recruit/battle decisions require old server artifacts, packet captures or explicit reconstruction policy.
- S5 recovers common ANI cadence, hit reaction and zone-BGM chains, but universal death binding, attacker impact frame, MagicRes placement/composition and exact occlusion remain open.
- No public original game source-code repository has been identified. The reconstruction combines period documentation, hash-pinned client evidence and reversible policy layers; it must not pretend server gaps are recovered source.
- Full recovered dialogue/story text stays in private derived packs/artifacts and is not committed to Git.
- Private asset evidence does not grant redistribution rights.
- Original client binaries are not executed by CI or normal development environments.

Format/system evidence: `docs/ani-format.md`, `docs/client-analysis.md`, `docs/tip-format.md`, `docs/systems/combat-readiness-recovery.md`, `docs/systems/combat-ai-static-recovery.md`, `docs/systems/enemy-ai-binding-recovery.md`, `docs/systems/battle-entry-and-damage-recovery.md`, `docs/systems/damage-static-recovery.md`, `docs/systems/encounter-recovery.md`, `docs/systems/quest-runtime-binding.md`, `docs/systems/quest-runtime-server-boundary.md`, `docs/systems/story-battle-scene-catalog.md`, `docs/systems/visual-animation-runtime.md`, `docs/systems/visual-magic-map-audio.md` and `docs/validation/manual-20260915-visual.md`.

# Visual MagicRes, map layering and audio recovery

> Scope: fixed-hash 2.2 retail-client static evidence plus parser-generated previews. No original executable or unknown DLL is executed.

## MagicRes / FOCUS

The retail binary contains explicit resource templates:

- `%sMagicRes\%s`
- `magic-%03d.ani`
- `magic-%03d.spr`

The fixed-hash client contains **139** `MagicRes` ANI resources. Their layer names are primarily `FOCUS` / `_FOCUS` and use the same ANI container structure as character animation, including the authored timing field.

The important boundary is that FOCUS rows cannot be interpreted with character `Body_` direction semantics by default.

Observed structures include both:

- resources where all eight rows are distinct and reference different frame-index ranges;
- `_FOCUS` resources where all eight rows can be identical.

That pattern is compatible with several possible meanings—direction, stage bank, effect variant, or authored duplication—but static structure alone does not select one. S6 should therefore retain all eight rows exactly and attach no `north/east/...` labels unless a MagicRes consumer proves them.

`tools/build_s5_visual_preview.py` generates row-level MagicRes strips for human inspection. The private fixed-hash artifact includes representative previews such as `magic-001-focus-row0.png`, `magic-035-focus-row0.png` and related samples.

### Timing

MagicRes uses the same raw ANI timing field recovered in `visual-animation-runtime.md`. Many early MagicRes resources use raw `30`, while other values such as `40` and `50` are authored as well. The common ANI consumer therefore implies approximately 33.3 ms/frame for raw 30, but a specific MagicRes caller still needs to be linked before assigning a timing policy to every effect stage.

### Placement / anchor / blend / stages

The resource templates and frame banks are verified, but the following remain **UNVERIFIED** in this S5 slice:

- world/screen placement formula;
- anchor origin and target/attacker attachment rules;
- additive/alpha/keyed blend selection;
- interpretation of the eight FOCUS rows;
- multi-stage transition table;
- composition of multiple simultaneously active effect layers.

Do not infer those from sprite bounding boxes or layer names. Runtime integration should wait for a consumer-code link or retained behavior trace.

## SMF object layering / foreground occlusion

The S5 fixed-hash scan parses all **1,097** `sz-*.smf` files with zero parser failures, yielding **178,227** SMF object records.

Two structural facts matter for occlusion research:

1. the parsed signed `layer` field is `-1` for **all 178,227 records**;
2. the following `flags` byte varies:

| flags | records |
| ---: | ---: |
| 0 | 117,667 |
| 1 | 18,074 |
| 2 | 41,282 |
| 3 | 1,126 |
| 4 | 78 |

There are **60,560** records with nonzero flags.

This rules out a simplistic implementation in which the SMF `layer` field directly becomes the character/object z-order. The varying flags are a better candidate for rendering/interaction policy, but S5 has not yet linked individual bits/values to the retail draw consumer.

For S6:

- preserve raw SMF `layer` and `flags` in data;
- do not claim `layer=-1` is foreground/background;
- do not map `flags 1/2/3/4` to occlusion without a code/data link;
- if a temporary visual policy is needed, label it reconstruction policy rather than recovered retail behavior.

## Audio inventory

The fixed client contains **156** directly inventoried audio resources:

- 133 WAV files;
- 23 MIDI files.

The retail binary contains exact references/templates for several families. Evidence strength differs by family.

### HP-loss / hit SFX — VERIFIED trigger chain

The HP-loss consumer selects and plays one of these families before entering defender action state 3:

- `NDS-000%d.wav`
- `NDS-001%d.wav`
- `NDS-0030.wav`
- `NDS-0040.wav`
- `NDS-0050.wav`

This is a real trigger chain, not a filename heuristic. The exact meaning of the selector values remains unlabelled.

### BGM — VERIFIED zone-driven selection

The current map/battle zone is stored at fixed-hash global `0x004F48B4` when the map loader accepts a new zone ID. The BGM selector at `0x0048FD80` consumes that same value.

Normal path:

1. look up the current `zoneId` in a zone-metadata table;
2. if a record exists, read its signed track ID at record `+8`;
3. if no record exists or that value is negative, use fallback track `5`;
4. format `Sound\NDS-8%03d.mid` with the selected track;
5. pass the resulting path to the sound manager.

There are verified special-zone overrides:

- zone 1010 → track 7 or 8 depending on a live mode field;
- zone 1020 → track 7 or 8;
- zone 1050 → track 7 or 8;
- zone 1300 → track 7 or 8;
- zone 2600 retains the normal selected track but has an additional special side path when a specific live object exists.

This establishes a real runtime chain:

`zoneId -> zone metadata track id / special override -> Sound\NDS-8NNN.mid -> sound manager`

The remaining BGM gaps are the source-file schema that populates the zone-metadata table and exact fade/restart/loop policy.

### Magic SFX family — VERIFIED nearby template, exact stage mapping unresolved

Near the MagicRes runtime resource path the binary contains:

`NDS-4%03d.wav`

This strongly connects the `4xxx` WAV family to magic/effect presentation, but the exact relation between spell/effect ID, MagicRes ANI ID, FOCUS row and SFX trigger/stage is not yet proven.

### Death / attack SFX

No exact death-SFX trigger or universal attack-impact-SFX trigger is promoted in S5 without a complete call chain. The resource inventory is useful for search, but filenames alone are not evidence of trigger semantics.

## Reproducible evidence

`tools/probe_visual_fidelity.py` produces the complete fixed-resource inventory and raw SMF/MagicRes distributions. `tools/probe_visual_semantics.py` pins runtime templates, ANI/action semantics, the verified hit-audio chain and zone-driven BGM selection. `tools/build_s5_visual_preview.py` produces human-checkable character and MagicRes image strips.

The CI artifact `s5-static-visual-fidelity` contains:

- `visual-fidelity.json`;
- `visual-semantics.json`;
- static unpack log/hash-pinned binary copy used only for byte inspection;
- private visual preview HTML and PNGs.

The artifact is validation material; original copyrighted client assets are not added to the repository.

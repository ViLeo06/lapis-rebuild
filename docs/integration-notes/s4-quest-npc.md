# S4 Quest/NPC runtime integration notes

## What can be implemented now

The reconstruction can safely model the recovered Quest client as a server-selected `(questIndex, stepIndex)` presentation state machine:

1. receive Quest update;
2. load `Quest{questIndex}.TXT` / `STEP{stepIndex}`;
3. parse local command type;
4. present SCRIPT / NAME / SELECT state;
5. return selection/progression response when the recovered uplink path applies.

The recovered retail command IDs are:

```text
SCRIPT    0
SELECT    1
NAME      2
INVENTORY 3
CANCEL    4
REPAIR    5
```

Do not attach reward, recruitment, warp, encounter, or condition semantics to these token names unless a separate recovered runtime path supplies them.

## Protocol facts for future runtime work

Quest downlink:

```text
opcode 0x2B
int16 questIndex
int16 stepIndex
```

Quest uplink observed at `0x0044DA30` is 8 bytes:

```text
header: 6A 55 when local mode == 6; otherwise 49 E7
uint16 questIndex
uint16 stepIndex
uint16 selectedValueOrZero
```

`SELECT` requires a positive selected value. `CANCEL` exits the local UI path before this uplink.

These fields should remain separately named in reconstruction code. Do not collapse them into a generic "quest id" integer, because the retail client stores and transports quest and step independently.

## NPCScript integration rule

Do **not** source world placement from `NPCScript.txt`.

The runtime consumes a compact selector payload before parsing NPCScript:

```text
uint8 blockId -> runtime object +0x104
int16 value   -> +0x108
int16 value   -> +0x124
```

The parser then selects the block whose header ID equals `+0x104`. Record numeric fields ultimately feed `USER32!SetRect`, so they belong to dialogue/UI layout rather than map placement.

For a future NPC implementation, keep these concepts separate:

```text
world entity identity / coordinates      UNKNOWN binding source
NPCScript block id                        VERIFIED runtime selector
NPCScript record rectangle/layout fields  VERIFIED UI geometry
```

## Map/entity join rule

The S4 CI parsed all 1,097 `sz-*.smf` files with zero parser failures. Direct equality matching against Quest/NPC numbers produced 70,900 candidates.

That is evidence **against** direct numeric binding:

- NPCScript block IDs `11..49` recur as SMF `object_id` values across hundreds of maps each.
- Quest numeric `NAME` values `99..107` also recur across hundreds of maps each.
- Quest numeric `NAME` values `5003+` produced no SMF `object_id` equality matches.

Therefore no reconstruction code should implement `NPCScript block id == SMF object_id` or `Quest NAME id == SMF object_id` from this evidence.

A candidate map row may only be promoted when another recovered call chain proves the same ID namespace.

## FINDNPC

`FINDNPC` is useful for the next integration pass because it demonstrates an actual runtime object lookup by name. The path walks a live object vector, compares object `+0x08`, and uses coordinate-like fields `+0x5C/+0x60` after a match.

Potential next bridge:

```text
script/name command
  -> FINDNPC
  -> live object pointer
  -> runtime coordinates
```

What remains missing is the source that maps Quest/NPC numeric identities to the object name used by this path.

## Employ / recruitment

`Dlg/Employ.Tdg` is definitely constructed by the retail client, but S4 does not yet have a proven path from:

```text
Quest/NPC trigger -> Employ result -> roster mutation / recruitment
```

Do not implement recruitment from dialogue wording. Follow constructor target `0x0042ED50`, its callbacks and resulting network messages in a later probe.

## Warp / map transition

`Dlg/Warp.Tdg` is definitely constructed, but S4 has not proven:

```text
Warp selection -> zone/map id -> map transition
```

Follow constructor target `0x0046B680`, selection callbacks and outbound/inbound packets before wiring Quest-driven warp behavior.

## Battle / encounter invocation

No direct battle/encounter start was found in the recovered Quest command dispatcher branches. S1 owns the authoritative encounter chain; S4 should consume a later proven Quest/NPC -> S1 encounter-request bridge rather than invent a battle call from static dialogue.

## Cross-session handoff

For S1 / map runtime:
- S4 has **not** proved a numeric Quest/NPC -> SMF ID join.
- `FINDNPC` does provide a verified live-object-by-name lookup path worth correlating with field entity names.

For recruitment/runtime UI:
- `Employ.Tdg` factory exists; gameplay result path unresolved.

For UI/visual work:
- NPCScript numeric tuples are UI rectangles via `SetRect`, not field positions.

For all sessions:
- `NRes/Npc350.TIP` remains excluded from placement/behavior inference; it is a sprite/image library.

## Evidence artifacts

- probe: `tools/probe_quest_runtime.py`
- parser/privacy tests: `tests/parsers/test_quest_runtime.py`
- fixed-hash workflow: `.github/workflows/static-quest-runtime.yml`
- sanitized summary: `manifests/quest-runtime-binding.json`
- full short-lived CI evidence: workflow run `35100176138`, artifact `s4-quest-runtime-evidence`

# Quest / NPC runtime binding

Status: **partial runtime recovery, fixed-hash static evidence**

Baseline: `f9c96fc68b7bae7ff1793fc423875d43a08d6cb4`

Retail target used for address claims: UPX-decompressed `NeoDark.exe`, SHA-256 `432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7`.

The evidence below comes from static disassembly plus fixed resource parsing. The original program was not executed. Original dialogue/story payload text is intentionally omitted.

## 1. Recovered Quest runtime chain

The client has a concrete Quest runtime path rather than a text-only reader:

```text
server receive opcode 0x2B
  -> receive case 0x0048CC87
  -> quest loader 0x004907A0
     payload: int16 questIndex, int16 stepIndex
  -> quest state init 0x0044DCA0
     +0x114 quest index
     +0x118 step index
  -> file/step parser 0x0044DCD0
     Quest%d.TXT / STEP%d
  -> command type array
  -> command dispatcher 0x0044E150
  -> local presentation / selection handling
  -> 8-byte quest uplink 0x0044DA30 when applicable
```

The downlink route is derived from the retail receive translation/jump tables, not from string proximity. Opcode `0x2B` lands at `0x0048CC87`; that case advances past the opcode byte and calls `0x004907A0`. The loader reads two 16-bit values and then calls `0x0044DCA0` with the recovered quest/step pair.

### Quest command type mapping

The parser assigns six local command type IDs, consumed by the jump table at `0x0044E280`:

| Token | Type | Dispatcher branch | Verified local effect |
| --- | ---: | --- | --- |
| `SCRIPT` | 0 | `0x0044E17C` | presentation mode 0 + payload copy; no direct reward/warp/battle/recruit call observed in this branch |
| `SELECT` | 1 | `0x0044E19A` | presentation mode 1 + payload copy; positive selected value becomes uplink final WORD |
| `NAME` | 2 | `0x0044E1A6` | payload copied into a secondary name/label buffer; returns a consume-next marker |
| `INVENTORY` | 3 | `0x0044E1C9` | payload copy + owner/control lookup using numeric id `0x65`; higher-level UI semantics are not asserted |
| `CANCEL` | 4 | `0x0044E1F1` | presentation mode 4; user-action path closes/removes Quest UI before the normal Quest uplink |
| `REPAIR` | 5 | `0x0044E210` | payload copy + owner/control lookup using numeric id `0xCE`; higher-level UI semantics are not asserted |

This is stronger than token counting: each token has a retail string xref, an exact type assignment, and a dispatcher target.

### Quest uplink

`0x0044DA30` constructs an 8-byte message:

```text
byte 0..1: 6A 55 when local mode == 6, otherwise 49 E7
word 1:    quest index
word 2:    step index
word 3:    selected value for SELECT, otherwise zero on the observed generic path
```

For `SELECT` (type 1), a selection must be greater than zero before the send. For `CANCEL` (type 4), the client closes/removes the Quest UI and returns before this send.

### What this does and does not prove

The recovered client path is primarily a **server-selected quest/step -> local script presentation -> optional response** loop. No direct reward grant, recruitment mutation, warp transition, or battle start was found in the recovered `SCRIPT` / `SELECT` / `CANCEL` command branches.

That absence is not sufficient to declare all Quest gameplay effects server-only. Such effects may be initiated by other client callbacks or by later server messages. Until their call chains are recovered, reward/recruitment/warp/battle remain unresolved rather than inferred from dialogue tokens.

## 2. NPCScript runtime binding

`NPCScript.txt` is not a placement table.

A compact runtime payload decoder at `0x00457DE0` writes:

```text
payload +0 : uint8  -> object +0x104
payload +1 : int16  -> object +0x108
payload +3 : int16  -> object +0x124
```

It then calls the `NPCScript.txt` parser at `0x00457E02`. Inside the parser, the active NPCScript block header ID is compared with runtime object field `+0x104` at `0x00457648`.

This recovers a genuine runtime selector:

```text
compact runtime payload blockId
  -> object +0x104
  -> NPCScript block lookup
  -> selected dialogue/UI records
```

The numeric record fields that previously looked coordinate-like are processed into rectangle geometry and reach IAT `0x004E251C` at `0x0045790A`. PE import parsing identifies that IAT entry as `USER32.dll!SetRect`.

Therefore values such as the familiar NPCScript numeric tuples must **not** be reused as field-map coordinates. They are part of UI/dialog layout handling.

The upstream producer of the compact NPC payload is still unresolved, so the runtime `blockId -> concrete map entity` edge is not yet proven.

## 3. Runtime object lookup: FINDNPC

The retail binary contains a real `FINDNPC` command path around `0x004A8A87`.

Observed behavior:

- compares the `FINDNPC` command string;
- iterates a runtime object vector rooted at globals `0x00A3A1B0 .. 0x00A3A1B4`;
- compares an object name field at `+0x08`;
- for a matching object, reads coordinate-like fields at `+0x5C` and `+0x60` and forwards them to a helper.

This proves that script/runtime code can resolve an object by name to live coordinates. It does **not** prove that Quest speaker IDs or NPCScript block IDs share the same numeric namespace as SMF `object_id` / `kind`.

## 4. Dlg/Tdg evidence

Two requested resources have direct client construction paths:

- `dlg\Employ.Tdg` path push at `0x004178F0`, constructor target `0x0042ED50`.
- `dlg\Warp.Tdg` path push at `0x00417EA4`, constructor target `0x0046B680`.

This confirms that Employ and Warp are distinct runtime dialog resources. It does not yet recover their internal command vocabulary, network callbacks, recruitment mutation, or map-transition implementation.

`NPC350.Tip` is intentionally excluded from this investigation: it is already established as a sprite/image library, not NPC placement or behavior data.

## 5. Static ID observations

The private Quest source contains 10 `Quest0..Quest9` files. The sanitized parser extracts only structural metadata, hashes, numeric IDs and counts; story/dialogue payloads are discarded.

Observed numeric `NAME` values include two visible ranges (`99..107` and several `500x` values), while `NPCScript.txt` has 39 block IDs. These are useful candidate namespaces but **must not be joined to map records by number alone**.

The S4 probe therefore scans SMF `kind` / `object_id` only as `RAW_NUMERIC_EQUALITY_ONLY` candidates. A row becomes a runtime binding only when an independent dispatcher/call chain proves the ID domain.

## 6. Remaining binding gaps

Still unresolved:

1. producer/dispatcher that supplies the compact NPC payload consumed at `0x00457DE0`;
2. proven `NPCScript block ID -> SMF/entity object` namespace mapping;
3. Quest condition/flag authority and update messages;
4. reward grant path;
5. recruitment mutation after Employ flow;
6. Warp dialog result -> map/zone transition;
7. Quest-driven battle/encounter invocation;
8. exact Dlg/Tdg internal command semantics.

The useful next probes should follow those **runtime callers and network messages**, not perform additional dialogue-text statistics.

## Reproduction

Use:

```bash
python3 tools/probe_quest_runtime.py \
  neodark-unpacked.bin \
  --quest-dir <private Quest.lib extraction> \
  --client-root <fixed 2.2 extracted client> \
  --out quest-runtime.json
```

`.github/workflows/static-quest-runtime.yml` performs the same workflow from the hash-pinned 2.2 installer and uploads only the sanitized JSON evidence.

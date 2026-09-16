# Quest / NPC server boundary closure

Status: **client evidence boundary reached**

Baseline: `f9c96fc68b7bae7ff1793fc423875d43a08d6cb4`

Retail target: UPX-decompressed `NeoDark.exe`, SHA-256 `432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7`.

This note closes the remaining S4 client-side archaeology gaps. It does not reconstruct retired server rules and does not publish original Quest dialogue text.

## 1. Field interaction request

The client-side field trigger is recovered at `0x004984D0`.

For a selected live object:

- object type is read from `+0xF8`;
- types `101..103` take the special interaction path;
- the client compares coordinate-like `+0xD4/+0xD8` fields against the active field actor;
- the special request is allowed only when Manhattan distance is `< 4`;
- the request is exactly five bytes:

```text
49 21 01 <uint16 object+0x1C>
```

Other object types take the observed fallback request:

```text
08 <uint16 object+0xB4>
```

This proves that the client sends a concrete field-object identity to the server. The handler does not contain a local table that maps that identity to NPC dialogue, battle, warp, recruitment, or a Quest branch.

## 2. NPCScript block selection is server supplied

The missing producer for the compact NPC payload is now recovered.

Normal receive opcode `0x92` lands at `0x0048D778`. When the active runtime mode is `2`, the receive case advances past the opcode and invokes virtual slot `+0x38` on the active dialog object.

`Dlg/MessageBox.Tdg` is constructed by `0x00456B40` with vtable `0x004E3F94`. Slot `+0x38` (slot 14) resolves to `0x00457DE0`, the previously recovered NPCScript payload decoder.

The payload is:

```text
uint8 blockId -> MessageBox +0x104
int16 valueA  -> MessageBox +0x108
int16 valueB  -> MessageBox +0x124
```

`0x00457DE0` then calls the NPCScript parser, which selects the block whose header ID equals `+0x104`.

Therefore the verified client chain is:

```text
field object interaction request
  -> server-side rule / state
  -> receive opcode 0x92
  -> MessageBox virtual slot +0x38
  -> blockId payload
  -> NPCScript block selection
```

The middle rule is not present in the fixed client. This also explains why direct numeric joins between `NPCScript` block IDs and SMF `object_id` values fail.

## 3. Quest step authority

The Quest presentation state has two recovered inbound dispatcher paths.

### Normal receive path

```text
opcode 0x2B
  -> 0x0048CC87
  -> 0x004907A0
  -> questIndex + stepIndex
  -> 0x0044DCA0
```

### Grouped 6A path

The alternate grouped dispatcher at `0x00494AE0` maps:

```text
6A 55
  -> 0x00494D08
  -> skip two-byte header
  -> 0x004907A0
  -> questIndex + stepIndex
  -> 0x0044DCA0
```

Direct relative-call scanning of the fixed executable finds only two callers of the Quest loader `0x004907A0`:

```text
0x0048CC8B
0x00494D11
```

Direct callers of Quest state initializer `0x0044DCA0` are:

```text
0x0048FE00
0x004907DC
0x004907F0
```

The latter two are the two control-object branches inside `0x004907A0`. `0x0048FE00` is a narrow hard-coded client exception that opens Quest 0 / Step 13 when a particular runtime value is `0x0A28`; it is not a general condition evaluator.

The evidence therefore supports implementing Quest progression as server-selected `(questIndex, stepIndex)` state, with only narrow client exceptions rather than a broad local Quest condition engine.

## 4. Reward boundary

The recovered Quest command dispatcher contains only:

```text
SCRIPT
SELECT
NAME
INVENTORY
CANCEL
REPAIR
```

None of these recovered branches directly grants currency/items, mutates authoritative character progression, recruits a unit, changes the map, or starts a battle.

S4 therefore does not invent reward semantics from Quest text. The rule that evaluates Quest conditions and awards gameplay results belongs outside the recovered text command language; in the fixed client the observed general Quest step selection itself is supplied by inbound state.

## 5. Employ / recruitment boundary

`Dlg/Employ.Tdg` is constructed by `0x0042ED50`.

Its action dispatcher at `0x00430300` reaches two network request helpers:

- `0x00430370`: opcode `0x4E`, five-byte request with two 16-bit values from the selected candidate/record;
- `0x00430420`: opcode `0x4D`, seven-byte request with three 16-bit values derived from candidate/record/UI state.

The observed confirmation handlers do not directly mutate the final party/roster. In the normal receive switch, first-byte opcodes `0x4D` and `0x4E` map to the default/unhandled case, so the authoritative result is not implemented as a same-opcode local echo in that dispatcher.

Without TDG control-label proof, S4 deliberately does not guess which request means hire versus remove/dismiss.

## 6. Warp / map-transition boundary

`Dlg/Warp.Tdg` is constructed by `0x0046B680`.

Selection handler `0x0046BB60` stages:

```text
runtime +0x117C = 1
runtime +0x1180 = selected value
runtime +0x1178 = pending flag when value is valid
```

It immediately sends:

```text
A4 02
```

A later state/timing path reaches `0x004A9D80`, consumes the staged destination, and sends:

```text
A4 01 <uint16 staged value>
```

No direct map replacement or zone installation occurs in these recovered Warp UI handlers. Normal receive opcode `0xA4` maps to the default/unhandled case in the normal switch, so the final accepted destination and map-transition response lie outside this UI request path.

## 7. Battle / encounter boundary

The field interaction request and the inbound battle-entry path are separate client-side events. The existing S1/S3 fixed-hash evidence identifies inbound battle entry separately (normal receive opcode `0x98`). S4 finds no Quest command-dispatch branch that locally jumps into battle entry.

Therefore a rule such as:

```text
this NPC / Quest branch -> battleZoneId X
```

must not be reconstructed from dialogue wording or local Quest token names. If that decision was produced by the retired server, the fixed client cannot recover the missing predicate by itself.

## 8. Closure decision

The useful client-side chain is now recovered to its evidence boundary:

```text
field entity / selected object
  -> client interaction request with object identity
  -> [retired server authority]
       - choose NPCScript block
       - choose Quest index / step
       - accept/reject Employ action
       - accept Warp destination / choose resulting transition
       - decide Quest/NPC-driven battle when applicable
       - apply reward/condition rules
  -> client receives/presents resulting state
```

S4 is therefore closed as **CLIENT_EVIDENCE_BOUNDARY_REACHED**.

What remains is not an unsearched local Quest/NPC table. It is server-side behavior that would require server binaries/source, packet captures, or an independently preserved protocol implementation to recover exactly.

## Reproduction

```bash
python3 tools/probe_quest_server_boundary.py neodark-unpacked.bin \
  --out quest-server-boundary.json
```

The probe verifies the fixed hash, exact code signatures, receive dispatch tables, Quest direct-call sets, and request packet construction without executing the original program.

# Enemy AI instance binding recovery

> Scope: YBCS/NeoDark client 2.2, fixed UPX-decompressed SHA-256 `432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7`. Static inspection only; the original program is not executed.

This note extends `enemy-ai-recovery.md` and `combat-ai-static-recovery.md`. The main result is the **battle-instance binding chain**, not another proof of the already-recovered AI grammar.

## 1. Battle roster instance -> live unit -> AI program

**VERIFIED** on the fixed retail image:

- battle roster records are `0xC8` / 200 bytes;
- roster `+0x00` is copied into live battle unit `+0x24` and acts as the unit/program key;
- roster `+0xB8` WORD is copied into live unit `+0x2C8` as the category;
- roster `+0xC4` is the local behavior-program string field;
- categories `7` and `8` enter the local AI-program parser and store the resulting program on live unit `+0x344`;
- an empty local `+0xC4` string is replaced by `ODNORMAL REST(20),ATTACK(80)`.

The new key relation is:

```text
battle roster record +0x00
        -> live unit +0x24 (unit id/key)
        -> network AI table lookup by program.id
```

`+0xC4` is the **deserialized in-memory roster-record offset**. A fixed raw network-packet byte displacement for the same string is **UNVERIFIED** because the surrounding network representation is variable-length.

## 2. Binding precedence

`0x00402D90` establishes runtime precedence:

| Priority | Condition | Program source | Status |
| --- | --- | --- | --- |
| 1 | network/session slot has `program.id == unit.id` | network program table | **VERIFIED** |
| 2 | no network match and category is `7` or `8` | roster `+0xC4`; empty -> retail default | **VERIFIED** |
| 3 | no network match and category is not `7`/`8` | alternate handler `0x00403280` | **VERIFIED** |

The client keeps 100 network-program slots at stride `0x110`. Inbound packet `6A 69` clears/loads this table, reads length-prefixed AI strings, and sends them through the full AI parser at `0x004011E0`. Program ids are later matched to live unit `+0x24`.

This means the server/session can provision a policy program while the observed weighted action selection still executes in the client.

## 3. AREA / SOILDER

The full network-program parser consumes target descriptors before action rows:

- `AREA` -> target kind `0`, with three parsed integer fields at program `+0x0C`, `+0x10`, `+0x14`;
- historical spelling `SOILDER` -> target kind `1`, with one parsed integer at `+0x18`.

**VERIFIED:** these fields are parsed and stored by the full network-program parser.

**VERIFIED:** the local roster `+0xC4` path parses order/action rows but does not call this full target-descriptor parser.

**UNVERIFIED:** the exact gameplay meaning of the `AREA` triplet and `SOILDER` value. The evidence does not justify naming them radius, nearest target, soldier id, team id, or another concrete semantic yet.

## 4. Target policy and equal-distance behavior

`0x00402A10` is used by ATTACK/MAGIC target acquisition. It:

1. generates a targetable footprint through `0x00403790`;
2. scans cells and rejects invalid/dead/inactive units;
3. applies relationship filtering;
4. appends every eligible unit id to a candidate array;
5. selects `candidate[rand() % candidate_count]`.

Therefore, within the generated eligible footprint:

- **VERIFIED:** no nearest-distance ranking is performed before the final draw;
- **VERIFIED:** same-distance targets have no separate deterministic tie-break;
- **VERIFIED:** eligible targets at different distances also share the same random pool after they pass range/footprint and relationship filtering.

Distance can still affect footprint/range generation. The recovered fact is only that it is not a preference ordering among candidates already admitted to the pool.

## 5. Movement / attack / magic position selection

After target acquisition, the client resolves actor/target coordinates and calls target-mode-specific helper families including:

- `0x00404580`
- `0x00404940`
- `0x00406B60`
- `0x00406E20`

When a feasible action/coordinate buffer exists, the executor ultimately calls `0x004AA050`, which serializes outbound `6A 89`.

**VERIFIED boundary:** target/position/action data is computed client-side before submission.

**INFERRED:** these helper families implement target-mode-specific movement/attack/cast placement policies. Their structural role is clear from the call chain, but their exact gameplay names are not fully recovered.

**UNVERIFIED:** exact cell priority/tie-break among multiple equally feasible movement, attack, or magic positions. Do not implement a nearest-cell or random-cell rule from this evidence alone.

## 6. Client-autonomous vs server/session-driven

The recovered split is:

```text
server/session
  -- inbound 6A 69: optional per-unit AI programs -->
client
  -- binding precedence / weighted action / target / feasible position -->
  -- outbound 6A 89: selected action/route buffer -->
server
```

Thus:

- policy provisioning can be server/session-driven (**VERIFIED**);
- weighted action choice, target draw, and feasible placement preparation are client-local (**VERIFIED**);
- the client submits its selected composite action through `6A 89` (**VERIFIED**);
- server validation, acceptance, conflict resolution, and final authoritative application are **UNVERIFIED** by this client-only evidence.

Do not collapse this into either “server fully commands enemies” or “client is authoritative”; the evidence supports a split model.

## 7. Concrete historical enemy -> program rows

The static executable contains grammar literals and the embedded fallback, but no static table of non-default historical enemy-instance programs. The available private assets and retained static-research artifact also contain no saved live `6A 69` payload or roster capture with those strings.

Therefore `manifests/enemy-ai-binding.json` intentionally keeps `concrete_historical_bindings.entries` empty with status **UNVERIFIED**. Assigning the fallback to every enemy would cross the evidence boundary.

## Reproduction

```bash
python3 tools/probe_ai_binding.py /path/to/neodark-unpacked.bin --out /tmp/ai-binding.json
python3 -m unittest tests.parsers.test_ai_binding
```

The probe verifies the fixed hash and the binding/target/network signatures before emitting its report.

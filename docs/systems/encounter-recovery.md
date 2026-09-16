# Encounter recovery: field interaction, battle entry, and server boundary

Scope: fixed-hash YBCS Online 2.2 client. All retail-program evidence below comes from static byte/resource inspection only. The installer, `NeoDark.exe`, and unknown DLLs were never executed.

## Executive conclusion

The original client exposes **interaction uplinks** and a separate **server/session-authored battle-entry downlink**. The checked retail path does not prove a universal local `fieldMapId -> battleZoneId` table.

The safest recovered model is:

```text
selected world/scene object
  -> local type/state/proximity gate
  -> action uplink (49/21, 49/04, or 08 depending on object path)
  -> [retired server/session decision boundary]
  -> inbound 0x98 mode 1 battle entry
  -> explicit battleZoneId + optional geometry
  -> client loads sz-%04d.mmf
```

The three uplinks above are **not** all proven encounter-start opcodes. They are native interaction/action paths that can sit before a server decision.

## VERIFIED native client facts

### 1. World/network entity action

Native function around `0x004984D0` operates on the selected world entity.

The entity-record parser around `0x004B56CA` establishes the relevant runtime fields:

| Field | Static fact | Evidence |
| --- | --- | --- |
| `+0xb4` | first 16-bit word from the entity record | VERIFIED |
| `+0xf8` | entity type byte | VERIFIED |
| `+0x1c` | following signed 16-bit entity-record attribute | VERIFIED |
| `+0x7d` | small state byte later used by the action gate | VERIFIED |

The action path first rejects unsuitable state (`+0xb8 != 0` or `+0x7d >= 10`). It then branches on entity type:

- type `101..103`: compute Manhattan distance; only distance `< 4` proceeds;
- distance `>= 4`: return without sending this near-target request;
- on success: send exactly five bytes: `49 21 01 <16-bit value copied from +0x1c>`;
- other entity types that pass the earlier gates use a separate three-byte path: `08 <16-bit value copied from +0xb4>`.

This corrects an earlier ambiguity: the `49/21` trailing word is **not the same runtime word used by the `08` path**. Native parsing shows `+0x1c` and `+0xb4` come from distinct entity-record fields.

**Boundary:** calling `49/21` an "encounter request" is still UNVERIFIED. The native bytes only prove a typed near-target action.

### 2. Scene-object interaction action

Native sender `0x00491200` serializes:

```text
49 04 02 00 <16-bit runtime scene-object id from object +0x80>
```

The sole direct caller in the fixed image is `0x00498944`. Its caller path computes Manhattan distance between the selected scene object and local actor and only sends when the distance is `< 9`.

The scene manager independently compares object `+0x80` during lookup (`0x0048B000`), and object creation assigns the same field from a runtime argument (`0x0048ACBD`). Therefore `+0x80` is a runtime scene-manager identifier used by the interaction packet.

**Boundary:** no static join has been proved between runtime `+0x80` and an `SMF` static object id. Treat `SMF object id -> 49/04 runtime id` as UNVERIFIED.

### 3. Battle entry is a separate inbound state transition

The original downlink handler reaches `0x0048D699`; mode 1 is decoded by `0x004901D0`. Existing battle recovery established twelve signed 16-bit words, with word 7 consumed as the battle zone and words 8..11 forming optional battle-grid geometry when present.

Every direct call to battle-session constructor `0x0048ECB0` in the fixed image is in the inbound battle-handler region:

- `0x0048D5E6`
- `0x0048D655`
- `0x0048D6E7`
- `0x0048D746`

The constructor consumes the supplied zone, formats exact string `sz-%04d.mmf`, stores the current zone, and loads that battle map. Optional geometry is consumed client-side; the recovered scale path uses 32 pixels on one isometric axis and 16 on the other.

Therefore `battleZoneId` is **authoritative battle-entry/session data on the client boundary**. It is not proved to be calculated from the current field map by the retail client.

## Concrete field-map -> battle-zone status

No mapping in this table is promoted to retail VERIFIED unless a native/client-data join proves both sides.

| Field map | Battle zone | Classification | What supports it | S6 default |
| --- | ---: | --- | --- | --- |
| `1030` | `1` | RECOVERED_SECONDARY | bundled 2026 offline compatibility binding; native map resources also contain gate/interaction-shaped resource evidence | disabled as retail truth |
| `1070` | `3` | RECOVERED_SECONDARY | bundled offline compatibility binding plus native gate/interaction-shaped resource evidence | disabled as retail truth |
| `1090` | `7` | RECOVERED_SECONDARY | bundled offline compatibility binding plus native gate/interaction-shaped resource evidence | disabled as retail truth |
| `1100` | `9` | RECOVERED_SECONDARY, weak | compatibility replacement policy only; the checked native map did not provide the same gate-resource corroboration | do not use as recovered retail binding |

Important ambiguity: native `1070` and `1080` IMF/MMF/SMF bundles are byte-identical. Static client resources alone therefore cannot decide which field-map identity the retired server/session intended at a particular progression state. This blocks promotion of `1070 -> 3` to VERIFIED.

The compatibility implementation also labels entity types `101/102/103` as camp/tent-like interactions. That is useful RECOVERED_SECONDARY context and is another reason not to rename native `49/21` as an encounter opcode without stronger evidence.

## Resource archaeology and negative evidence

The fixed 2.2 package was statically extracted in the project archaeology workflow. Relevant source hashes include:

| Resource | SHA-256 |
| --- | --- |
| installer | `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88` |
| embedded 7z payload | `9beb606655d2553c03e80d7eda36a48c135976a3812ce5432d3b2af23e996357` |
| packed `NeoDark.exe` | `c1be05eb2977a8aae8cbe8b716bc1e3957263edde8187d5269d554b327f13cbd` |
| statically decompressed image | `432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7` |
| `Quest.lib` | `23fa524844be0c553c55e66e071e3c9190337d92b19745f242580008a63e7397` |
| `Set.lib` | `ce1bb0425b367289f144e0780147f7c63abb833733035949853ce70dfb3c82fe` |
| `CombatMap.Tip` | `08d50c0910d04b1d7a6eee209cfb6bb9c4a197cff2a49fd478eeea67fd5f22ce` |

The extracted Quest/NPC script members and Dlg/Tdg surfaces were searched for direct battle/map-routing indicators such as `LOADSCENE`, `BATTLE`, `COMBAT`, `ZONE`, `MAP`, `WARP`, `49/21`, `0x98`, and `sz-`. No direct retail field-map -> battle-zone binding was recovered from those text/static surfaces.

That is **scoped negative evidence**, not proof that no client-side join exists anywhere. Combined with the native `0x98 -> battleZoneId -> sz-%04d.mmf` path, it supports keeping the missing encounter decision on the server/session boundary until stronger evidence appears.

## What is still server/session boundary

The following are not recoverable as retail facts from the checked client path alone:

- whether a given interaction actually starts battle;
- quest/progression/party conditions consulted before battle;
- random encounter or cooldown policy, if any;
- the authoritative `field/object/event -> battleZoneId` selection rule;
- server-side failure/denial branches that return no battle entry.

These are INFERRED to have been at least partly server/session-authored because the client emits interaction requests and later consumes an explicit battle-zone-bearing entry record, while no universal local mapping has been proved.

## Reproduction

`tools/probe_encounter_recovery.py` verifies the hash-pinned native signatures and direct-call sets without executing the game. It emits a native evidence JSON report when run against the private hash-pinned image. Candidate bindings and their provenance are stored separately in `manifests/encounter-bindings-2.2.json` so secondary compatibility policy cannot be mistaken for native proof.

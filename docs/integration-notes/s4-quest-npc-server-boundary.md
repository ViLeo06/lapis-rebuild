# S4 Quest/NPC server-boundary handoff

S4 status: **closed at client evidence boundary**.

## Runtime model to implement

Keep field entities, NPCScript blocks, and Quest state as separate namespaces.

```text
Field interaction
  selected object identity
  -> request to server

NPC dialogue result
  server -> blockId
  -> NPCScript block presentation

Quest result
  server -> (questIndex, stepIndex)
  -> Quest local presentation
  -> optional client selection/progression response
```

Do not create a direct `SMF object_id == NPCScript blockId` or `SMF object_id == Quest NAME` join.

## Field trigger fact

For object type `101..103`, when Manhattan distance is `< 4`, the fixed client sends:

```text
49 21 01 <uint16 object+0x1C>
```

The fallback path sends:

```text
08 <uint16 object+0xB4>
```

The server-side interpretation of that object identity is not present in the client handler.

## NPCScript fact

NPCScript selector input is server supplied:

```text
receive 0x92
  -> active MessageBox virtual +0x38
  -> uint8 blockId
  -> NPCScript block lookup
```

`NPCScript.txt` numeric record tuples remain UI geometry (`USER32!SetRect`), not map coordinates.

## Quest fact

Two inbound forms reach the same Quest loader:

```text
0x2B + quest/step payload
6A 55 + quest/step payload
```

Treat `(questIndex, stepIndex)` as authoritative presentation state received from the server. The client has one narrow Quest0/Step13 exception; do not generalize it into a local condition engine.

## Employ

`Dlg/Employ.Tdg` emits network requests (`0x4E` / `0x4D`) and does not directly commit the final roster in the recovered confirmation path.

Implement recruitment as a request/result transaction. Do not assign exact hire/dismiss labels to the two packets until independent TDG/control evidence exists.

## Warp

`Dlg/Warp.Tdg` stages a selected value and sends:

```text
A4 02
A4 01 <uint16 selected>
```

Do not perform an immediate client-authoritative map transition at selection time. The accepted transition must come from a later authoritative result/state change.

## Reward / battle

Quest text commands do not directly contain a recovered reward or battle-start primitive. Reward logic and Quest/NPC-driven battle decisions must be implemented as reconstructed server rules, configuration, or authored compatibility behavior—not as claims about recovered retail client semantics.

## Cross-session use

- S1 may consume the field interaction request and battle-entry boundary but should not invent a direct field-map/NPC -> battle-zone table from S4 evidence.
- S6 should model server authority explicitly between field interaction and NPC/Quest/warp/recruit/battle results.
- UI work may use NPCScript rectangle/layout records but never as world placement.

## Evidence

- `tools/probe_quest_runtime.py`
- `tools/probe_quest_server_boundary.py`
- `tests/parsers/test_quest_runtime.py`
- `tests/parsers/test_quest_server_boundary.py`
- `docs/systems/quest-runtime-binding.md`
- `docs/systems/quest-runtime-server-boundary.md`
- `.github/workflows/static-quest-runtime.yml`

# Battle entry, scene selection and damage authority recovery

> Scope: hash-pinned 2.2 retail client static evidence. No installer, `NeoDark.exe` or unknown DLL is executed.

## Battle entry is server/authored data, not a field-map heuristic

The main outer downlink handler for opcode `0x98` reaches native `0x0048D699`. Mode 1 is decoded at `0x004901D0` into twelve signed 16-bit words.

Recovered fields relevant to scene construction:

- word 1: local owner/participant slot;
- word 7: battle zone/current-zone value passed into battle-session construction;
- words 8..11: optional battle-grid rectangle; the decoder marks extended geometry present only when all four are not `-1`.

Native `0x0048ECB0` receives the zone value. When it differs from the current mutable zone, it formats the exact string `sz-%04d.mmf`, stores the zone and loads that map. Native `0x0049C7C0` consumes the optional geometry and scales the two isometric axes by 32 and 16 pixels.

Therefore the retail client path is effectively:

`battle-entry payload -> battleZoneId -> sz-NNNN.mmf + optional grid rectangle`

The client does **not** prove a universal local `fieldMapId -> battleMapId` formula. In the offline Web rebuild, battle scene selection should become a data-driven `BattleEntry/EncounterSpec`; the current hard-coded training map is only a review scaffold.

## Static battle-map visual evidence

`zone_name.txt` contains battle/training-labelled zones including 450–457 (`对练场1`..`对练场8`) and 498/499 (low/high-tier competition arena/waiting room). `CombatMap.Tip` contains eight visible selection thumbnails.

Static rendering/visual comparison gives a strong resource mapping:

- `CombatMap.Tip` frames 0..5 visually match `sz-0450`..`sz-0455`;
- frames 6..7 visually match the white-arena family represented by `sz-0498`/`sz-0499`;
- `sz-0456` and `sz-0457` exist as additional training maps but do not match those last two thumbnails.

This supports the interpretation that `CombatMap.Tip` is a battle-map selection UI resource. It does **not** establish which ordinary field encounter selects a particular battle zone.

## Encounter trigger boundary

The extracted archive contains maps, battle resources and character assets, but no independently verified retail field-spawn table has been recovered. The secondary compatibility implementation explicitly labels its offline field placements as replacement policy, not retail data. This aligns with the original `0x98` path: the battle zone/geometry arrives in battle-entry state.

Current conclusion: exact retail field encounter placement/trigger and field-to-battle scene choice were at least partly server/session-authored. Continue searching Quest/dialog/map/event/client dispatchers, but do not fabricate a local mapping when evidence is absent.

## Damage is authoritative absolute state on the client boundary

The original HP consumer at `0x00405AC0` receives a signed HP value. At `0x00405C1A` it reloads that incoming value, computes the visual delta from the previous live HP, and writes the incoming value directly to live unit offset `+0x34`; the delta is stored separately at `+0x148`.

Recovered battle wire evidence independently identifies downlink `6A/05` as `effect_mode, unit_id, absolute_hp`. Ordinary action uplink `6A/82` carries actor ID, target ID and the two sampled battle-cell values — **not a client-side damage roll**. A separate `6A/0F` presentation path exists for a no-HP-change/miss-like action.

Consequences:

- the retail client is a consumer of authoritative absolute HP updates;
- exact retail physical hit/damage/critical RNG arithmetic cannot be claimed from this client path alone;
- `ability.atr` and `itemtbl.atr` still expose meaningful authored accuracy/evasion/critical/damage/defence fields, but the arithmetic combining them was server authority unless further evidence is found;
- current Web training damage must remain explicitly `UNVERIFIED` or be replaced by a documented reconstruction policy, never relabelled as recovered retail formula.

Reproducible byte checks live in `tools/probe_retail_battle_runtime.py`; the static decompression chain is pinned by `.github/workflows/static-battle-unpack.yml`.

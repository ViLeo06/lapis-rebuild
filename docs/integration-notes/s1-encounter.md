# S1 encounter recovery -> S6 runtime integration note

This note is intentionally implementation-facing. S1 does not modify `web/src/scene.ts`, `web/src/main.ts`, or `web/src/battle.ts`.

## Required separation of concerns

S6 should model two separate events instead of one hard-coded map switch:

1. **Interaction intent** — player selected a runtime entity/object and passed local state/proximity gates.
2. **Battle entry** — an authoritative result supplies `battleZoneId` and optional battle geometry.

A minimal data shape can be conceptually equivalent to:

```text
InteractionIntent {
  sourceKind: worldEntity | sceneObject
  sourceRuntimeId?: number
  nativeAction: 49/21 | 49/04 | 08 | reconstruction
  provenance: VERIFIED | RECOVERED_SECONDARY | INFERRED | UNVERIFIED
}

BattleEntry {
  battleZoneId: number
  geometry?: { ... }
  provenance: VERIFIED | reconstruction
}
```

The exact TypeScript names are left to S6; the boundary is the requirement.

## Native behavior S6 may reproduce

### World/network entity path — VERIFIED

- earlier state gates must pass;
- entity type `101..103` uses Manhattan distance `<4`;
- passing path corresponds to `49 21 01` plus the 16-bit entity attribute stored at runtime `+0x1c`;
- distance `>=4` returns without that request;
- other types use a distinct `08` path carrying the runtime word stored at `+0xb4`.

Do not label `49/21` as "start encounter" in runtime APIs or UI unless later evidence promotes that semantic.

### Scene-object path — VERIFIED

- selected scene object must be within Manhattan distance `<9`;
- native action payload is `49 04 02 00 <runtime scene id>`;
- the serialized id comes from runtime object `+0x80`.

Do not bind static SMF object ids directly to the runtime `+0x80` id without an explicit recovered join.

### Battle-entry path — VERIFIED

- battle scene selection consumes an explicit `battleZoneId` from battle-entry/session state;
- zone loads `sz-%04d.mmf`;
- extended entry can supply battle-grid geometry.

This should be the canonical S6 battle transition API: **the battle zone is an input to battle entry, not a formula derived from the current field map.**

## Secondary compatibility candidates

The bundled 2026 offline compatibility layer contains these replacement bindings:

- `1030 -> 1`
- `1070 -> 3`
- `1090 -> 7`
- `1100 -> 9`

All remain `RECOVERED_SECONDARY` because the compatibility layer explicitly describes its offline field encounter placement/policy as replacement logic rather than recovered original-server data.

S6 rules:

- do not enable any of these as global retail defaults;
- if an exact-historical/offline compatibility mode needs them, keep them in data with provenance attached and an explicit opt-in;
- `1030 -> 1`, `1070 -> 3`, and `1090 -> 7` have some native map-resource corroboration and may be useful as bounded compatibility fixtures;
- do not treat `1100 -> 9` as recovered retail behavior; current native-resource corroboration is weaker;
- native `1070` and `1080` map bundles are byte-identical, so never infer `1080` from `1070` or vice versa based only on content equality.

## Server-boundary placeholder

Until stronger evidence appears, the runtime needs an explicit policy seam representing the retired server/session decision:

```text
InteractionIntent
  -> EncounterAuthority.resolve(...)
  -> no battle | BattleEntry(battleZoneId, geometry)
```

For the offline rebuild, `EncounterAuthority` can be a documented reconstruction adapter. Its decisions must carry provenance and must not be relabelled VERIFIED merely because the client can render the resulting battle map.

## Acceptance checks for S6

- no universal `fieldMapId -> battleZoneId` formula is introduced;
- battle loading requires an explicit zone at the battle-entry boundary;
- world-entity `<4` and scene-object `<9` gates are not conflated;
- `49/21`'s `+0x1c` word is not replaced with the `+0xb4` entity word;
- runtime scene-object id is not silently equated with static SMF object id;
- secondary candidate bindings remain provenance-tagged and opt-in;
- unknown server quest/RNG/eligibility rules remain clearly marked reconstruction/UNVERIFIED.

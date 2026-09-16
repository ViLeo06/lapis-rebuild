# S2 integration note — Enemy AI Binding

## Integration contract

Treat retail enemy AI as **battle-instance data**, not a monster-template constant.

Recovered lookup contract:

```text
roster/unit id
  -> matching network program.id, if present
  -> else category 7/8 roster behavior string
       -> empty string uses ODNORMAL REST(20),ATTACK(80)
  -> else alternate non-AI-string handler
```

The unit key is roster `+0x00` copied to live unit `+0x24`. A server/session-provided `6A 69` program with the same id overrides the local category-7/8 roster program.

## What an implementation may use now

- Preserve the precedence above as a data-model/API contract.
- Preserve the distinction between an explicitly empty category-7/8 roster program and “no weighted-program path for this category”.
- Model the final recovered target pick as `rand()%candidate_count` over units that passed footprint/state/relation filtering. Do not add nearest-target preference.
- Keep AI selection separate from authoritative combat results. The client emits the selected composite action through `6A 89`; server validation/application is still unknown.

Do **not** wire the current Web training enemy to this as “the original AI”. Historical encounter/roster payload data is still missing.

## Evidence matrix

### VERIFIED

- roster stride `0xC8`; unit key `+0x00`; category `+0xB8`; local behavior `+0xC4`;
- roster unit key -> live unit `+0x24`;
- 100-slot, `0x110`-stride network AI table matched by program id to live unit id;
- inbound `6A 69` installs full AI programs;
- network program match has priority over category-7/8 local program;
- category 7/8 local empty string uses `ODNORMAL REST(20),ATTACK(80)`;
- non-7/8 units without a network match route to `0x00403280`, not the weighted AI-string executor;
- target selection in `0x00402A10` uses `rand()%candidate_count` after eligibility filtering, with no distance-priority stage in that eligible pool;
- client computes target/placement data and emits the selected composite action through outbound `6A 89`.

### RECOVERED_SECONDARY

No secondary source is promoted to a concrete enemy-id -> AI-program row in S2. Story resources and existing secondary material do not supply the missing live roster/network program payload.

### INFERRED

- `0x00404580`, `0x00404940`, `0x00406B60`, and `0x00406E20` form target-mode-specific placement helper families. Their role is clear from the call chain, but exact gameplay naming/semantics are not fully recovered.

### UNVERIFIED

- concrete historical `enemy/roster id -> non-default AI program` rows;
- a fixed raw-wire offset corresponding to in-memory roster `+0xC4`;
- exact gameplay semantics of `AREA` and `SOILDER` descriptor values;
- exact tie-break/priority among multiple feasible movement, attack, or magic positions;
- server-side validation and authoritative resolution after client `6A 89` submission.

## Handoff to encounter / battle reconstruction

When S1 or a later capture recovers a real roster or `6A 69` payload, add rows to `manifests/enemy-ai-binding.json` only with source hashes and explicit evidence status. Minimum useful row:

```text
battle/session source -> roster unit id -> category -> roster +0xC4 string
                                      \-> optional matching 6A69 program.id/string
                                      -> effective program source
```

Do not infer a program from sprite id, monster name, map id, or Web training data without independent evidence.

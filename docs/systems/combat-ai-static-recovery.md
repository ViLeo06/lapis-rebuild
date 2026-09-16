# Retail enemy AI static recovery

> Scope: hash-pinned 2.2 `NeoDark.exe`, deterministically UPX-decompressed and inspected as bytes only. The original program is not executed. Reproduction: `tools/probe_retail_battle_runtime.py`.

## What is now recovered from the retail client

The client contains a real battle-AI mini-language and executor. This is no longer treated as a generic `UNVERIFIED` enemy loop.

### Grammar and defaults

Exact retail literals and parser branches recover three order modes:

| Token | Native mode |
| --- | ---: |
| `ODNORMAL` | 2 |
| `ODATTACK` | 4 |
| `ODDEFENCE` | 8 |

The target grammar contains `AREA` and the exact retail spelling `SOILDER`. Action rows contain `REST`, `ATTACK` and `MAGIC`. The parser allocates/parses up to 20 action rows.

The retail image also contains the exact default behavior program:

`ODNORMAL REST(20),ATTACK(80)`

This is a client fact. It does not prove every enemy used that default; per-unit behavior can be supplied or overridden by battle roster/session data.

## Native chooser behavior

The executor at `0x00402E30` performs a `rand() % 100` roll. The three order modes install different HP/MP rest thresholds before weighted action selection:

| Order | HP threshold | MP threshold |
| --- | ---: | ---: |
| `ODATTACK` | 20% | 40% |
| `ODDEFENCE` | 45% | 60% |
| `ODNORMAL` / default | 30% | 50% |

If the unit falls below the corresponding HP or MP threshold, control branches to the rest path.

Weighted row selection is also recovered exactly. The executor adds the current row weight to a cumulative total, compares the `0..99` roll to that total, and advances only on `roll > cumulative`. Therefore the selected condition is **inclusive**:

`roll <= cumulative_weight`

That historical off-by-one must be preserved if the Web reconstruction later adopts the retail chooser. For example, a first cumulative threshold of 20 accepts rolls 0 through 20, not only 0 through 19.

## Action dispatch

The checked executor branches action kind `0 -> REST`, `1 -> ATTACK`, `2 -> MAGIC`.

The MAGIC branch has preconditions before committing the action. Static control flow confirms at least negative magic IDs and insufficient MP can reject the current row; the scan can continue to a later weighted row using the same roll. Further checks/target semantics remain to be named only after their data fields are independently recovered.

## What remains unresolved

This recovery closes the **AI grammar and core chooser**, but not the whole retail enemy behavior system. The remaining work is:

- bind exact AI programs/overrides to specific retail enemy units and encounter rosters;
- recover the precise `AREA` / `SOILDER` target-selection policy and tie-breaking;
- recover path/position preference around attack and magic target acquisition;
- distinguish client autonomous AI from server-driven commands where both are possible;
- connect AI action requests to the still-missing retail server hit/damage formula.

Until those bindings are recovered, the Web training enemies must not be relabelled “original AI” merely because the grammar/executor is now known.

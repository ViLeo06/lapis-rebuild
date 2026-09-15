# Enemy AI recovery — static retail client evidence

> Scope: YBCS/NeoDark client 2.2, fixed packed SHA-256 `c1be05eb2977a8aae8cbe8b716bc1e3957263edde8187d5269d554b327f13cbd`; UPX-decompressed static image SHA-256 `432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7`. The original program is **not executed**.

## Recovered grammar

The original client contains exact literals and a parser for:

- orders: `ODNORMAL`, `ODATTACK`, `ODDEFENCE`;
- actions: `REST`, `ATTACK`, `MAGIC`;
- target selectors: `AREA`, exact historical spelling `SOILDER`;
- embedded fallback/default: `ODNORMAL REST(20),ATTACK(80)`.

The action parser at native `0x00401510` allocates at most 20 action rows. Parentheses are normalized to separators; an action row stores a weight, action kind and optional magic definition. Recovered kinds are `REST=0`, `ATTACK=1`, `MAGIC=2`.

## Native autonomous selector

The executor beginning at `0x00402E30` draws a random value modulo 100. Before weighted selection it applies order-dependent HP/MP gates using current/max values in the live battle unit:

| Order | HP gate | MP gate |
| --- | ---: | ---: |
| `ODATTACK` | 20% | 40% |
| `ODNORMAL` | 30% | 50% |
| `ODDEFENCE` | 45% | 60% |

Falling below either threshold routes to the REST path. Otherwise the executor adds action weights cumulatively and selects a row when `roll <= cumulative`; the machine code uses `jg` to skip the current row, so the historical comparison is inclusive.

Selected action kinds branch to the recovered REST, ATTACK and MAGIC paths. MAGIC has additional availability/MP/target checks and may continue to later rows when a candidate cannot be used.

## What this proves

This is **VERIFIED-STATIC** behavior in the original client binary: grammar, thresholds, modulo-100 draw, inclusive weighted selection and action-kind branching are no longer Web inventions.

It does **not** prove which AI string every retail enemy used. Battle roster/network state can provide per-unit order/action data. Enemy definitions, encounter composition and targeting programs therefore remain data/server-authority work unless independently recovered.

## Reconstruction policy

Do not keep the current training enemy policy as if it were retail AI. The next engine layer should expose a data-driven AI program with the recovered grammar. Unknown per-enemy programs must stay explicitly provisional; `ODNORMAL REST(20),ATTACK(80)` may be used only as the client's embedded default/fallback, not claimed as the script for every enemy.

Reproducible byte checks live in `tools/probe_retail_battle_runtime.py` and `.github/workflows/static-battle-unpack.yml`.

# Retail damage / hit / critical recovery — static client boundary

> S3 scope: fixed-hash 2.2 retail client and extracted authored tables. Static inspection only; the original installer, `NeoDark.exe`, and unknown DLLs are not executed.

## Conclusion

The client contains real authored combat inputs, but the exact retail **physical hit, evasion, defence, critical, damage, skill/magic damage, elemental/modifier and combat RNG formula is not recovered from the current client evidence**.

That negative result is meaningful rather than a missing implementation detail:

- ordinary attack uplink `6A/82` sends actor/target and two sampled battle-cell pairs, not a final damage roll;
- downlink `6A/05` supplies a signed **absolute HP** value;
- the HP consumer writes that absolute value directly into live unit HP and separately calculates the old/new delta for presentation;
- the client has local RNG in the *post-HP presentation* path, but the verified `% 9` / `% 5` rolls occur only after the incoming HP already proves that damage happened;
- no evidence found in the inspected action/HP/table-loader call chains justifies combining attack, defence, hit, evasion or critical fields into a retail formula.

Therefore current Web training damage must remain `UNVERIFIED` or be explicitly documented as reconstruction policy.

## Fixed inputs

| Input | SHA-256 |
| --- | --- |
| UPX-decompressed `NeoDark.exe` | `432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7` |
| `ability.atr` | `0bab4c622336378e52fb0d13b6e5d50a78f2c514d687332d47042c416a07c04b` |
| `itemtbl.atr` | `cf5c9786810b80619ae3133ad77a27d9fb51f2078c30c947c482483d1030eb2e` |
| `Magictbl.atr` | `d885bbd1bddffd3d4bf05b2b4e36232c62d94fc78209d46861b01986779ef0d9` |
| `Magicptn.atr` | `5affdd750873e7ccb5a364cc372870b98cde95df905140fa88aedd79155cfceb` |
| `solskill.atr` | `43ad7f975336e7c105d7eda7a48fe8afcee109ce81b618ca83ef7ce812fe1a41` |

Reproduction tools:

- `tools/probe_damage_tables.py`
- `tools/probe_damage_binary.py`
- existing `tools/probe_retail_battle_runtime.py`

## 1. `ability.atr`: real authored fields

The fixed table has 724 rows and 46 fields. The retail binary references `ability.atr` at `0x004A060F`. Its parser format at `0x004F9784` contains exactly 46 conversions. Fields 1–40 are stored sequentially at record offsets `+0x04..+0xA0`, which lets table fields be tied to later client reads without guessing.

Damage-related source fields include:

| 0-based column | Source label | Conservative meaning | Evidence |
| ---: | --- | --- | --- |
| 18 | `hit(명중)` | hit/accuracy authored value | VERIFIED authored field |
| 19 | `elu(회피)` | evasion authored value | VERIFIED authored field |
| 20 | `blow(필살)` | special/critical-like authored value | VERIFIED field; exact arithmetic unknown |
| 21 | `mhit(마명)` | magic-hit authored value | VERIFIED authored field |
| 22 | `melu(마회)` | magic-evasion authored value | VERIFIED authored field |
| 25 | `cry(비명)` | hit-reaction/presentation selector | VERIFIED client consumption |
| 35 | `속성` | attribute/element field | VERIFIED field; exact combat semantics unknown |
| 36 | `무기데미지` | weapon-damage authored value | VERIFIED authored field |
| 37 | `방어력` | defence authored value | VERIFIED authored field |
| 38 | `마법데미지` | magic-damage authored value | VERIFIED authored field |
| 39 | `마법방어력` | magic-defence authored value | VERIFIED authored field |

For target classes, examples remain exact authored rows: B100 has `hit=160`, `elu=2`, `blow=2`, `mhit=160`, `melu=5`; B109 has `hit=160`, `elu=2`, `blow=2`, `mhit=160`, `melu=10`. These values are not converted here into percentages or probabilities.

### `cry` is a presentation field, not a hidden damage input

At `0x00405B81`, after the incoming HP is known to be lower than the old HP, the client reads ability record `+0x68`. Because the 46-field loader mapping is recovered, `+0x68` maps exactly to table field 26 / 0-based column 25: `cry(비명)`.

The client accepts values `0..5` and dispatches hit-reaction presentation. Some branches use local RNG modulo 9 or modulo 5. The verified ordering is:

`authoritative absolute HP received -> detect HP decrease -> read cry -> choose reaction/effect variant`

Thus those RNG calls are **presentation variation**, not evidence for hit chance, critical chance or damage amount generation.

## 2. `itemtbl.atr`: authored equipment modifiers

The fixed table has 2,073 rows and 55 fields. The Korean header embedded in this localized table is mojibake when the Chinese row encoding is decoded as a single charset; the Korean labels below are recovered by a reversible byte re-decode of the header only. This does not alter table values.

Relevant columns include:

| 0-based column | Recovered header | Status |
| ---: | --- | --- |
| 21 | `최소데미지` (minimum damage) | VERIFIED authored field |
| 22 | `최대데미지` (maximum damage) | VERIFIED authored field |
| 23 | `방어력` (defence) | VERIFIED authored field |
| 24 | `공범위` (attack range) | VERIFIED authored field |
| 25 | `마법력` (magic power) | VERIFIED authored field |
| 26 | `최소마법데미지` | VERIFIED authored field |
| 27 | `최대마법데미지` | VERIFIED authored field |
| 28 | `마법방` | VERIFIED authored field |
| 29 | `마법범위` | VERIFIED authored field |
| 31 | `명중률` | VERIFIED authored field |
| 32 | `회피율` | VERIFIED authored field |
| 33 | source label `크컬율` | VERIFIED column/label; likely critical-related, exact semantics not promoted |
| 34 | `마명률` | VERIFIED authored field |
| 35 | `마회율` | VERIFIED authored field |
| 44 | `데미지` | VERIFIED field; exact role unknown |
| 45 | `데미지병종(n명)` | VERIFIED field; exact role unknown |

The existence of minimum/maximum damage, defence, accuracy/evasion and other modifiers proves they are authored inputs. It does **not** prove their combination order, caps, denominators, random range, rounding, class multipliers or server-side exceptions.

## 3. Skill / magic resources

### `Magictbl.atr`

The table has 460 rows and an explicit 18-column header:

`Num, Name, Att, Dist, Area, MP, Time, Team, Unit, EA, EB, EC, TICK, LVPT, MagicPtn, iconindex, Iter, Explanation`.

Representative authored rows show that `EA/EB/EC` change per skill and level, but their arithmetic meaning depends on `Att`/effect type and is not recoverable merely by observing the table. For example, a defence buff, a hit-rate debuff and a poison skill all use the same generic effect columns with different `Att` codes. Treat `EA/EB/EC` as typed effect parameters, not a universal damage triplet.

### `Magicptn.atr`

This table is strongly identified as presentation/timing data. Its header contains staged resource IDs and draw types plus `StartTick_1..3`, `HItFrame`, special motion, burst speed, background shake and sound. It is useful to S5 visual fidelity, but it is not evidence for the numeric damage formula.

### `solskill.atr`

The inspected rows are mercenary-hire skill data, not a damage-formula table. It remains in the structural probe because the retail client loads it near the other Set tables, but S3 does not treat it as damage evidence.

## 4. Wire authority and miss-like behavior

Existing fixed-hash wire recovery establishes:

- `6A/82`: ordinary action uplink; no serialized final damage;
- `6A/05`: effect mode + unit ID + signed absolute HP;
- `6A/0F`: separate no-HP-change/miss-like presentation path.

`0x00405C1A` verifies the decisive client boundary: the incoming signed HP is written directly to unit `+0x34`; `(new_hp - old_hp)` is stored at `+0x148` for presentation/state handling.

The correct claim is **server authority over the final HP result on this retail path**. It does not prove what exact server implementation was used internally.

## 5. Client-local algorithms found vs not found

Found and independently verifiable client-local behavior:

- table parsing/indexing;
- ability/class lookup;
- post-HP visual delta calculation;
- `cry`-based hit reaction selection;
- post-damage visual RNG modulo 9 / 5;
- Magic pattern timing/presentation;
- previously recovered AI action selection RNG and HP/MP thresholds.

Not recovered as an independently proven client-local algorithm:

- physical hit/evasion resolution;
- physical damage calculation;
- critical resolution/multiplier;
- defence/block reduction;
- magic damage calculation;
- elemental/attribute modifier calculation;
- a pre-action UI/AI damage preview formula equivalent to retail server resolution.

This is not a proof that no unrelated helper exists anywhere in the executable. It is the narrower reproducible result that the inspected action, HP-consumer and table-loader chains do not establish such a formula.

## 6. Dynamic evidence needed to reverse the retired-server formula

If exact formulas cannot be recovered statically, collect a controlled dataset rather than guessing. Each trial should preserve:

1. raw ordered packet bytes for action request, miss-like response and every absolute-HP update;
2. actor/target IDs, class/ability rows and exact pre-action HP/MP;
3. complete equipment item IDs and the raw relevant `itemtbl.atr` rows;
4. skill ID/level and raw `Magictbl.atr` row for magic/skills;
5. buffs/debuffs/status/element state and battle position/range;
6. post-action HP and whether a visually distinct critical/block/defence-like reaction occurred;
7. a monotonic timestamp linking packets to video frames when video is available;
8. fixed client/server version identifiers and hashes.

Sampling strategy:

- repeat the same matchup enough times to recover the distribution, not just one damage number;
- vary one authored input at a time (hit, evasion, min/max damage, defence, critical-like field, element, skill level);
- deliberately include hit, miss, suspected critical, low/high defence, physical/magic and elemental cases;
- keep raw observations separate from inferred labels such as “critical” until packet or presentation evidence ties them together.

A useful reverse-engineering corpus should make it possible to test candidate formulas out-of-sample. A formula that merely fits a few hand-picked examples is not sufficient to mark retail behavior recovered.

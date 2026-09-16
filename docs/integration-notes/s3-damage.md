# S3 Damage Recovery — integration note

## Integration decision

S3 does **not** provide a recovered retail damage formula for S6 to install into `web/src`.

What S6 may consume as recovered evidence:

- the server-authority boundary for ordinary attack results;
- exact authored field positions/hashes from `ability.atr`, `itemtbl.atr`, `Magictbl.atr` and `Magicptn.atr`;
- `cry` as a client-side hit-reaction selector, not a damage input;
- Magic pattern fields as presentation/timing data;
- explicit evidence labels from `data/manifests/damage-recovery.json`.

What S6 must **not** relabel as original behavior:

- any current Web training `attack - defence` style rule;
- any guessed hit/evasion percentage conversion;
- any guessed critical chance/multiplier;
- any guessed min/max damage random roll;
- any guessed magic/elemental equation derived only from `EA/EB/EC` or table column names.

If a playable offline formula is required before dynamic evidence exists, implement it as one centralized reconstruction policy with an `UNVERIFIED` label and keep the authored retail values separate from that policy.

## Key S3 findings for other sessions

1. `ability.atr` is parsed by the retail client as 46 fields. Fields 1–40 map sequentially to record offsets `+0x04..+0xA0`.
2. HP-decrease presentation reads ability record `+0x68`, which maps exactly to 0-based column 25, `cry(비명)`.
3. Local `%9` and `%5` RNG branches occur after the authoritative HP decrease is known, so they are visual/reaction variation rather than recovered damage RNG.
4. `Magicptn.atr` is presentation-oriented (`StartTick`, `HItFrame`, special motion, burst speed, shake, sound). S5 can reuse this evidence without claiming damage semantics.
5. `Magictbl.atr` `EA/EB/EC` are generic effect parameters associated with `Att` type. They must not be treated as a universal damage formula.

## Reproduction

Fixed-hash CI should run:

```text
python3 tools/probe_damage_binary.py <unpacked-neodark> --out damage-binary.json
python3 tools/probe_damage_tables.py <extracted-setlib> --out damage-tables.json
```

Expected unpacked NeoDark SHA-256:

`432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7`

The structural table probe deliberately emits `formula_claim: NONE`.

## Future handoff if dynamic capture becomes available

Store observations as an append-only corpus containing raw packet bytes, decoded packet ordering, exact actor/target authored rows, equipment, skill/status state, pre/post HP and synchronized video timestamp. Run one-variable controlled trials and preserve misses/critical-like/block-like observations rather than filtering them out.

Only promote a formula from `UNVERIFIED` when it predicts held-out samples across multiple classes, equipment sets and physical/magic cases and its packet interpretation is independently consistent with the retail client boundary.

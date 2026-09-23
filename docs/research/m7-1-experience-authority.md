# M7.1 S38 — EXP authority review

Baseline: `main@6094aae3c4ff0a04af5dd4376f2b59b8b342d430`  
Scope: S38 only — EXP / Level / Rewards / Skill Points.

## Conclusion

M7.1 now uses the fixed-hash 2.2 `levelabl.atr` `experience_value` rows as the **numeric input** for Lv1–65 progression, without claiming that the retired server's EXP algorithm has been recovered.

- Source SHA-256: `0766b9ab5c357e1e830708ca90589cbe715bf02265e185a4c6ae900eefe287dc`.
- The raw values are **VERIFIED-STATIC-ORIGINAL**.
- The swordsman and wizard sequences are identical for all 100 target rows and therefore also identical for the M7.1 Lv1–65 slice.
- Mapping the first seven stage blocks to global Lv1–65 is **INFERRED** from the approved M7 level axis.
- Consuming each mapped row as the EXP needed to advance from that global level is **RECONSTRUCTION_POLICY**.
- The retired server's true accumulation, award, penalty, party-sharing and other EXP semantics remain **SERVER-BOUNDARY**.

## Required questions

### 1. Cumulative value or one-level requirement?

The static table proves only an authored `experience_value` per row. It does not prove how the server consumed it.

The cumulative-threshold interpretation is a weaker runtime candidate: it makes the first Lv1 row a non-zero starting threshold and produces irregular inferred threshold deltas at several points. Treating each row as a one-level requirement yields a positive, monotonic requirement series and composes cleanly across stage blocks.

M7.1 therefore adopts **per-level requirement** as a reconstruction rule. This is not upgraded to original-server fact.

### 2. Are swordsman and wizard values the same?

Yes. The committed S25 matrix contains 100/100 exact matching values for the two families. This equality is **VERIFIED-STATIC-ORIGINAL**.

### 3. How does Lv1–65 map?

The approved M7 axis is:

- Stage 1: global Lv1–5 → first stage's 5 `levelabl` rows.
- Stage 2: global Lv6–15 → second stage's 10 rows.
- Stage 3: global Lv16–25.
- Stage 4: global Lv26–35.
- Stage 5: global Lv36–45.
- Stage 6: global Lv46–55.
- Stage 7: global Lv56–65.

That creates exactly 65 authored values. The concatenation is **INFERRED**; the individual source rows remain **VERIFIED-STATIC-ORIGINAL**.

### 4. Can it be the formal M7.1 EXP authority?

Yes, with a split evidence contract:

- numeric authored values: original static authority;
- global-level mapping: inferred project mapping;
- "row value = next-level cost": explicit reconstruction policy;
- total accumulated threshold: deterministic sum of those reconstructed per-level costs.

The old M4/M6 curve remains supported only for backward compatibility and for M6 levels above 65.

### 5. What remains server-boundary?

The client does not prove the retired server's EXP award formula, group sharing, death penalties, level-gap modifiers, quest multipliers, rounding, or whether this column was interpreted exactly as this offline runtime does. None of those are claimed as restored.

## Training reward policy

Training rewards stay on the existing S33 15-battle registry. No second registry is created.

| Battle | Recommended Lv | Band | Reward EXP |
| ---: | ---: | --- | ---: |
| 1 | 2 | Normal | 350 |
| 2 | 5 | Normal | 2,205 |
| 3 | 6 | Normal | 2,977 |
| 4 | 10 | Normal | 5,050 |
| 5 | 15 | Hard | 19,815 |
| 6 | 16 | Normal | 19,265 |
| 7 | 25 | Hard | 184,541 |
| 8 | 26 | Hard | 230,675 |
| 9 | 35 | Hard | 574,544 |
| 10 | 36 | Hard | 626,253 |
| 11 | 45 | Hard | 1,360,155 |
| 12 | 46 | Hard | 1,482,569 |
| 13 | 55 | Elite | 3,935,533 |
| 14 | 56 | Elite | 4,289,731 |
| 15 | 65 | Boss | 13,551,764 |

Formula: `round(authored requirement at recommended level × band ratio)`.

Ratios are **RECONSTRUCTION_POLICY**: Normal 35%, Hard 45%, Elite 55%, Boss 80%. This yields about 2–4 same-level victories per authored requirement. Victory awards EXP; retreat/failure award zero in the first implementation.

## Skill Point contract

Each M7.1 level-up emits one `skill_point` reward event with amount 1. Spendable class skill points remain persisted in the existing `SaveV2.m7.skills` state; S38 does not create a competing top-level skill-point store.

S41 must reconcile the class skill state from old level to new level after applying the EXP reward, persist that returned skill state, and surface `Skill Point +1` feedback for each crossed level. Developer override state remains runtime-only and is still rejected by normal SaveV2 persistence.

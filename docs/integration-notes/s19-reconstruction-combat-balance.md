# S19 — Reconstruction Combat Balance

Branch: `codex/m5-reconstruction-combat-balance`

Base: `047c52af340076a00a6e0d347806708ad92844d1`

Status: independent M5 module ready for coordinator wiring. This branch deliberately does **not** edit `web/src/battle.ts`, `web/src/scene.ts`, `web/src/main.ts`, `Plan.md`, `Backlog.md`, or `docs/evidence-ledger.md`.

## Goal

The old server-authoritative hit / damage / critical / defence / magic / elemental formula is not recoverable from the fixed 2.2 client evidence currently available. S19 therefore stops treating the old training constants as a temporary collection of unrelated numbers and introduces a formal, replaceable offline balance authority:

`ReconstructionCombatBalance`

Every derived combat formula and tuning value in this module is explicitly:

`RECONSTRUCTION_POLICY`

It must never be described as the original retail server formula.

## Delivered modules

- `web/src/combat/reconstruction-combat-balance.ts`
  - centralized tuning table;
  - player HP / MP / ATK / DEF / MATK / MDEF / accuracy / evasion / critical model;
  - enemy level / rank / role scaling;
  - bounded hit / critical / mitigation / damage rules;
  - showcase skill multipliers while preserving authored MP costs;
  - reward growth;
  - replaceable `ReconstructionCombatBalance` class.
- `web/src/combat/combat-balance-simulator.ts`
  - deterministic seeded combat simulator;
  - 1v1 / 2v1 and equipment comparisons;
  - win/death rate, active-exchange duration, HP/MP and action-count metrics.
- `web/tests/reconstruction-combat-balance.test.ts`
  - authored/reconstruction separation;
  - level and enemy scaling;
  - hit / crit / one-shot guardrails;
  - showcase skill MP and multiplier checks;
  - equipment monotonicity;
  - reward growth;
  - swordsman/wizard 1v1 and 2v1 automatic balance gates.
- `web/tools/combat-balance-preview.ts`
  - repeatable CLI preview harness.

## Evidence boundary

### VERIFIED inputs retained as inputs

S19 consumes, but does not reinterpret as retail formulas:

- class 100 authored HP 125 / MP 100 / hit 160 / magic-hit 160;
- class 109 authored HP 100 / MP 130 / hit 160 / magic-hit 160;
- showcase skill MP costs from the fixed authored skill rows;
- the S3 authority conclusion that the old server supplied authoritative absolute HP and that the exact retail arithmetic is not present in the recovered client path.

The returned player profile keeps these values in `authoredAnchors` with their original provenance.

### RECONSTRUCTION_POLICY outputs

The following are intentionally new offline rules:

- ATK / DEF / MATK / MDEF base values;
- converting authored hit/magic-hit fields into a normalized offline accuracy score;
- evasion and critical values;
- level scaling;
- enemy rank/role scaling;
- hit chance calculation;
- defence mitigation;
- critical multiplication;
- the 45% max-HP per-strike cap;
- skill damage multipliers and poison tick arithmetic;
- action cadence used by the balance simulator;
- reward growth.

These rules optimize for stable playable combat and are replaceable through the `ReconstructionCombatBalance` constructor.

## Current default policy

Policy id:

`m5-reconstruction-combat-balance-v1`

Guardrails:

- combat level: 1..99;
- hit chance clamp: 65%..97%;
- critical chance clamp: 0%..35%;
- one individual strike cannot remove more than 45% of target max HP;
- minimum landed strike damage: 1;
- all derived numeric stats are bounded.

Player class intent:

- swordsman: higher physical attack/defence and survivability;
- wizard: lower physical durability, higher magic attack and larger authored MP pool.

Enemy policy:

- normal / elite / boss rank multipliers;
- melee / ranged / caster role multipliers;
- level scaling for HP/offence/defence/accuracy;
- all enemy numbers remain reconstruction data until a future recovered roster/stat source proves stronger facts.

## Showcase skills

Authored MP costs remain the authored values. Damage/effect arithmetic is reconstruction:

- 1101 Heavy Strike: physical single hit, higher multiplier and small critical bonus;
- 1201 Multi-hit: two physical strikes;
- 1301 Guard: support profile only; defence multiplier policy exported for coordinator use;
- 19101 Accuracy debuff: low magic damage plus exported accuracy-debuff policy;
- 19201 Poison: magic hit plus bounded periodic damage;
- 19301 Mana-on-hit: support profile only; mana-return policy exported for coordinator use.

The current standalone simulator intentionally exercises the offensive subset rather than pretending it already models the complete battle runtime status machine.

## Reward model

`rewardForEnemy()` and `rewardForEncounter()` centralize gold/EXP defaults.

The reward model is independent from the existing S12 EXP threshold policy. The coordinator should continue applying reward output through the existing idempotent `applyBattleReward()` pipeline.

## Automatic balance gates

The S19 tests cover at least:

1. ordinary enemy 1v1;
2. ordinary enemy 2v1;
3. swordsman;
4. wizard;
5. equipment before/after;
6. skill MP affordability;
7. active combat duration;
8. player death rate;
9. reward growth;
10. one-shot prevention.

The 2v1 test is intentionally allowed to be riskier for the wizard than the swordsman. A new tuning change must still remain inside the committed playability ranges rather than merely making the unit tests compile.

## Preview harness

From `web/`:

```bash
node --experimental-strip-types tools/combat-balance-preview.ts
node --experimental-strip-types tools/combat-balance-preview.ts --json
```

The report prints swordsman/wizard 1v1, 2v1 and representative equipped variants plus reward growth samples.

## Coordinator integration API

Recommended wiring order after S15–S19 return:

1. On battle creation:
   - `balance.playerStats(characterId, progression.level, equipmentBonuses)`
   - `balance.enemyStats({level, rank, role})`
2. For normal attacks:
   - `balance.resolveAttack(attacker, defender, {kind, multiplier:1, hits:1}, rng)`
3. For showcase skills:
   - `balance.skill(skillId)`
   - `balance.resolveSkillAttack(...)`
4. On victory:
   - `balance.rewardForEncounter(...)`
   - feed the result to S12 `applyBattleReward()`.
5. Keep authored rows and S19 derived stats as separate fields in diagnostics/provenance.

Do not copy the new constants into `battle.ts`. The integration should hold one balance instance and call it.

## Explicit non-goals

S19 does not claim or restore:

- exact retail damage formula;
- exact retail hit/evasion formula;
- exact retail critical formula;
- exact elemental interactions;
- historical per-monster server stats;
- historical rewards or EXP curve;
- final monster roster/visual binding.

Those remain either future evidence work or explicit reconstruction policy.

## Validation

Required before merge:

- `npm test`;
- `npm run typecheck`;
- `npm run build`;
- existing browser/offline regressions through repository CI;
- S19 balance acceptance tests.

The coordinator should rerun full private-original browser validation after S15–S19 are wired into the shared runtime.

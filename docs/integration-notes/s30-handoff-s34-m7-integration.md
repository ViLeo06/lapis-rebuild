# S30 -> S34 handoff: M7 monster integration

Branch: `codex/s30-m7-monster-difficulty-matrix`  
Role: integration guidance only. S30 does not modify shared core.

## What S30 supplies

- 18 fixed-level combat archetypes for Lv1-65.
- Seven-band difficulty matrix.
- 15 exact S33 recommended-level candidate rows.
- explicit reviewed S17 visual bindings.
- healer target compatible with Wizard `healingBlocked` / Ash acceptance.
- static elite and boss archetypes.
- `M7MonsterBalancePolicy` provenance and server-boundary declaration.

## Shared-core conflict map

### web/src/battle.ts

Current M6/M5 code constructs `dummy-melee` and `dummy-ranged` through `ReconstructionCombatBalance.enemyStats({level: enemyLevel, ...})`.

For M7, S34 should add/consume a small adapter that:

1. receives a S30 `monsterId` from S33 encounter data;
2. resolves `M7_MONSTER_ARCHETYPE_CATALOG.require(monsterId)`;
3. copies the row's fixed combat fields into the battle enemy state / `CombatantStats` shape;
4. maps S31/S32 unified status hooks to S30 ability definitions;
5. never derives monster level from the player level.

Do not copy S30 numeric constants into `battle.ts`.

### web/src/scene.ts

Current diagnostics/visual selection contain explicit dummy ID -> resource ID logic. S34 should resolve visuals from the S30 row (`visualId` / `visualFamily`) or an adapter rather than adding 18 hard-coded conditionals.

### web/src/main.ts

No S30-specific change is required. S33 owns Training Camp selection/UI. S34 only wires it if the final player-facing route needs a shared entry point.

## Ability integration expectations

S30 ability values are `RECONSTRUCTION_POLICY`. They should route through the common M7 status/action framework rather than per-monster if/else blocks.

Represented families: physical/basic and rapid strike, ranged physical, magic, poison/DOT, stun/slow, guard, self-heal, offensive surge, and elite/boss composite behavior.

`m7-green-armored-renewer-l26` must route all HP healing through the same healing authority that checks `healingBlocked`; otherwise Wizard Ash cannot be accepted correctly.

## Balance integration

S19's exact retail formula remains unresolved. S30 provides fixed input stats, not a replacement damage equation.

S34 may calibrate final M7 battle feel using existing reconstruction damage authority, but changes to S30 monster numbers must remain under `M7MonsterBalancePolicy / RECONSTRUCTION_POLICY` and be documented in final validation.

Target:
- Normal: normal skill use, recovery uncommon.
- Hard: skill/readiness management, roughly 1-3 recoveries may be reasonable.
- Elite/Boss: buff/debuff/readiness/recovery/target strategy required.

## Evidence boundary

Keep unresolved:
- exact retail enemy stats/growth: `SERVER-BOUNDARY`
- exact per-monster server AI: `SERVER-BOUNDARY`
- exact retail damage formula: `SERVER-BOUNDARY`
- field -> encounter roster mapping: `SERVER-BOUNDARY`
- concrete M7 training visual identity binding: `RECONSTRUCTION_POLICY`

Do not upgrade those statuses because integration tests pass.

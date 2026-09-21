# S34 — M7 Shared-runtime Interface Audit

Date: 2026-09-21  
Owner: S34 — M7 Integration / Balance / Acceptance  
Branch: `codex/s34-m7-integration-acceptance`  
Baseline: `main@1d592d0e2194567c5d7d863e6a48250407dabeb3`

## Purpose

This audit records the exact M6/M5.1 runtime seams S34 must use when S30-S33 handoffs become available. It is a pre-integration contract, not a claim that M7 gameplay is already implemented.

## 1. Stage / progression authority

Current M6 profession modules use reconstructed promotion thresholds:

- swordsman: `10 / 20 / 30 / ...`
- wizard: `10 / 20 / 30 / ...`

M7 first-seven-stage thresholds are instead:

`6 / 16 / 26 / 36 / 46 / 56`

The authored stage IDs themselves remain usable and must not be renumbered:

- swordsman: `100 / 110 / 120 / 130 / 140 / 150 / 160`
- wizard: `109 / 119 / 129 / 139 / 149 / 159 / 169`

S34 integration rule:

1. preserve M6 stages 8-10 and existing authored class/visual rows;
2. consume S31/S32 stage policy if provided;
3. otherwise replace only the first-seven transition policy through a centralized M7 resolver;
4. do not encode 6/16/... as `VERIFIED-STATIC-ORIGINAL`; it is the approved M7 reconstruction policy.

## 2. Skill authority and dispatch

Current production path:

`M4RuntimeIntegration.useSkill -> skillById -> m6SkillAvailableForCharacter -> scene.attack -> battle.useAttack`

Current limitations that M7 must remove:

- runtime skill availability is still the M6 three-representative-skill compatibility layer;
- keyboard skill selection is limited to keys 1/2/3;
- `battle.useAttack` rejects skills outside the six old IDs;
- support behavior is hard-coded by skill ID;
- one generic magic-readiness cost is used for skill actions;
- there is no persisted Skill Lv1-Lv6 authority.

S34 expected adapter boundary from S31/S32:

- resolve legal skills for `profession + player level/stage`;
- resolve Skill Lv1-Lv6 parameters without battle-core condition ladders;
- execute/describe status effects through a common status runtime;
- expose save-safe skill-level state;
- expose Developer override separately from normal progression.

Shared core should only ask the adapter for legality, target contract, readiness/MP cost and effect resolution.

## 3. Status-effect framework

M7 requires at least:

- stun;
- physical damage reduction;
- max-HP modifier;
- attack modifier;
- incoming physical penalty;
- periodic self-damage;
- command/range modifier;
- hit/accuracy reduction;
- poison/DOT;
- MP drain-on-staff-hit;
- healing block;
- petrify + ordinary-attack immunity/untargetability;
- one-shot curse damage window;
- monster regeneration.

Current `BattleState` has only legacy scalar fields `shield`, `manaBuff`, plus enemy `blind` and poison fields.

Integration requirement:

- prefer the S31/S32 common status module;
- do not add one `if (skillId===...)` branch per new skill in `battle.ts`;
- status ticking must occur independently of player actions so poison, sacrifice and regeneration continue while the actor is waiting;
- petrify targetability and heal block must be checked by common action/heal resolution paths.

## 4. Monster and encounter authority

Current `beginBattle` creates only:

- `dummy-melee`
- `dummy-ranged`

and the reconstruction setup currently falls back to:

`enemyLevel = setup.enemyLevel ?? setup.level`

The accepted M5 runtime also prepares battle with `enemyLevel = player level`.

This is incompatible with M7. S30/S33 must provide fixed monster/preset definitions.

S34 hard gate:

- a training preset selects explicit monster IDs and explicit fixed monster levels;
- changing player level must not mutate enemy level, max HP, attack, defence, AI or abilities;
- Easy/Normal/Hard/Very Hard may be recalculated only as UI text.

Expected S30 contract:

- stable monster/archetype ID;
- fixed level/stats;
- visual-family binding and evidence status;
- AI archetype;
- abilities/status hooks;
- recovery capability;
- difficulty tier.

Expected S33 contract:

- 15 stable preset IDs;
- recommended level;
- battle scene/zone binding;
- fixed monster roster;
- training purpose;
- UI description.

## 5. Recovery actions

Current readiness primitives are already suitable:

- `actionReady(state)`
- `consumeAction(state, cost)`

M7 HP/MP recovery should use these same production primitives.

Required semantics:

- H = HP +200;
- M = MP +200;
- touch buttons expose the same actions;
- full resource => no mutation, no readiness loss, player-facing notice;
- otherwise require readiness and consume centralized recovery cost;
- no item consumption;
- no battle exit;
- no Buff/Debuff reset.

Policy stays `M7InfiniteTrainingRecoveryPolicy / RECONSTRUCTION_POLICY`.

## 6. Battle exit regression

M5.1 production path already provides:

`request -> pause -> cancel/resume OR confirm -> retreat -> field`

M7 must preserve:

- confirmation before retreat;
- no victory/reward on retreat;
- no task-win credit;
- encounter retrigger suppression until leaving the trigger radius;
- mobile touch path.

S33/S34 UI changes must use this existing authority instead of creating a second exit implementation.

## 7. SaveV2 / M6 extension

Current save path:

`makeSave -> SaveV2 + createM6SaveExtension`

Current restore path:

`migrateSaveToM6 -> restore progression/inventory/quest/stage/equipment`

M7 additions that require explicit persistence:

- legal learned skill IDs;
- Skill Lv1-Lv6;
- any durable skill-point balance;
- profession/level/stage consistency;
- HP/MP only if the final M7 save contract chooses to persist current vitals.

Developer preset / Unlock All Skills state must remain transient and must not silently enter a normal save. If debug profiles are introduced, they must be explicitly distinguishable.

M5.1 and M6 SaveV2 fixtures remain mandatory migration regressions.

## 8. Developer preset

Current developer mode is an opt-in boolean and diagnostics panel; there is no M7 character preset authority.

Expected S33 contract:

- profession;
- level;
- stage resolved by the M7 1-5 / 6-15 / ... ranges;
- legal equipment;
- legal normal skills and levels;
- HP/MP;
- skill points;
- explicit `Unlock all implemented skills` override.

S34 must prove that turning debug off restores normal legality rules and that normal saves do not inherit debug-only unlocks.

## 9. UI / mobile integration

Current battle HUD exposes attack, rest, return and skill buttons. M7 adds:

- HP Recovery;
- MP Recovery;
- up to seven implemented profession skills;
- 15 training battle selection;
- Developer presets.

Phone acceptance cannot depend on H/M or number keys. Every M7 core action needs a touch control of usable size.

Keyboard additions are accelerators only.

## 10. Battle scene integration

Existing story-battle manifests provide original scene resource evidence. The M7 training binding from a preset to a scene remains `RECONSTRUCTION_POLICY`.

S34 must verify:

- all 15 presets start;
- more than one original-derived battle scene is actually exercised;
- scene selection does not alter fixed monster stats;
- missing scene assets fail visibly rather than silently falling back to a false “verified” scene.

## 11. Shared-core patch map

Only after upstream modules stabilize, S34 may patch:

### `web/src/battle.ts`

Minimum likely hooks:

- accept explicit fixed monster roster instead of dummy creation;
- delegate skill/status effect resolution;
- tick common statuses/regeneration;
- expose heal-block and targetability checks;
- execute recovery actions through readiness authority.

### `web/src/scene.ts`

Minimum likely hooks:

- render/select explicit monster roster/visuals;
- pass selected preset into battle creation;
- surface generalized skill/status/recovery events without duplicating rule logic.

### `web/src/main.ts`

Only if the legacy shell still needs top-level wiring. Prefer `m4-runtime-integration.ts` / modular UI adapters.

### `web/src/m4-runtime-integration.ts`

Expected primary integration surface:

- M7 stage/skill authority;
- training preset selection;
- H/M keyboard routing;
- recovery action notices;
- Developer preset;
- SaveV2 M7 extension;
- fixed roster preparation.

## 12. Acceptance-test design

### Unit

- M7 stage resolver;
- skill unlock boundaries;
- six skill levels;
- DOT independent ticking;
- stun;
- petrify/action denial/ordinary-attack immunity;
- heal block vs active/passive/regeneration healing;
- periodic sacrifice self-damage with 1 HP floor;
- fixed monster level invariant;
- HP/MP recovery readiness semantics.

### Integration

- swordsman Lv1,6,16,26,36,46,56;
- wizard Lv1,6,16,26,36,46,56;
- SaveV2 round-trip with skill levels;
- each of 15 training presets resolves;
- debug override does not contaminate normal state.

### Browser / E2E

Mandatory representative paths:

1. swordsman Lv36 -> Sacrifice -> repeated periodic HP loss -> sustained attack modifier;
2. wizard Lv6 -> Poison -> DOT continues while waiting;
3. wizard Lv26 -> Ashes -> healer regeneration fails;
4. wizard Lv36 -> Petrify -> target cannot act and ordinary attack cannot target it;
5. battle preset #1;
6. battle preset #15;
7. HP recovery;
8. MP recovery;
9. mobile skill/recovery/preset selection;
10. retreat cancel + confirm;
11. save/load.

Inherited M5.1 NPC, touch, camera and shell regressions remain active.

## 13. Evidence/CI boundary observed during preflight

The public pinned installer URL used by the S17 fixed-client workflow currently returns HTTP 404. The S17 workflow therefore uses a strict retained-evidence lineage guard.

On the first S34 preflight head, that guard correctly refused to inherit the earlier S17 fixed-hash result because the branch introduced new M7 files outside its narrow allowlist. S34 does **not** treat that protective failure as permission to weaken provenance checks.

Before final M7 closure, S30/S34 must provide a valid fixed-hash/private-original evidence route or an explicitly reviewed lineage rule that is narrow enough to prove the S17 source/catalog implementation itself did not change.

## Current conclusion

The M7 integration seams are identified. No shared-core patch is justified until S30-S33 provide non-empty implementation heads and handoffs.

# S29 — M6 Acceptance Specification

Date: 2026-09-20  
Owner: S29 — M6 Integration / Acceptance  
Baseline: main@4aea5b81fa4cca00c9a80b3ff2389eb391c09b17  
Plan: v3.4

## Purpose

This specification defines the proof required to close M6 after S25-S28 produce stable handoffs.

It is deliberately independent of the eventual implementation details. Upstream modules may change names or internal layout, but the player-facing and persistence outcomes below remain mandatory.

The machine-readable companion is `manifests/m6-integration-acceptance-contract.json`.

## Core proof rule

Ten-stage completion must be demonstrated through production progression/promotion authorities.

Allowed test acceleration:

- deterministic reconstruction reward fixtures routed through normal reward/progression APIs;
- policy-controlled EXP/promotion thresholds routed through normal APIs;
- synthetic world/quest carriers that call the same production authorities used by the player runtime.

Not accepted as proof:

- assigning `stageId` directly in page/test memory;
- a test-only “set stage” API that bypasses progression/promotion;
- editing exported save JSON to jump stages;
- calling internal state mutation helpers that the player runtime never uses.

This rule allows an automated test to reach stage ten quickly without pretending that direct state injection proves gameplay progression.

## Canonical stage order

Swordsman:

`100 -> 110 -> 120 -> 130 -> 140 -> 150 -> 160 -> 170 -> 180 -> 190`

Wizard:

`109 -> 119 -> 129 -> 139 -> 149 -> 159 -> 169 -> 179 -> 189 -> 199`

S25 remains the final data/provenance authority for authored stage data. S26/S27 remain the profession-domain authorities. S28 remains the shared progression/world/quest/equipment authority. S29 owns runtime glue and final acceptance.

## Gate A — upstream contract integrity

### M6-A01 S25 canonical matrix

Pass when:

- exactly 20 target stages are present in one authoritative matrix;
- every material field carries provenance or an explicit gap;
- visual/action-resource bindings are stage-specific;
- authored stats are not mixed with reconstruction formulas;
- skill/magic rows and MP costs identify their source rows;
- equipment/item requirement evidence is either recorded or explicitly unresolved;
- promotion/quest/server-side rules that the client cannot prove remain SERVER-BOUNDARY/UNVERIFIED.

### M6-A02 S26 swordsman handoff

Pass when the S26 domain can create 100, progress legally, promote through every transition, reject early/illegal transitions, expose stage stats/visuals/skills/equipment, and restore its state from the agreed M6 save contract.

### M6-A03 S27 wizard handoff

Same as S26, plus:

- authored/max MP behavior;
- magic eligibility;
- MP consumption;
- readiness/action consumption;
- representative magic effect references without upgrading unresolved MagicRes placement semantics.

### M6-A04 S28 shared authority

Pass when one shared contract supports both families for:

- EXP/progression;
- promotion;
- quest-chain state;
- rewards/receipts;
- inventory/equipment;
- Save migration;
- representative synthetic growth chain.

S29 must not duplicate these rules in scene/battle/UI glue.

## Gate B — swordsman end-to-end progression

### M6-B01 initial character

Through a normal player/runtime entry:

- create/load swordsman at stage 100;
- stage 100 visual family is active;
- authored/policy-derived stats are exposed with correct provenance;
- legal equipment and representative skill state are visible.

### M6-B02 each promotion transition

For every transition 100->110 ... 180->190:

1. obtain the required progression through production progression/reward APIs;
2. prove promotion is unavailable before the requirement;
3. satisfy the configured requirement;
4. execute the production promotion API;
5. prove the next stage id, visual binding, authored stats and legal skill/equipment view update;
6. prove no duplicate promotion/reward receipt is created by repeated input.

### M6-B03 stage-ten state

At 190:

- no further legal promotion exists;
- stage 190 visual/stats are active;
- legal skills/equipment remain usable;
- Save -> reload restores stage 190 and all persisted progression state.

## Gate C — wizard end-to-end progression

### M6-C01 initial character

Through a normal player/runtime entry:

- create/load wizard at stage 109;
- authored HP/MP and stage visual are active;
- legal magic/equipment is visible.

### M6-C02 each promotion transition

For every transition 109->119 ... 189->199, repeat the same authority-based proof as swordsman.

At representative stages, additionally prove:

- legal magic can be selected;
- illegal stage magic is rejected;
- MP cost is consumed exactly from the authored/runtime contract;
- readiness/action cost is consumed through the battle authority;
- low-MP rejection does not partially consume readiness or mutate battle state.

### M6-C03 stage-ten state

At 199:

- no further legal promotion exists;
- Save -> reload restores 199, MP-related persistent state where applicable, progression, inventory/equipment and quest state.

## Gate D — equipment and inventory

### M6-D01 ownership

Prove grant/receipt/duplicate handling through the production inventory authority.

### M6-D02 equip legality

For both class families and representative early/mid/late stages:

- legal item can equip;
- wrong-family item is rejected;
- stage/level restriction is enforced when the S25/S28 contract contains one;
- promotion reconciles now-illegal equipment without deleting ownership.

### M6-D03 slots

Current M5.1 baseline models only weapon/armor.

If S28 adds accessory, M6 acceptance must exercise save/load and legality for it.

If S28 intentionally does not add accessory because no stable playable contract can be justified, the final M6 report must record accessory as an explicit gap rather than silently claiming completeness.

## Gate E — world, quest, reward and promotion chain

Construct at least one representative normal-game chain consumable by both families:

`create/load -> NPC/quest -> objective -> battle/item objective -> reward -> EXP/level -> equipment change -> promotion condition -> promotion -> save -> reload`

Requirements:

- player-facing quest choices remain explicit where M5.1 made them explicit;
- battle victory and retreat/defeat remain distinct;
- reward and progression receipts are idempotent;
- promotion is not awarded twice by reload/re-entry;
- server-boundary predicates remain reconstruction policy unless independently proven.

The representative chain need not recreate every original retail map or quest.

## Gate F — save and migration

### M6-F01 accepted M5.1 SaveV2 migration

A fixture matching the accepted M5.1 schema must load in M6 and preserve:

- character;
- world/map/position;
- inventory/equipment;
- quest state/flags;
- progression;
- reward receipts.

Any new M6 fields receive documented safe defaults.

### M6-F02 M6 round-trip

For both class families, save and reload representative early/mid/final-stage states.

At minimum preserve:

- active class/stage;
- progression;
- inventory/equipment;
- quest state;
- receipts;
- any new promotion state.

### M6-F03 dual-class persistence boundary

The current M5.1 runtime exposes player-facing class switching but stores only one progression record.

The final M6 architecture must choose one explicit model:

1. **single active character per save** — class switching is no longer a persistent player feature; each save owns one profession track; or
2. **multiple profession tracks in one save** — each profession's stage/progression state persists independently.

If player-facing in-save class switching remains, option 2 is required. One shared progression/stage slot that overwrites or leaks progress between professions fails this gate.

### M6-F04 corrupt/future data

- malformed save fails safely;
- unsupported future schema fails closed unless an explicit migration exists;
- unknown item/stage/quest data does not silently grant rewards or promotions.

The schema version may remain 2 or be bumped only after S28/S29 reconcile the complete M6 persistence shape. Version number alone is not the acceptance criterion.

## Gate G — inherited M5.1 input/playability regressions

The final integrated runtime must retain:

### Desktop

- pointer NPC targeting;
- keyboard E interaction;
- click-to-move arbitration;
- explicit dialogue choices;
- zoom/fullscreen;
- delayed camera chase to true center;
- map-edge clamp;
- battle target/move/attack/skills;
- confirmed retreat with cancel/resume;
- quest turn-in.

### Mobile

At a phone-class touch viewport:

- NPC tap;
- touch fallback interaction;
- dialogue actions;
- touch world movement;
- field/interior transition;
- encounter entry;
- battle target selection;
- skill/magic touch activation;
- battle retreat;
- no keyboard dependency;
- no horizontal overflow.

### Player shell

- Developer diagnostics hidden by default;
- diagnostics remain opt-in;
- original-structure HUD remains non-blocking;
- no test/debug selector is required to complete the player path.

## Gate H — engineering validation

Final S29 head must pass:

- parser/probe tests relevant to integrated M6 data;
- TypeScript typecheck;
- unit tests;
- production build;
- Chromium browser acceptance;
- standalone offline single HTML;
- no unexpected page errors;
- no external HTTP(S) dependency in the standalone gate.

Existing S24 tests remain regressions; S29 adds M6-specific acceptance rather than weakening them.

## Gate I — fixed-hash private-original

Using the pinned 2.2 client pipeline:

- verify the expected installer/client hashes;
- generate the private M6 asset pack;
- exercise representative stages for both families with original-derived visual/data resources;
- preserve evidence labels from S25;
- keep original copyrighted bulk assets out of Git.

A synthetic pass cannot substitute for this gate.

## Gate J — new M6 wall-clock soak

After the final major S25-S28 integration:

- run a new real wall-clock soak;
- target duration: 30 minutes, matching prior major release gates unless Plan is explicitly changed;
- sample live field/runtime state throughout;
- exercise both profession families, legal equipment, save/load and diagnostics toggle;
- record page errors and external HTTP(S) requests;
- retain report and final screenshot in the private validation artifact.

M4/M5/M5.1 soak results do not substitute for this M6 soak.

## Gate K — final private player artifact

Generate one final private standalone HTML from the exact integrated S29 head.

Record:

- executable commit;
- workflow run;
- artifact id;
- file bytes;
- SHA-256;
- fixed-hash source pipeline;
- desktop/mobile screenshots;
- final acceptance JSON/reports.

Store original-derived private material in the Google Drive private asset tree, not Git.

## Gate L — human acceptance

Automatic green CI does not close M6.

The final private standalone HTML must be supplied for the user's personal playtest. Until the user explicitly accepts that exact final build:

- do not declare M6 complete;
- do not merge the S29 integration PR to main.

## Evidence reporting

The final M6 validation report must keep at least these categories distinct:

- VERIFIED
- VERIFIED-STATIC-ORIGINAL
- VERIFIED-HISTORICAL
- RECOVERED_SECONDARY
- INFERRED
- SERVER-BOUNDARY
- RECONSTRUCTION_POLICY
- UNVERIFIED

A working offline progression system is engineering evidence. It is not evidence that retired server formulas, promotion predicates, quest rewards or eligibility rules were recovered.

# S29 — M6 Integration / Acceptance

Date: 2026-09-20  
Branch: codex/s29-m6-integration-acceptance  
M6 baseline: main@4aea5b81fa4cca00c9a80b3ff2389eb391c09b17  
Plan: v3.4

## Role

S29 is the M6 coordination and final acceptance line. During the parallel phase it owns preflight, contract review, acceptance design, shared-file conflict audit, and the eventual shared-runtime integration. It does not replace S25-S28 or invent their missing domain data.

The canonical machine-readable coordination contract is:

- manifests/m6-integration-acceptance-contract.json
- web/tests/s29-m6-integration-contract.test.ts

## Preflight state

At S29 start, all five M6 branches existed and S29 was identical to the unified baseline. S25-S28 were also still identical to the baseline, so there were no stable handoff commits or integration notes to consume yet.

This is the expected parallel-start condition. S29 therefore does not modify main.ts, scene.ts, battle.ts, or m4-runtime-integration.ts during this preflight commit.

## Accepted M5.1 baseline that M6 must preserve

The inherited player gate is S24:

- final runtime head: 97bd5063749a15e114ce85119015f9dcb8b7afc0
- final run: 35442734082
- E2E: 58 passed / 4 skipped / 0 failed
- long-soak run: 35433856641
- private standalone HTML SHA-256: 0ddc54035f88c6b9c0e13a31fa621ac4a74a4455fb40e9959076fded34a201b7
- user playtest: accepted on 2026-09-20

M6 may extend this runtime, but must keep the M5.1 input and player-experience regressions explicitly gated.

## Current integration pressure points

These are not M6 bugs yet. They are concrete baseline constraints that S25-S28 handoffs and S29 glue must resolve.

### 1. Playable class catalog is still base-stage only

web/src/content/classes/class-catalog.ts currently exposes only the S11 base definitions:

- swordsman 100
- wizard 109

m4-runtime-integration.ts also hard-gates several paths to 100/109, including class switching, render/profile handling, and save validation context.

M6 integration must replace this base-stage assumption with stage-aware domain interfaces from S26/S27. S29 must not duplicate their stage tables in runtime glue.

### 2. Progression is a single shared state

The current M4/M5 reward container has one progression object. Switching between 100 and 109 does not create independent class/stage progression state.

That is insufficient to prove a dual-class ten-stage system. S26/S27/S28 must define a stable stage/progression persistence contract; S29 will integrate that contract after the upstream PRs stabilize.

### 3. SaveV2 has no explicit M6 stage model

Current SaveV2 persists one character and one progression record plus inventory, quest flags and reward receipts. It has no explicit ten-stage domain and its runtime validation context only allows characters 100 and 109.

M6 requirements:

- existing M5.1 SaveV2 must still load;
- stage/progression state must survive save/reload;
- inventory/equipment/quest/receipts must remain consistent;
- future or unknown schema must fail closed or use an explicit migration;
- S29 will not decide whether the schema version remains 2 or is bumped until S28 supplies the migration design.

### 4. Equipment model has only weapon and armor slots

Both content-types.ts and progression/inventory.ts currently model only:

- weapon
- armor

M6 research includes accessory eligibility. S28 must either add an explicit accessory slot or document why the M6 playable contract intentionally excludes it. S29 will not silently encode accessory behavior in UI/runtime glue.

### 5. Skills and combat are base-definition driven

Skill availability currently resolves through playableClassById() and two base class definitions. The battle reconstruction profile also receives the current character id directly.

S26/S27 must hand off stage-aware legal skills/magic, authored MP/stat data, and any stage-aware readiness adapter. S29 will connect those results to battle.ts only after the domain contract is stable.

### 6. World/progression content is still a single training slice

The current ReconstructionWorldAuthority and M5 playable world prove one training quest path. They are not a multi-stage promotion or quest-chain authority.

S28 owns that expansion. S29 owns only the final glue and acceptance.

## Shared-file conflict audit

The following paths remain S29-owned during parallel work:

- web/src/main.ts
- web/src/scene.ts
- web/src/battle.ts
- web/src/m4-runtime-integration.ts
- Plan.md
- Backlog.md
- docs/evidence-ledger.md

Upstream sessions should hand off domain APIs and integration notes instead of editing these paths.

S29 will re-run this audit immediately before integrating each upstream PR. If an upstream branch changes an S29-owned path, the integration will stop at review and extract the domain change rather than blindly merging the shared-runtime edit.

## Upstream handoff contract

### S25

Required before final integration:

- one authoritative 20-stage matrix;
- provenance per field;
- stable stage identity and visual bindings;
- explicit server-boundary/reconstruction gaps;
- S26/S27/S28 handoff paths.

S29 consumes S25 as evidence/data authority, not gameplay policy.

### S26

Required:

- swordsman 100..190 stage domain;
- stage-aware authored stats;
- stage-aware legal equipment;
- stage-aware representative skills and MP cost;
- progression/promotion interface;
- Save persistence contract;
- S29 glue list.

### S27

Required:

- wizard 109..199 stage domain;
- stage-aware HP/MP and magic-oriented stats;
- magic availability and MP/readiness consumption;
- legal equipment;
- progression/promotion interface;
- Save persistence contract;
- S29 glue list.

### S28

Required:

- shared progression and promotion authority;
- inventory/equipment authority;
- quest-chain authority;
- receipt/idempotency rules;
- SaveV2-compatible migration;
- representative synthetic growth chain for both class families.

## Acceptance proof rules

The final ten-stage proof may use deterministic fixtures or accelerated reconstruction thresholds, but they must enter through production progression/reward/promotion APIs.

The following do not count as proof:

- direct memory mutation of stage;
- test-only setter that skips progression authority;
- raw save editing to jump stages.

This allows fast automated acceptance without requiring literal manual grinding through ten stages while still proving the real domain path.

## M5.1 regressions that remain hard gates

- NPC pointer interaction
- keyboard E interaction
- mobile touch interaction
- delayed camera centering with edge clamp
- fullscreen and zoom
- field -> interior transition
- recovered monster visibility
- battle
- confirmed retreat
- quest turn-in
- Developer diagnostics hidden by default
- standalone offline behavior

## Final M6 gate

S29 may announce engineering integration only after:

1. S25-S28 stable handoffs are reviewed.
2. Shared runtime consumes their interfaces without duplicating policy.
3. Swordsman 100 -> 190 and wizard 109 -> 199 are proven through normal progression authority.
4. Skills/magic, MP/readiness, equipment, promotion, quest/reward and Save migration pass.
5. M5.1 regression gates pass on desktop and mobile.
6. Fixed-hash 2.2 private-original validation passes.
7. Standalone single HTML passes offline.
8. A new M6 wall-clock soak passes after the final major integration.
9. A final private standalone HTML is generated for user playtest.
10. The user explicitly accepts that build.

Until step 10, M6 remains open.

## Drive / private-original boundary

Private asset root checked during preflight:

lapis-rebuild-assets/

Existing relevant preview roots include:

- lapis-rebuild-assets/40_previews/S20-original-ui-reference-pack-20260919/
- lapis-rebuild-assets/40_previews/S21-original-hud-shell-20260919/
- lapis-rebuild-assets/40_previews/S22-npc-pointer-interaction-20260919/
- lapis-rebuild-assets/40_previews/S24-m5-1-acceptance-20260919/

No new original-derived S29 artifact is generated during preflight. Final M6 private reports/standalone output will be written under the same private asset root and referenced here after validation.

## Evidence boundary

This preflight creates engineering coordination metadata only.

It does not upgrade any reconstruction rule to original retail truth. In particular:

- promotion level/condition remains unproven until evidence or explicit policy says otherwise;
- EXP curve remains reconstruction unless stronger evidence arrives;
- exact retail combat formula remains server-boundary/reconstruction;
- quest rewards/eligibility remain reconstruction unless proven;
- accessory/stage eligibility must come from S25/S28 evidence or policy and must remain provenance-tagged.

## Next action

Wait for stable S25-S28 commits/integration notes while keeping this branch available for coordination updates. Once a handoff lands, S29 will review the PR delta against the contract, integrate in minimum-conflict order, then extend the acceptance harness from contract tests into runtime/E2E gates.

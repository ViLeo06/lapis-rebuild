# S27 — M6 Wizard Ten-stage Progression

Date: 2026-09-20  
Integration branch: `codex/s29-m6-integration-acceptance`

## Status

S27 was found empty when S29 took over final M6 integration. This implementation is therefore completed directly on S29 after S25/S26/S28 were integrated.

## Stable contract

- canonical stages: `109 → 119 → 129 → 139 → 149 → 159 → 169 → 179 → 189 → 199`
- fixed-hash authored HP/MP/move/hit/magic-hit/name/stage-entry-Magic references from S25
- B109..B199 `_00/_01/_02/_03/_05` ANI/SPR family paths
- centralized `RECONSTRUCTION_WIZARD_PROGRESSION_POLICY`
- staged playable showcase skills `19101/19201/19301`
- authored MP costs remain from Magictbl; readiness cost uses the recovered battle profile contract
- wizard equipment family adapter
- SaveV2 stage adapter
- promotion and progression APIs parallel to S26

## Evidence boundary

### VERIFIED-STATIC-ORIGINAL

- ten wizard ability rows and authored HP/MP/movement/hit/magic-hit/name values
- S25 exact stage-entry Magic references `19101..19501`
- fixed-hash B109..B199 action-resource existence
- authored MP costs for modeled Magic rows
- `_03` hit-reaction binding

### RECOVERED_SECONDARY

- `_00/_01/_02` semantic labels
- readiness profile interpretation, including the existing 20-point ring and magic readiness rate use

### RECONSTRUCTION_POLICY

- promotion levels
- staged availability of the currently modeled three wizard showcase skills
- current training equipment compatibility

### SERVER-BOUNDARY / UNVERIFIED

- retail promotion quests/conditions
- server-side derived MATK/growth formulas
- exact unlock predicates
- full stage 6–10 spell roster
- runtime behavior for authored `19401/19501` until their complete content/effect contract is modeled
- MagicRes placement/blend/stage composition

## S29 handoff

S29 should consume `WIZARD_STAGES`, `availableWizardSkillIds`, the promotion APIs and Save adapter, then extend the production class/runtime catalog to all twenty M6 stage IDs. Do not turn `19401/19501` into invented playable effects merely because their authored rows exist.

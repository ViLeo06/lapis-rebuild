# S38 — M7.1 EXP / Level / Rewards / Skill Points

Branch: `codex/s38-m7-1-progression-exp-rewards`  
Baseline: `main@6094aae3c4ff0a04af5dd4376f2b59b8b342d430`  
PR base: `codex/m7-1-gameplay-skill-integration`

## Delivered authority

- `m7-1-experience-policy.ts`: fixed-hash authored Lv1–65 values plus explicit evidence boundaries.
- `progression.ts`: policy-aware EXP calculation, multi-level events, M7.1 initialization and legacy-policy migration.
- `m7-1-training-rewards.ts`: approved 35/45/55/80% training reward policy and 0 EXP for retreat/failure.
- `m7-training-camp.ts`: adds `expReward` to the existing S33 15-battle registry; no duplicate training dataset.
- `rewards.ts`: one `skill_point` event for every M7.1 level crossed.
- `m7-save-migration.ts`: existing Lv1–65 saves migrate to M7.1 EXP while preserving attained level and fractional in-level progress. M6 Lv66+ saves stay on the legacy policy to preserve Stage 8–10 compatibility.

## Evidence boundary

**VERIFIED-STATIC-ORIGINAL**

- `levelabl.atr` source hash and individual `experience_value` rows.
- swordsman/wizard target-row value equality.

**INFERRED**

- concatenating the first seven profession stage blocks onto the approved global Lv1–65 axis.

**RECONSTRUCTION_POLICY**

- interpreting each mapped authored row as the requirement for advancing from that global level;
- accumulated EXP threshold as the sum of prior per-level requirements;
- Normal/Hard/Elite/Boss training reward ratios;
- Skill Point +1 per player level.

**SERVER-BOUNDARY**

- retired-server EXP consumption and reward formulas, party/penalty modifiers, and any hidden promotion coupling.

## S41 integration handoff

1. Normal M7.1 runtime at Lv1–65 should use the M7.1 progression policy. `migrateSaveToM7` already canonicalizes older compatible saves.
2. On **victory**, use the selected S33 preset's `expReward` in the existing idempotent battle reward pipeline. Use a stable per-victory receipt ID appropriate to repeatable training; do not reuse one permanent receipt for every replay.
3. On **retreat/failure**, do not apply training EXP.
4. Capture `oldLevel` before reward application. After reward application, call `reconcileM7IntegratedSkillState(...,oldLevel,newLevel)` once and persist the returned `SaveV2.m7.skills` state.
5. Consume emitted `exp`, `level_up`, and `skill_point` events for S40/S41 feedback (`EXP +N`, `LEVEL UP`, `Skill Point +1`).
6. A single reward may cross several levels; process every returned level-up in order.
7. Do not persist Developer preset/all-skills override into the normal save. Existing M7 save validation continues to reject it.
8. M6 progression above Lv65 is deliberately not rewritten by S38; the seven-stage M7.1 gameplay loop is capped at Lv65 while M6 Stage 8–10 regression compatibility remains intact.

## Conflict / parallel-worker note

S38 does not modify `scene.ts`, `battle.ts`, `m4-runtime-integration.ts`, Battle HUD, Plan, Backlog, or evidence ledger. The battle-outcome glue, HUD feedback, and final save transaction belong to S41.

Wizard/swordsman skill numeric authority remains with S36/S37. S38 only defines the level-up Skill Point grant contract and preserves the existing class skill persistence path.

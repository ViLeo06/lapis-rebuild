# S32 — M7 Wizard Seven-stage Skill Completion / S34 Handoff

Branch: \`codex/s32-m7-wizard-skills\`  
Baseline: \`main@1d592d0e2194567c5d7d863e6a48250407dabeb3\`

## Delivered modules

- \`manifests/m7-wizard-seven-stage-skills.json\`
  - canonical S32 M7 policy/data;
  - seven-stage Lv1–65 axis;
  - seven skills × six levels;
  - evidence fields and server-boundary list.

- \`web/src/content/skills/wizard-seven-stage.ts\`
  - stage resolver;
  - skill catalog;
  - 42 level states;
  - skill-point validation/upgrades;
  - developer all-Lv6 override.

- \`web/src/content/skills/wizard-seven-stage-runtime.ts\`
  - status/runtime adapter;
  - poison independent tick;
  - INT scaling;
  - Nature Force staff MP drain;
  - Ashes heal block;
  - petrify action/ordinary-target gate;
  - Dark Veil / Blindness accuracy distinction;
  - Cursed Sword one-hit physical ×2 consumption.

- \`web/src/content/skills/wizard-seven-stage-save.ts\`
  - normal SaveV2 persistence adapter;
  - legacy SaveV2 fallback;
  - developer state persistence rejection.

- \`web/tests/s32-wizard-skills.test.ts\`
  - S32 unit/contract coverage.

- \`docs/research/m7-wizard-seven-stage-skills.md\`
  - evidence and reconstruction boundary.

## S34 shared-core integration hooks

S32 intentionally did **not** edit:

- \`web/src/main.ts\`
- \`web/src/scene.ts\`
- \`web/src/battle.ts\`
- Plan / Backlog / AGENTS / evidence-ledger

S34 should consume the adapters rather than reimplement the rules.

### 1. Stage / skill availability

For M7 Lv1–65 use:

- \`m7WizardStageForLevel(level)\`
- \`m7WizardAllowedSkillKeys(level)\`

Required boundaries:

\`1 / 6 / 16 / 26 / 36 / 46 / 56\`

Do not use the old M6 reconstruction \`10 / 20 / 30...\` starts inside the M7 first-seven-stage player-facing path.

Do not delete M6 B179/B189/B199 capability; S32 only owns the first-seven M7 content layer.

### 2. Skill command identity

Fixed-client authored IDs are safe for:

- 19101 黑暗之帐
- 19201 毒雾
- 19301 自然力量
- 19401 灰烬
- 19501 诅咒之眼

Stage 6/7 exact 2.2 client IDs are still unverified.

Recommended shared command contract:

\`{skillKey:M7WizardSkillKey, authoredSkillId:number|null, skillLevel:1..6}\`

Do **not** invent retail-looking numeric IDs for \`blindness\` or \`cursed-sword\`.

### 3. MP / readiness

The S32 level rows expose:

- \`mpCost\`
- \`readinessCost\`

S34 battle command should validate these before applying the status.

The current M7 readiness cost is 10. It remains reconstruction/secondary integration policy and should stay centralized.

### 4. Poison

On cast:

\`applyM7WizardSkillStatus(targetStatus,'poison-mist',skillLevel,{intelligence})\`

On battle update, call:

\`tickM7WizardStatus(targetStatus,deltaMs)\`

and subtract \`poisonDamage\` from HP.

Important: the status tick is independent from the poisoned unit taking an action. Petrify does not pause an already-applied poison in the M7 policy.

S34 should use S30 target resistance/balance only as a separate combat layer. Do not rewrite the S32 INT scaling into fixed damage.

### 5. Natural Force

Apply \`nature-force\` to the wizard's own status.

After a **successful staff ordinary physical hit**, call:

\`applyM7NatureForceStaffHit(...)\`

Only transfer the MP actually available on the target and only up to the caster's MP room.

Do not trigger it from poison, magic casts or non-staff attacks.

### 6. Ashes / healer integration

Every HP heal route that matters in M7 should pass through:

\`applyM7WizardHealing(status,currentHp,maxHp,amount)\`

This includes:

- active monster heal;
- passive regeneration;
- item/ability HP healing if later added.

It intentionally does not block MP recovery.

S30's healer monster is the required integration target for the final Gray/Ashes acceptance.

### 7. Curse Eye

While:

\`m7WizardCanAct(status) === false\`

the target cannot move, attack or cast.

While:

\`m7WizardOrdinaryAttackTargetable(status) === false\`

ordinary attacks must reject that target.

S32 policy keeps existing DOT ticking during petrify.

S34 should define how special/area effects treat petrified units in one place; S32 does not claim a retail server rule beyond the historical ordinary-attack behavior.

### 8. Dark Veil vs Blindness

Consume:

- \`m7WizardAccuracyModifiers(status)\`
- \`m7WizardEffectiveRangeCells(baseRange,status)\`

Dark Veil Lv6:
- physical hit -40%;
- magic hit 0;
- no range reduction;
- 30s.

Blindness Lv6:
- physical hit -60%;
- magic hit -30%;
- range -2 cells;
- 15s.

If both are active, S32 currently returns additive modifiers. S34 may clamp the final hit chance in its combat authority; do not mutate the source status values.

### 9. Cursed Sword

Immediately before resolving a qualifying physical hit:

\`consumeM7CursedSwordPhysicalWindow(targetStatus,baseDamage)\`

If active:
- multiplier = 2;
- curse is consumed after that physical hit.

Magic damage must not consume this window.

### 10. SaveV2

S32 working adapter stores the normal skill book under:

\`SaveV2.quest.m7WizardSkills\`

via:

- \`attachM7WizardSkillBookToSaveV2\`
- \`restoreM7WizardSkillBookFromSaveV2\`

It preserves legacy quest keys and supports old saves with no payload.

Developer override is rejected by this persistence path.

For final M7, S34 may replace the namespaced quest payload with a generic M7 SaveV2 extension shared with S31. If so:

1. preserve read/migration compatibility for the S32 payload;
2. keep normal/debug persistence separated;
3. validate skill point budget and stage legality on load.

## Expected S34 acceptance

Required integration checks after S30/S33 are available:

1. Lv1 does not expose poison.
2. Lv6 exposes poison.
3. Lv16 exposes Nature Force.
4. Lv26 exposes Ashes.
5. Lv36 exposes Curse Eye.
6. Lv46 exposes Blindness.
7. Lv56 exposes Cursed Sword.
8. Poison damage increases with INT.
9. Poison continues without target action.
10. Staff ordinary hit drains MP under Nature Force.
11. Ashes blocks S30 healer HP recovery.
12. Petrified target cannot act and cannot receive ordinary attack targeting.
13. Dark Veil and Blindness produce materially different battle effects.
14. Cursed Sword doubles exactly one qualifying physical hit.
15. Skill Lv1–Lv6 survives normal SaveV2 save/load.
16. Debug all-skills state does not leak into normal save.
17. Mobile skill selection reaches the same command adapter.

## Evidence caveat

A 2003 mainland player article describes 黑暗之帐 as attack reduction, while fixed 2.2 \`Magictbl\` text says accuracy reduction. M7 follows fixed-client priority and implements accuracy denial.

Final S34 validation must not label reconstruction percentages/durations or Stage 6/7 client IDs as recovered retail facts.

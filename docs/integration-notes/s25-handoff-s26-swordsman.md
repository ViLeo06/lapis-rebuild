# S25 → S26 Handoff — Swordsman Ten-stage

S26 应以 `manifests/m6-dual-class-ten-stage-matrix.json` 为唯一 S25 数据入口。

## 可直接消费

- stage order: `100,110,120,130,140,150,160,170,180,190`。
- 10 阶名称、HP/MP、con/wis/str/dex/int/reg 与 m*、move/hit/elu/blow/mhit/melu/DEF、readiness raw fields。
- 每阶 `B<id>_00/01/02/03/05` ANI/SPR family；`_03` hit-reaction 是强原始证据。
- 双职业 200 条 `levelabl` 中属于剑士的 100 条 authored rows，包括 explicit experience values。
- stage 1–5 exact Magic refs `1101/1201/1301/1401/1501` 及 MP/Dist/Area/MagicPtn。
- `next_class_raw` 静态链可以作为 promotion policy 的候选输入。

## 不得硬编码成“原版规则”

- last internal level = original promotion level；这是 INFERRED。
- `experience_value` 的数学公式；没有恢复 formula。
- con/str/dex 等如何累加到最终 combat stats；SERVER-BOUNDARY。
- stage 6–10 没有 column14 ref ≠ 没有技能。
- item flag 0 ≠ 已验证装备资格 consumer。

S26 domain 至少保持：`stageId`, `authoredAbility`, `visualStem`, `progressionTable`, `magicSkillRefs`, `provenance`。所有 promotion/attribute/skill-unlock 规则集中到 `ReconstructionSwordsmanProgressionPolicy`，不要散落 UI/battle/scene。

# S25 → S27 Handoff — Wizard Ten-stage

S27 应以 `manifests/m6-dual-class-ten-stage-matrix.json` 为唯一 S25 数据入口。

## 可直接消费

- stage order: `109,119,129,139,149,159,169,179,189,199`。
- 10 阶名称、HP/MP、con/wis/str/dex/int/reg 与 m*、move/hit/elu/blow/mhit/melu/DEF、readiness raw fields。
- 10 阶 `B<id>` visual family。
- 巫师 100 条 `levelabl` authored rows + explicit experience values。
- exact Magic refs `19101..19501`：黑暗之帐、毒雾、自然力量、灰烬、诅咒之眼；MP 分别 20/20/20/27/18，并保留 Dist/Area/Att/EA/EB/EC/MagicPtn。
- `next_class_raw` 静态链可作为重构 promotion policy 候选。

## 边界

- Magic MP cost 是 VERIFIED-STATIC-ORIGINAL；技能最终效果算术、target semantics、unlock condition 不是。
- `int/mint` 是 authored token/value；不得把其转换为 MATK 的公式标 original。
- stage 6–10 column14=0 不代表没有技能。
- MagicRes placement/blend/stage composition 仍 UNVERIFIED。
- item flag index 9 与 wizard `cla=9` 的对齐仍 INFERRED。

所有成长/转职/MATK/技能解锁规则集中到 `ReconstructionWizardProgressionPolicy`。

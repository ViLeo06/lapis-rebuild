# S25 → S28 Handoff — World / Progression / Equipment

## Progression input

- canonical matrix 提供 20 stage + 双职业 200 条 `levelabl` rows。
- `experience_value`、growth columns、`next_class_raw` 是 VERIFIED-STATIC-ORIGINAL 数据。
- 把最后一行 `next_class_raw` 当 promotion trigger 仍是 INFERRED；quest/condition authority 是 SERVER-BOUNDARY。
- S28 可以选用这些表值做 offline authority，但采用规则必须明确 `RECONSTRUCTION_POLICY`。

## Equipment input

`itemtbl.atr` 已确认存在 `equip_position`、`equip_level`、10 个 class/category flags 和 combat/stat fields。代表 item rows 已进入 manifest。

剑士 `cla=0` / 巫师 `cla=9` 与代表装备 flag 0/9 对齐，但缺 retail consumer，因此：

1. S28 不得把现有 `training.role` 重新标成 original truth；
2. 可以实现独立 resolver，优先把 `item_flag[cla]` 作为 `INFERRED` 候选来源；
3. `equip_level` 数值可以保留为 authored input，enforcement 为 reconstruction policy；
4. class/stage/quest/item final eligibility 继续 SERVER-BOUNDARY。

## Quest/reward

ability 表有 authored `gold/EXP` columns，但 S25 没有证明它们何时、由哪个 server event 支付。S28 reward pipeline 不得直接绑定这些列为原版奖励。

SaveV2 扩展时应保存 stage/progression/equipment/receipts，但 provenance 不要序列化成不可替换的玩法常量。

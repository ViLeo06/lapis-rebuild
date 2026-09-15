# 战斗行动槽恢复记录

> 更新：2026-09-15  
> 作用：记录当前从固定 2.2 客户端资源与静态兼容运行时交叉恢复出的行动槽/战斗参数。  
> 原则：区分原始数据、二级静态语义和仍待原客户端动态确认的参数。

## 结论

Web 早期原型曾把一次行动处理成“行动槽直接归零，再在约 700ms 内线性回满”。这一模型已被静态恢复证据推翻。

当前恢复出的旧战斗模型是：

`行动槽满 → 才允许下达行动 → 按行动类型扣除若干点 → 后续 battle tick 每次恢复 1 点 → 再满后才能下达下一次行动`

因此它确实更接近用户记忆中的“战棋 + 半回合制/行动等待”，而不是普通地图上的即时 ARPG。

## A. 原始 Set.lib authored values

`Set.lib/ability.atr` 对目标职业给出的字段值如下。数值本身来自原始客户端静态资源；字段的战斗语义由恢复出的旧客户端兼容运行时提供二级静态映射。

| 职业族 | 移动范围 | 普攻范围 | movement profile | 移动行动消耗 | 普攻行动消耗 | REST 消耗 | magic rate | command range |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 剑士 B100–B190 | 5 | 1 | 0 | 6 | 4 | 5 | 100 | 4 |
| 巫师 B109–B199 | 4 | 1 | 9 | 6 | 4 | 5 | 100 | 4 |

这些值在两条目标职业路线的 10 个阶段内保持一致。

## B. 行动槽语义（RECOVERED_SECONDARY）

静态恢复代码对旧客户端 battle wire/runtime 的注释与地址映射显示：

1. 单位只有在 `readiness_current >= readiness_maximum` 时才可执行普通行动。
2. battle tick 消息使活跃单位的 `readiness_current` **每次增加 1**，最大不超过 `readiness_maximum`。
3. 行动完成后不是把槽清零，而是执行：
   `readiness_current = max(0, readiness_current - action_cost)`。
4. MOVE 使用 authored `movement_stamina_rate`。
5. 普攻使用 `attack_stamina_rate`。
6. REST 使用 `rest_stamina_rate`。
7. 魔法的行动槽消耗公式恢复为：

```text
resource_scale = min(readiness_maximum, 10)
magic_cost = max(1, ceil(resource_scale * magic_stamina_rate / 100))
```

目标剑士/巫师 `magic_stamina_rate = 100`，若玩家 readiness maximum 为 20，则魔法消耗为 10 点。

## C. 20 格行动环与 tick 时间

恢复代码明确记录玩家 commander 的 native readiness 环为 20 段，并使用 `20/20` 作为离线战斗的 commander readiness pair。因此 Web 当前将玩家行动槽 maximum 改为 20。

兼容传输层观察到的 tick cadence 为约 **500ms / 点**。这一时间值比“700ms 整槽回满”有明显更强的恢复依据，但它仍未由我们在隔离环境中直接运行原 `NeoDark.exe` 独立测量，所以继续标记为 `RECOVERED_SECONDARY / 待动态确认`。

若暂以 500ms 为 cadence，则从满槽行动后的理论等待时间为：

- 移动：20 → 14，需要恢复 6 点，约 3.0 秒。
- 普攻：20 → 16，需要恢复 4 点，约 2.0 秒。
- REST：20 → 15，需要恢复 5 点，约 2.5 秒。
- 魔法：20 → 10，需要恢复 10 点，约 5.0 秒。

这些等待时间只用于当前私人 Web 人工校准，不提升为最终原版事实。

## D. 战斗场景和坐标

二级静态恢复同时给出以下旧战斗结构：

- battle entry/wire 明确携带 battle zone 与 battle-grid geometry。
- 原始坐标换算沿用 32px / 16px 的等距轴尺度。
- 兼容离线训练策略使用 `SGRes/sz-0000.imf` 作为 battle zone 0，并在合法 IMF cells 中放置双方。
- `CombatMap.Tip` 是 10 帧 battle/arena 选择图像库；目前证据不足以把其中缩略图直接当成实际 battle world background。
- `Dlg/CombatSelect.Tdg` 以 `DIALOG LIBRARY.` 开头，615×538、45 entries；布局/控件结构仍在恢复。

因此 Web 当前采用“field map 0001 → battle zone 0000 → 返回 field”的私人验证映射是合理的工程过渡，但仍不得称为原版所有 encounter 的通用映射。

## E. Web 实施约束

从本记录之后：

- 禁止恢复“行动后整槽归零 + 700ms 线性回满”的旧临时模型。
- MOVE / ATTACK / MAGIC 应分别扣除恢复出的行动成本。
- 行动槽按离散 tick 恢复，而不是线性百分比动画决定逻辑。
- 敌人 AI、伤害公式、命中、技能具体行动成本差异等未恢复内容仍保持 `UNVERIFIED`。
- 500ms cadence 在 UI/文档中必须注明为二级恢复证据，直到 M4 原客户端动态验证。

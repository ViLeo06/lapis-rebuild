# 日本 / 台湾资料主档

> 当前定位：后继 Lapis / 日服 LAPIS Online 与繁体中文玩家保存资料。  
> 默认证据等级：`INHERITED-C`；玩家观察或攻略归纳为 `INFERRED`，不得直接覆盖 2003 国服 A/B 级证据。

## 1. 日服“司教の洞”资料存档

主站：

- https://lapis-online-memories.github.io/
- https://lapis-online-memories.github.io/index_v1.htm
- https://lapis-online-memories.github.io/v2/

公开网页源码：

- https://github.com/lapis-online-memories/lapis-online-memories.github.io

2026-09-18 已核验：网页正文和对应 GitHub HTML 源文件均可读取。它是老玩家攻略站存档，不是服务端源码。

### 1.1 伤害/属性候选式

来源：

- https://lapis-online-memories.github.io/keisan.htm
- 源文件 blob SHA：`a7d5eb8a31d1409c73954b0cbb8060cb76bfebb4`

页面日期：2007-11-18。

作者明确提醒内容可能包含误差，因此这里只保留为候选：

```text
物理伤害 = (攻击力 × 攻击增益倍率 - 防御力 × 防御增益倍率) × 技能倍率
暴击伤害 = 未暴击伤害 × 1.5
防御力 = 基础防御力 × (1 + CON / 100)
魔防 = 基础魔防 × (1 + REG / 100 + WIS / 200)
```

项目用途：S19 重构平衡的外部校准候选，不是国服 exact retail formula。

### 1.2 敌人行动观察

来源：

- https://lapis-online-memories.github.io/teki.htm
- 源文件 blob SHA：`f85fa1b925b00ffb85a21ff89f7f44d9a779585a`

页面日期：2006-05-14。

玩家观察到部分敌人可能存在“领队/跟随”式联动与激活条件，且画面范围、距离和静止攻击之间存在一些行为现象。

项目用途：给 Enemy AI / Monster Visual 的验证提供测试方向；不能等同于旧服务器 AI program 或 `6A69` payload。

### 1.3 村庄设施与训练场入口

来源：

- https://lapis-online-memories.github.io/kaosia.htm
- 图示：https://lapis-online-memories.github.io/image-lapis/kaosia.gif
- 源文件 blob SHA：`87380ea27e268629570e831f2975a9d6905d043c`

页面日期：2006-10-01。

资料列出广场、仓库、酒馆、商店、宠物屋、训练场、竞技场、神殿等设施；其中明确描述训练场存在两个入口，分别进入不同地图。

项目用途：S16/S18 的设施语义、入口关系和 world graph 候选约束。图示不是国服坐标表，不能直接绑定 object id/map id。

### 1.4 怪物/掉落记录

来源：

- https://lapis-online-memories.github.io/v2/drop-item-memo.html

页面含作者实测与评论/听说信息。可用于怪物名、物品名和视觉资源检索词对齐，不可推出掉落概率。

## 2. 繁体中文保存的日服资料

巴哈姆特旧帖：

- https://forum.gamer.com.tw/C.php?bsn=5100&snA=83
- https://forum.gamer.com.tw/Co.php?bsn=5100&sn=383
- https://forum.gamer.com.tw/Co.php?bsn=5100&sn=384
- https://forum.gamer.com.tw/Co.php?bsn=5100&sn=374

资料年代以 2011 年帖及后续编辑为主，讨论的是改版后的日服/《流星物语》资料。

已读到的可用字段包括：

- 职业/技能名称
- 技能等级
- MP 成本
- 作用范围
- 休息时间
- 部分任务前置条件和所需物品

项目用途：

- 剑士/巫师技能语义候选；
- S19 数值量级参考；
- S18 任务依赖链候选。

边界：

- “休息时间”单位需要独立验证；
- 2011 后继数值不能直接回填 2003 国服；
- 玩家强弱评价不是结算公式证据。

## 3. 使用规则

当这些资料与 fixed-hash 2.2 客户端发生冲突时：

1. 当前客户端直接证据优先；
2. 匹配年代国服/同期韩服优先于后继日服；
3. 后继日服只用于补缺、命名、视觉谱系和可测试假设；
4. 任何后继数值进入运行时都必须标记为 `RECONSTRUCTION_POLICY` 或候选，而不是 `VERIFIED`。

完整网络调查见：

`docs/research/external-web-research-20260918.md`

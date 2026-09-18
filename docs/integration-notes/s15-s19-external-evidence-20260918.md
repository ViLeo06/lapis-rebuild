# S15-S19 外部网络证据接入说明（2026-09-18）

> 目的：把本轮公开网络调查里对 M5 Playable Recovery 真正有用的材料，压缩成其他 Session 可直接消费的输入。
>
> 完整报告：`docs/research/external-web-research-20260918.md`  
> 私有资料包：Google Drive `lapis-rebuild-assets/00_inbox/external-web-research-20260918/`

## 1. 证据边界

本轮最重要的资料主要来自后继日服 Lapis、繁体中文保存的日服资料、现行韩服 Lapis 与民间代码仓库。

默认等级：

- 日服/后继 Lapis：`INHERITED-C`
- 玩家观察、攻略归纳：`INFERRED` 或候选约束
- 当前国服 fixed-hash 2.2 客户端：仍以现有 `VERIFIED` / `RECOVERED_SECONDARY` 结论为准
- 民间单机端/重写端：即使后续找到，也必须拆分“原版数据”“作者猜测”“后期魔改”

任何外部资料都不能直接把 server-boundary 缺口升级为原版已恢复。

## 2. 五条并行线可直接消费的输入

| Session | 外部输入 | 可以怎么用 | 不能怎么用 |
| --- | --- | --- | --- |
| S15 Viewport / Camera | 日服敌人行为页记录画面范围/敌人行动的玩家观察 | 设计人工验证场景，检查镜头变化是否只影响呈现 | 不能推导“镜头决定服务器 AI/伤害结算” |
| S16 NPC Visual | 日服村庄设施页列出广场、仓库、酒馆、商店、宠物屋、训练场、竞技场、神殿等 | 辅助设施/NPC archetype 命名与场景角色核对 | 不能直接拿日服图示当国服世界坐标或 object id |
| S17 Monster Visual | 日服怪物/掉落记录可提供怪物名、掉落物名、部分视觉语义候选 | 建立 monster visual family 的名称候选和交叉检索词 | 不能从“掉过某物”推出掉落概率或 battle roster 绑定 |
| S18 World Transition | 日服资料明确记录“训练场有两个入口，分别进入不同地图”；繁中资料保存部分任务前置关系 | 对现有地图/入口对象做定点核验，优先测试一入口→一目标图的双入口结构 | 不能直接照搬后继版本地图 ID、坐标、任务编号 |
| S19 Reconstruction Balance | 2007 日服玩家归纳的物理/暴击/防御/魔防候选式；2011 日服技能表含 MP、范围、休息时间 | 作为 reconstruction balance 的外部校准候选，做 sensitivity/held-out 比较 | 不能改写为 exact retail formula；“休息时间”单位不能未经验证直接当秒 |

## 3. S19 最值得立刻做的候选对照

来源：`https://lapis-online-memories.github.io/keisan.htm`

玩家归纳候选：

```text
物理伤害 = (攻击力 × 攻击增益倍率 - 防御力 × 防御增益倍率) × 技能倍率
暴击伤害 = 未暴击伤害 × 1.5
防御力 = 基础防御力 × (1 + CON / 100)
魔防 = 基础魔防 × (1 + REG / 100 + WIS / 200)
```

这些只适合：

1. 作为 `ReconstructionCombatBalance` 的一个候选模型；
2. 与当前 authored stats 做量级校准；
3. 用已知样例做回归；
4. 如果未来取得匹配年代实机观测，再决定是否提高证据等级。

不要覆盖当前“最终伤害由旧服务器权威决定、客户端消费 absolute HP”的已恢复边界。

## 4. S18 最值得立刻核验的空间假设

来源：`https://lapis-online-memories.github.io/kaosia.htm`

外部观察：训练场存在两个入口，两个入口进入不同地图。

推荐核验顺序：

1. 在 fixed-hash 2.2 的 field/interior 地图中搜索候选双入口建筑；
2. 对 entrance/object 邻近区域建立可视化预览；
3. 检查是否存在两个不同目标 map/interior 的资源对应；
4. 若客户端无法证明 authoritative mapping，则只把最终绑定放在 `RECONSTRUCTION_POLICY`；
5. 记录“外部后继资料支持双入口结构”，不要写成国服 object→map VERIFIED。

## 5. 客户端/单机端/代码线索

### figupaw 2.1

候选地址：

`https://oss.figupaw.com/client-updates/YBCS-Online-Setup-2.1.exe`

当前状态：只确认页面出现过该地址；本轮未取得完整字节、未做 SHA-256、未解包。

若可在隔离环境取得，优先差分：

- `NeoDark.exe`
- `Set.lib`
- `Quest.lib`
- battle/scene 包
- 地图资源与表文件

只有这些核心文件存在有效差异，才值得继续做深度版本考古。

### ybcs-offline

`https://github.com/peaceMaker1r/ybcs-offline`

2026-09-18 核验状态：仓库描述“ybcs单机”，但 contents 与 releases 都为空。

用途：监控潜在线索；当前不能当成单机端、服务端或源码证据。

### DarkSaverResourceExtractor

`https://github.com/juhens/DarkSaverResourceExtractor`

已核验存在真实 C# GRS 图片资源解析代码。它是前作/相关资源格式线索，不是 Neo Dark Saver 服务端，也尚未证明与当前 SPR/ANI/SGR 兼容。

### 韩服 MGAME Lapis

`https://lapis.mgame.com/`

可继续作为后继同源版本的结构/语义参照，但本轮未取得完整客户端，不应假设资源 ID、协议和数值与目标版本一致。

## 6. 其他 Session 开工前最小阅读

针对 M5，只需要先读：

1. 本文件；
2. `docs/research/external-web-research-20260918.md` 中与自己 Session 对应的小节；
3. 现有本地 fixed-hash 证据文档。

无需重复全网搜索，也无需重新证明：

- ybcs-offline 当前为空；
- 日服公式只是候选；
- 两训练场入口来自后继日服玩家资料；
- 现行韩服不是已验证的旧国服服务端替代品。

## 7. 后续升级证据等级的条件

外部线索要进入正式 evidence ledger，至少满足其一：

- 与 fixed-hash 2.2 客户端资源/静态行为直接交叉吻合；
- 取得匹配年代客户端/录像/官方材料；
- 在隔离环境取得另一个客户端版本并做可复现 hash/diff；
- 对同一结论有独立来源交叉验证。

S15-S19 并行期不要修改冻结的 `Plan.md`、`Backlog.md`、`docs/evidence-ledger.md`。阶段收口时再由协调 Session 统一吸收。

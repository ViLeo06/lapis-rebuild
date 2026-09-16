# 《佣兵传说》复刻项目计划

> 版本：v2.6｜更新：2026-09-16｜Web-first  
> 用途：个人怀旧、研究、非商业复刻。第一优先级：剑士、巫师。  
> 执行规则：`AGENTS.md`；任务：`Backlog.md`；证据：`docs/evidence-ledger.md`。

## 0. 当前状态

### 0.1 当前检查点

主线保持 **Vite + TypeScript + Phaser + Python 静态转换工具链**。Godot 工程只保留参考，不继续双线开发。

- `main` 已收口 PR #2（Web-first/G2/M3 基线）、PR #3（2.2 安装包归档）、PR #4（Quest/NPC 静态内容与稳定性）和 PR #5（战斗系统考古收口）。
- M0/G0：完成。安装包、精确 7z payload、全量静态展开、哈希和主要解析器均可复现。
- M1：核心通过。ANI/SPR/SGR/MMF/SMF/IMF/Set.lib/Quest.lib/Tip 已形成静态解析链；音频/UI/字体继续收口。
- M2/G2-Web：工程门禁通过；SPR 横向切片、角色左右方向、正常画面路线线条和 bounds 调试叠层已经过人工校准。
- M3：Web 已改回原作有证据支持的 **FIELD → 独立 BATTLE → RETURN** 结构，并使用行动槽驱动战术移动/攻击，不再把普通地图实时训练当成原作战斗模型。
- Quest/NPC 静态内容已经恢复稳定结构并可在 private-original 构建中派生；原始正文不进入 Git。
- 30 分钟真实墙钟 Web soak 已完成旧检查点验证；新版 v4 fixed-hash 2.2 private-original smoke run `35059120452` 成功，静态 battle binary research run `35073375954` 成功。
- 2026-09-16 用户批准进入多 Session 并行阶段：第一波 S1–S5 独立考古/恢复，第二波 S6 统一运行时整合，第三波 S7 发布前验收。

### 0.2 已恢复的战斗事实

**行动槽 / readiness**

- 玩家 native readiness 环恢复为 20。
- 单位只有 `readiness_current >= readiness_maximum` 时才可执行普通行动。
- MOVE / ATTACK / REST 的目标职业 authored 消耗分别为 6 / 4 / 5。
- 行动后按成本扣除，不是整槽归零；battle tick 每次恢复 1 点。
- 目标剑士/巫师 `magic_stamina_rate = 100`；当前恢复公式在 readiness maximum=20 时对应 magic cost=10。
- 兼容传输层观察到约 500ms / tick；这是 `RECOVERED_SECONDARY`，不是最终原版动态测量值。

**敌人 AI**

固定 2.2 retail client 已恢复真实 AI mini-language 和 chooser：

- order：`ODNORMAL / ODATTACK / ODDEFENCE`；
- target token：`AREA / SOILDER`；
- action：`REST / ATTACK / MAGIC`；
- 默认程序：`ODNORMAL REST(20),ATTACK(80)`；
- chooser 使用 `rand() % 100`；
- HP/MP 阈值和 inclusive weighted selection 已恢复。

未恢复的是“具体 retail 敌人/encounter 绑定哪条 AI、目标选择和路径偏好”，因此训练敌人仍不能直接标为 original AI。

**Battle entry / encounter**

- retail battle entry 下行记录携带 `battleZoneId` 和可选 battle-grid geometry。
- 客户端以 `sz-%04d.mmf` 加载 battle zone；没有证据支持通用本地 `fieldMapId -> battleMapId` 公式。
- 已抓到 field interaction 边界：选中对象类型 101..103 且 Manhattan distance <4 时存在 `49/21/01 + object word` 请求；另有 `08 + word` fallback 路径。
- 真正 field event / spawn / session 到 `battleZoneId` 的绑定仍需继续追踪，禁止用猜测补表。

**伤害边界**

- 普攻 uplink 不携带客户端伤害结果。
- 客户端收到 signed absolute HP 后直接覆盖 live HP，并另外计算 delta 用于表现。
- 因此精确命中/伤害/暴击 RNG 公式不能仅凭当前客户端 request/response 路径声称已经恢复；Web 训练伤害继续标 `UNVERIFIED` 或明确写成 reconstruction policy。

### 0.3 人工视觉校准

- SPR 多 span 行首字段验证为从上一 opaque run 末端计算的 transparent skip；横向切片已修复。
- B100/B109 `Body_` raw direction row：`S,SW,W,NW,N,NE,E,SE`；east/west 已修复并回归。
- 正常玩家画面不显示寻路 polyline；bounds/anchor 默认关闭，只能通过 Debug Panel 手动开启。
- 自动测试负责“能运行”，人工检查负责“视觉/动作语义正确”，二者不能互相替代。

### 0.4 已验证基线

| 项目 | 当前结论 | 证据/范围 |
| --- | --- | --- |
| 安装包 | 470,688,152 bytes | SHA-256 `c42f37b...d6cdae88` |
| 精确 7z payload | 469,089,543 bytes | SHA-256 `9beb6066...e996357` |
| 静态展开 | 22,885 个普通文件 / 2,699,237,296 bytes | 不执行原客户端 |
| ANI | 6,948 个，固定 1,236 bytes | 8×32 槽，只读取每行 active prefix |
| SPR | 行游程 RGB565 + bounds | relative transparent skip 已验证 |
| 双职业目标 | 20 阶段×5 动作，100 对 ANI/SPR | 严格解析与索引范围通过 |
| Body_ 方向 | `S,SW,W,NW,N,NE,E,SE` | B100/B109 真实帧人工/静态交叉检查 |
| B100 / B109 move | 5 / 4 | `ability.atr` 原始数据；战斗语义已有二级静态映射 |
| 行动槽 | max 20；MOVE/ATTACK/REST=6/4/5；tick +1 | `RECOVERED_SECONDARY`；500ms cadence 待动态确认 |
| AI 语法/chooser | order、target、REST/ATTACK/MAGIC、默认程序和阈值已恢复 | 固定 2.2 NeoDark 静态探针 |
| Battle entry | 下行 `battleZoneId -> sz-NNNN.mmf` + optional grid | 固定 2.2 NeoDark 静态探针 |
| Damage boundary | server/authored absolute HP overwrite | 精确公式仍未恢复 |
| SGR | 92/92 可解析 | 0 错误 |
| 地图 0000 | 对练场，1536×768；IMF 47×47 | Web 已接入 |
| 地图 0001 | 布日古斯_外城，2240×1280；IMF 69×79 | Web 已接入 |
| Battle scene resources | `CombatMap.Tip` 与 `sz-0450..0455` 等存在静态视觉对应 | 不代表普通地图 encounter 绑定 |
| MagicRes | 001/002/003/035/036/037/038 可顺序诊断播放 | FOCUS placement/timing/blend 仍 UNVERIFIED |
| Quest.lib | 21,205 bytes；15/15 members | 固定哈希，静态提取 |
| NPCScript | 39 NPC blocks / 125 active / 5 disabled | 声明数量全部对齐 |
| Quest0–9 | 10 files / 42 STEP / 179 dialogue commands | token 结构严格解析 |
| Tutorial | 42 TALK blocks / 173 text records | 静态结构已解析 |
| HelpScript | 5 HELP / 14 STEP / 30 四整数记录 | 静态结构已解析 |
| Neohelp | 18 sections / 336 records | 静态结构已解析，语义不外推 |
| Tip | 27/27 文件严格闭合，3547 frames | 全量验证 |
| NPC350.Tip | 图像 sprite library；不是 NPC placement/behavior 表 | 已恢复容器/图像性质 |
| Source-backed Web | private pack 从固定 Quest.lib 生成 Quest/NPC JSON | 正文不提交 Git |
| 浏览器稳定性 | 30 分钟真实墙钟 soak 成功 | run `34969057806`，旧检查点 |
| v4 private-original | fixed-hash 2.2 smoke 成功 | run `35059120452` |
| static battle research | 固定哈希解压镜像静态探针成功 | run `35073375954` |

### 0.5 当前未完成

- 真正 encounter trigger、field event/spawn/session 到 battleZone 的绑定。
- 不同普通地图/事件具体进入哪个 battle scene；不能硬编码通用映射。
- 具体敌人/roster 到 AI program 的绑定、`AREA/SOILDER` 目标语义、路径/位置偏好。
- 精确物理/技能命中、伤害、暴击公式；当前已知 client 不是该路径的权威计算端。
- Quest/NPC 与地图实体、坐标、触发点、条件分支、奖励、招募等运行时 binding。
- ANI timing、命中时序、死亡表现、MagicRes/FOCUS placement/blend/阶段衔接、前景遮挡和音效。
- 完整背包/装备、成长/转职、正式任务链和更多地图流程。
- 公开 Web 预览访问控制与版权审查；原版资源不得擅自公开部署。
- 若静态证据无法恢复关键行为，M4 才进入隔离、可回滚 Windows VM；普通环境与 CI 禁止执行原始 `NeoDark.exe` 或未知 DLL。

### 0.6 下一步

当前阶段采用 **先并行考古、再集中整合**：

1. S1–S5 从同一个最新 `main` 分支并行工作，分别恢复 Encounter、Enemy AI binding、Damage、Quest/NPC runtime binding、Visual fidelity。
2. S1–S5 各自提交独立 PR；主要提交新 probe/parser、独立文档、manifest 和测试，不争抢 Web 共享运行时文件。
3. 第一波 PR 全部收口后启动 S6 `runtime-integration`，只在这一阶段把 VERIFIED/RECOVERED 结果装入 `web/src` 核心运行时。
4. S6 合并后启动 S7 `release-validation`，执行 fixed-hash private-original、单 HTML、Chromium、人工式试玩、视觉 spot-check 和必要的 wall-clock soak。
5. 未经证据支持的行为继续标 `UNVERIFIED`，不能为了“可玩”把猜测写成原版事实。

---

## 1. 项目目标

### 1.1 实施路线

**证据固化 → 资源转换 → Web 诊断 → Web 可玩切片 → 行为校准 → 核心系统 → 双职业完整化 → Web 发布 → 可选联网**

终端用户目标是打开现代浏览器即可体验；不要求安装原 Windows 客户端、Godot、Node、Python 或 VM。私人单文件 HTML 作为当前最快的人机联合验收载体。

### 1.2 MVP 验收

1. 浏览器启动并选择剑士/巫师。
2. 非战斗地图正常自由移动；通过有证据的入口进入独立战斗状态，战斗结束/逃跑后正确返回。
3. 战斗采用行动槽驱动的战术移动/攻击框架；精确规则未恢复时明确标注，禁止退回普通实时砍杀模型。
4. 待机、移动、方向、攻击、受击、施法、死亡表现；未知项明确标注。
5. 每职业普通攻击和至少 3 个代表技能；敌人、伤害、死亡、结算形成闭环。
6. NPC 对话、地图切换、基础背包和装备。
7. IndexedDB 存读档，JSON 导入导出作为可迁移备份。
8. Debug Panel 可检查角色、动作、方向、帧、bounds/anchor、地图坐标与通行数据；正常玩家画面默认不显示路线 polyline 和 bounds 方框。
9. 可重复构建、固定输入指纹、实际 Chromium 回归、真实墙钟稳定性验证和人工视觉/玩法复核。

仅有自动测试、按钮或占位训练逻辑，不足以宣布原版还原正确。

### 1.3 V1 验收

剑士 B100–B190、巫师 B109–B199 各十阶段，从初始阶段正常成长到最高阶段：外形、动作、属性、主要技能树、装备适配、升级/转职、代表任务、地图、战斗场景、行动机制、音频、设置和存档恢复。按职业矩阵逐项验收。

### 1.4 暂缓范围

第三职业、大规模全部原作内容；公网账号、充值、交易、运营后台；与未知第三方服务器互通；原生移动 App/主机；Windows-first 发行；未经授权公开散布原资源。PWA/桌面封装只作为未来发行选项。

---

## 2. 技术与资产边界

- 主运行时：Phaser + TypeScript；Vite 构建；HTML/CSS 调试 UI。
- Python >= 3.12：静态提取、ANI/SPR/SGR/MMF/SMF/IMF/Set.lib/Quest.lib/Tip 与 battle binary 的解析、转换和验证。
- 浏览器消费 PNG/JSON/适配音频；不执行原 EXE/DLL，不在前端存密钥。
- 当前锁定依赖以 `web/package-lock.json` 为准。
- GitHub 私有仓库只保存代码、文档、工具、结构、哈希、测试和少量合成样本。
- 原安装包、完整展开、大量派生美术/音频和原始对白保存在私有归档/短期 CI artifact，不进入 Git。
- `web/public/game-data/` 与 `game/generated/` 默认 gitignore。
- 改动先功能分支/PR；合并 `main` 需本阶段明确授权或新的用户确认。

---

## 3. 证据规则

`VERIFIED`：固定哈希、严格解析、全量验证、像素/帧检查、静态反汇编或隔离环境重复实验直接支持。

`VERIFIED-HISTORICAL`：来自同期官方/主流媒体/玩家操作资料，足以确认高层玩法或 UI 架构，但不等于拿到了内部源码。

`RECOVERED_SECONDARY`：来自固定版本兼容/传输实现、旧运行时映射等可复现二级静态证据；强于纯推测，但仍需与 retail 动态行为或其他独立证据交叉验证。

`INFERRED`：有较强线索但语义仍需进一步证实。

`UNVERIFIED`：为推进原型暂用的设计替代，例如未恢复的训练伤害、临时 encounter、部分动画毫秒值。

约束：

- 新证据必须有可复现输入、版本/哈希和 probe/test；不能只写结论。
- ANI raw timing 不自动当毫秒/FPS；`_05` 不统一当死亡。
- FOCUS 不套用 Body_ 八方向规则。
- field 与 battle 必须作为不同游戏状态建模。
- Quest token 无调用链/行为证据时，不外推其运行时语义。
- 私有原作正文只在构建时派生，不提交 Git。
- server-boundary 项目在缺少服务端/封包/动态证据时可以得出“当前无法从客户端证明”的结论；不得为了交付硬造公式。

---

## 4. 里程碑与门禁

| 里程碑 | 交付 | 状态 |
| --- | --- | --- |
| M0 基线 | 固定样本、哈希、静态拆包 | **G0 通过** |
| M1 资源 | 双职业、地图、技能、内容容器与格式转换 | **核心通过，持续收口** |
| M2 Web 诊断 | 地图、角色、逐帧/方向/碰撞/Debug/离线 HTML | **G2-Web 通过；人工视觉持续门禁** |
| M3 Web 可玩切片 | field→battle→结算/返回→NPC/地图→存档 | **结构已校准；真实 encounter/scene binding 未闭环** |
| M4 行为校准 | 行动槽、AI、伤害、UI、任务/encounter trigger | **并行静态考古阶段** |
| M5 核心系统 | 实体、战斗、技能、成长、任务、背包、存档迁移 | 未完成 |
| M6 双职业完整化 | 十阶段职业矩阵 | 未开始 |
| M7 Web 发布 | 内容、性能、兼容、访问控制、版权、回滚 | 未开始 |
| M8 可选联网 | 单机稳定后的独立权威服务端 | 暂缓 |

门禁：

- **G0：已通过。**
- **G1：核心通过。**
- **G2-Web：已通过。** 自动回归 + 人工视觉维护。
- **G3：部分通过。** field/battle/readiness 大结构和稳定性已经建立；真实 encounter/battle-scene binding 与关键运行时行为仍需收口，不能宣称原版战斗闭环完全恢复。
- **G4：**关键行为有可信证据，或用户明确接受正式 reconstruction policy。
- **G5：**双职业矩阵完成或批准例外；否则不称 V1。
- **G6：**公开发布前完成访问控制、版权、构建检查并取得发布授权。

---

## 5. 并行执行方案（2026-09-16 已批准）

### 5.1 总原则

第一波同时运行 5 个独立 Session。每个 Session：

1. 必须从同一个最新 `main` 起分支；
2. 只负责自己的证据域，不把“顺手重构 Web”带进考古 PR；
3. 以 **新文件优先**，减少多人同时编辑同一文件；
4. 各自完成测试和 PR，不直接合并 main；
5. 在 PR 描述中列出 VERIFIED / RECOVERED_SECONDARY / INFERRED / UNVERIFIED；
6. 若没有恢复出答案，允许提交“边界已证明 + 哪些路径没有证据”的高质量负结果。

### 5.2 第一波：S1–S5

| Session | 分支 | 任务 | 主要交付 |
| --- | --- | --- | --- |
| S1 Encounter | `codex/encounter-recovery` | 真正 field encounter、event/request/session → battleZone、普通地图/事件 → battle scene binding | encounter probe、证据表、`EncounterSpec` 数据建议、测试 |
| S2 Enemy AI | `codex/enemy-ai-binding` | retail enemy/roster → AI program 绑定，target/tie-break/path 语义 | AI binding 数据/探针、具体 enemy/roster 证据、测试 |
| S3 Damage | `codex/damage-recovery` | 命中/伤害/暴击/技能数值的客户端证据与 server boundary | 公式证据清单、可恢复字段、不可证明边界、probe/tests |
| S4 Quest/NPC | `codex/quest-runtime-binding` | Quest/NPC/Dlg/Tdg/map entity/dispatcher 的运行时 binding | NPC/Quest → entity/trigger/condition/reward/recruitment 证据链 |
| S5 Visual | `codex/visual-fidelity` | ANI timing、命中/死亡、MagicRes/FOCUS、遮挡、音频 | 视觉/动画/音频证据与 parser/probe/tests |

### 5.3 第一波禁止争抢的共享文件

S1–S5 默认**不得修改**：

- `Plan.md`
- `Backlog.md`
- `AGENTS.md`
- `docs/evidence-ledger.md`
- `web/src/scene.ts`
- `web/src/main.ts`
- `web/src/battle.ts`

若发现运行时必须改某个共享文件：

- 先把所需改动写进自己独有的 `docs/integration-notes/<session>.md`；
- 只提交数据模型、probe、manifest 或独立 module；
- 由 S6 统一接入共享运行时。

每个 Session 推荐文件范围：

- `tools/probe_*` / `tools/convert/*` 中自己独立的工具；
- `tests/` 中对应 parser/probe tests；
- `docs/systems/<独立主题>.md`；
- `docs/integration-notes/<session>.md`；
- `manifests/<独立主题>.json`；
- 必要时新增独立 TypeScript 数据/model 文件，但不改核心 scene/main/battle orchestration。

### 5.4 S1 Encounter 验收

必须：

- 从 fixed-hash 2.2 证据出发，不建立猜测型 `fieldMapId -> battleMapId` 全局表；
- 继续追 `49/21/01 + object word`、`08 + word`、opcode `0x98` battle entry 之间的调用/状态链；
- 检查 Dlg/Tdg、Quest/NPC、地图/对象数据是否能提供 concrete binding；
- 输出“已证明的 binding / 未证明的 binding / 明确 server-session boundary”；
- 若能得到具体 map/event → battleZone，只收录有地址/记录/资源交叉证据的行。

### 5.5 S2 Enemy AI 验收

必须：

- 基于已经恢复的 AI grammar/chooser，不重复证明已有事实作为主要交付；
- 重点绑定 battle roster/unit record 到 AI 字符串/override，确认具体敌人实例使用什么程序；
- 继续恢复 `AREA/SOILDER` target policy、tie-break 和移动/攻击位置偏好；
- 区分客户端 autonomous AI 与 server-driven command；
- Web 训练敌人在 binding 未闭环前不得改名为 original AI。

### 5.6 S3 Damage 验收

必须：

- 复核 `6A/82` action request、absolute HP consumer、miss-like presentation path；
- 系统整理 `ability.atr`、`itemtbl.atr`、技能/魔法资源中的 accuracy/evasion/critical/damage/defence 字段；
- 搜索是否存在可独立证明的本地预览/辅助算法，但不得把 server-boundary 字段拼成“看起来合理”的公式；
- 最终允许结论是“exact retail formula 不可由现有客户端恢复”，但必须留下未来可用的封包/录像/动态反推输入规范。

### 5.7 S4 Quest/NPC 验收

必须：

- 不再把 `NPC350.Tip` 当 placement/behavior 表；它已确认是图像 sprite library；
- 主攻 Quest/NPC dispatcher、Dlg/Tdg、地图实体、条件/奖励/招募调用链；
- 恢复 ID ↔ entity/trigger/condition/reward/recruitment 的有证据 binding；
- Quest 静态 token 在无调用链前不得被扩写为完整运行时语义；
- 原对白/版权正文仍不得提交 Git。

### 5.8 S5 Visual 验收

必须：

- 恢复 ANI timing 的单位/消费路径，而不是仅播放“看起来差不多”的速度；
- 继续命中时序、受击、死亡表现、MagicRes/FOCUS placement/blend/阶段转换；
- 调查 foreground occlusion 与音效触发/资源映射；
- 每个视觉结论必须有静态记录、帧/像素检查或独立人工验证方法；
- 尽量把改动留在 parser/probe/独立数据层，运行时接入交给 S6。

### 5.9 第二波：S6 Runtime Integration

分支：`codex/runtime-integration`

启动条件：S1–S5 已合并 main，或用户明确批准跳过某个仍在阻塞的第一波 PR。

S6 是第一阶段唯一允许集中修改 `web/src/scene.ts`、`web/src/main.ts`、`web/src/battle.ts` 等共享运行时的 Session。

目标：

- 把第一波 VERIFIED / RECOVERED_SECONDARY 数据接入 Web；
- 将 encounter、battle scene、enemy AI、damage policy、Quest/NPC、visual timing 通过数据驱动接口组合；
- 保留所有未知项状态标签；
- 完成 field → encounter → battle → return 的真实来源优先可玩切片；
- 补充 unit + Chromium E2E。

### 5.10 第三波：S7 Release Validation

分支：`codex/release-validation`

S7 不开发新玩法，只做验收和必要的测试修复：

- fixed-hash 2.2 private-original smoke；
- standalone single HTML；
- Chromium browser/offline tests；
- 人工式逐步试玩；
- 人物/地图/战斗/特效视觉 spot-check；
- 需要时重新跑 30 分钟真实墙钟 soak；
- 检查版权资源没有误进 Git；
- 检查 `UNVERIFIED` 没有被误标成 recovered/original；
- 形成最终 validation report。

### 5.11 PR 合并协议

- S1–S5 PR 原则上可按完成顺序独立合并，因为共享文件已经冻结。
- 每次合并前检查目标 PR 是否落后 `main`；必要时先更新分支并解决自己的冲突。
- 如果两个 PR 意外修改同一公共文件，不在其中一个 PR 里“顺手吞并”另一个 Session；拆出公共改动，延后给 S6/协调 Session。
- 第一波最后一个 PR 合并后，所有旧 Session 停止继续向原分支追加共享运行时改动。
- S6 从第一波全部收口后的最新 `main` 新建。
- S7 从 S6 合并后的最新 `main` 新建。
- `Plan.md`、`Backlog.md`、`docs/evidence-ledger.md` 的阶段性总状态由协调 Session 统一更新，避免五个 Session 反复冲突。

---

## 6. 质量与自动化

必须持续通过：

- Python parser/probe tests（含 SPR relative-span、ANI、Quest、Tip、battle evidence 等）。
- TypeScript typecheck/unit tests/build。
- Chromium E2E 和单 HTML 离线测试。
- field/battle 状态转换、行动槽消费/恢复、战斗退出返回 field 的自动回归。
- fixed-hash private-original smoke：先校验安装包 SHA-256，再只做静态展开/转换。
- 真实资源重大检查点做 wall-clock soak；普通逻辑测试不能冒充。
- 人物/地图/战斗视觉语义重大变更必须安排人工 spot-check。

CI 不运行原安装器、`NeoDark.exe`、未知 DLL、兼容注入或 Frida 组件。

---

## 7. 文档职责

- `AGENTS.md`：项目执行/安全/分支控制。
- `Plan.md`：路线、门禁、实时状态与并行开发契约。
- `Backlog.md`：具体任务。
- `docs/evidence-ledger.md`：阶段合并后的权威证据索引，由协调 Session 统一维护。
- `docs/systems/`：各考古主题独立结论。
- `docs/integration-notes/`：S1–S5 留给 S6 的运行时接入要求。
- `docs/validation/`：自动与人工验收记录。
- `docs/decisions/`：重大架构决策。
- `manifests/`：固定输入/输出指纹与结构化证据。

---

## 8. 维护规则

1. 实质检查点完成时同步更新 Plan/Backlog，但并行第一波由协调 Session 汇总，不让 S1–S5争抢公共文件。
2. 分开报告：本地成功、CI 成功、浏览器成功、人工视觉成功、历史玩法证据、原版运行时证据；禁止互相替代。
3. 不写无依据完成百分比。
4. ref 更新只做非 force 快进；功能改动走独立分支/PR。
5. Windows VM 未就绪不阻止 Web、解析、测试和静态考古。
6. 真正阻塞时记录缺失输入/能力、已尝试方法和最小人工动作。
7. 不声称后台继续开发；只有已经启动的 CI/自动任务可以描述为运行中。
8. 不把私有 GitHub 仓库等同于可公开分发原版版权资源。

---

## 9. 变更记录

- 2026-09-14 v1.1：M0 基线与 Windows/Godot 路线。
- 2026-09-15 v2.0：用户批准 Web-first；Windows VM 仅用于原版行为考据。
- 2026-09-15 v2.1：建立 Web 诊断/训练、锁文件、CI、离线 HTML、哈希和存档。
- 2026-09-15 v2.2：关闭 G2-Web 工程门禁；加入地图0001、MagicRes 与最小 NPC→地图→任务→存档闭环。
- 2026-09-15 v2.3：恢复 Quest.lib/NPCScript/Quest0–9，建立 source-backed 内容层。
- 2026-09-15 v2.4：完成 Tutorial/Help/Neohelp/Prologue 与 Tip 静态结构；30 分钟真实墙钟 soak 通过；SPR span 与方向修复进入人工门禁。
- 2026-09-15 v2.5：依据同期资料纠正为 field/battle 分离 + 行动槽战术模式，并完成视觉叠层校准。
- **2026-09-16 v2.6：PR #4/#5 收口；恢复 readiness 成本模型、retail AI grammar/chooser、battle-entry 与 absolute-HP server boundary；用户批准 S1–S5 并行考古 → S6 统一运行时整合 → S7 发布验收的多 Session 开发模式，并冻结第一波共享文件以降低 PR 冲突。**

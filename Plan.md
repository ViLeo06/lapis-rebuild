# 《佣兵传说》复刻项目计划

> 版本：v2.4｜更新：2026-09-15｜Web-first  
> 用途：个人怀旧、研究、非商业复刻。第一优先级：剑士、巫师。  
> 执行规则：`AGENTS.md`；任务：`Backlog.md`；证据：`docs/evidence-ledger.md`。

## 0. 当前状态

### 0.1 当前检查点

主线保持 **Vite + TypeScript + Phaser + Python 静态转换工具链**。Godot 工程只保留参考，不继续双线开发。

- `main` 已合并 PR #2（Web-first/G2/M3 基线）和 PR #3（2.2 安装包归档登记）。
- 当前集成 PR：**Draft PR #4 / `codex/m3-content`**。
- M0/G0：完成。安装包、精确 7z payload、全量静态展开、哈希和主要解析器均可复现。
- M1：核心通过。ANI/SPR/SGR/MMF/SMF/IMF/Set.lib/Quest.lib/Tip 已形成静态解析链；音频、UI、字体等继续收口。
- M2/G2-Web：工程门禁已通过，但首轮人工视觉验收发现两个自动测试未覆盖的语义问题；已修复并由真实 2.2 资源重新生成、Chromium 回归通过，仍需用户对 v2 人工包做视觉复核。
- M3：双地图、剑士/巫师、训练战斗、各 3 技能、装备、结算、存档、NPC→地图→任务工程闭环均已存在。真实 Quest/NPC 静态内容已进入私有 pack 诊断层，但原版运行时绑定仍未恢复。
- **30 分钟真实墙钟 Web soak 已完成并通过**：run `34969057806`。这证明当时检查点的持续运行稳定性，不代表原版行为语义正确。

### 0.2 首轮人工验证发现并已修复

用户在真实离线 HTML 上直接发现：人物图像被水平切开/错位，以及人物朝向与移动方向相反。两项均为真实缺陷，不是浏览器显示问题。

**SPR 解码修复**

旧解析器把每个 row span 的首个 `uint16` 当成绝对 x。真实 B100/B109 多 span 行证明它实际是从上一 opaque run 末端开始计算的 **transparent skip**：

`x = previous_run_end + transparent_skip`

例如真实 B100 walk 行出现 `[[13,1],[1,32]]`；按绝对 x 会大面积覆盖，按相对 skip 则得到连续、合法的人物轮廓。修复后剑士/巫师真实帧不再出现原先的水平切片。

**ANI 方向修复**

真实 B100/B109 Body_ walk 帧的 raw row 视觉朝向已确认：

`0 S, 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE`

旧 Web 逻辑把 east→2、west→6，左右正好镜像。现已改为 east→6、west→2，并加入完整八方向回归测试。

修复分支真实资源 CI `34971954768`：synthetic 与 private-original 均成功，包含重新生成资源、构建、真实 Chromium 和离线 HTML 回归。

### 0.3 已验证基线

| 项目 | 当前结论 | 证据/范围 |
| --- | --- | --- |
| 安装包 | 470,688,152 bytes | SHA-256 `c42f37b...d6cdae88` |
| 精确 7z payload | 469,089,543 bytes | SHA-256 `9beb6066...e996357` |
| 静态展开 | 22,885 个普通文件 / 2,699,237,296 bytes | 不执行原客户端 |
| ANI | 6,948 个，固定 1,236 bytes | 8×32 槽，只读取每行 active prefix |
| SPR | 行游程 RGB565 + bounds | span 首字段现验证为相对 transparent skip |
| 双职业目标 | 20 阶段×5 动作，100 对 ANI/SPR | 严格解析与索引范围通过 |
| Body_ 方向 | `S,SW,W,NW,N,NE,E,SE` | B100/B109 真实帧人工/静态交叉检查 |
| SGR | 92/92 可解析 | 0 错误 |
| 地图 0000 | 对练场，1536×768；IMF 47×47 | Web 已接入 |
| 地图 0001 | 布日古斯_外城，2240×1280；IMF 69×79 | Web 已接入 |
| MagicRes | 001/002/003/035/036/037/038 可顺序诊断播放 | FOCUS placement/timing/blend 仍 UNVERIFIED |
| Quest.lib | 21,205 bytes；15/15 members | 固定哈希，静态提取 |
| NPCScript | 39 NPC blocks / 125 active / 5 disabled | 声明数量全部对齐 |
| Quest0–9 | 10 files / 42 STEP / 179 dialogue commands | token 结构严格解析 |
| Tutorial | 42 TALK blocks / 173 text records | NAME/NEXT/NOTCLOSE/RGB/BR/DRAWTOP 等结构已解析 |
| HelpScript | 5 HELP / 14 STEP / 30 四整数记录 | 静态结构已解析 |
| Neohelp | 18 sections / 336 records | 第三字段非负引用均落在已有 section ID 内，语义尚不外推 |
| Prologue | 19 structural rows / 17 non-empty text rows | 静态结构已解析 |
| Tip | 27/27 文件严格闭合，3547 frames | `tools/convert/tip.py` + 全量验证 |
| NPC350.Tip | 图像 sprite library；3000×1125，50×(300×225)，10×5 | **不是** NPC placement/behavior 表 |
| Source-backed Web | 私有 pack 从固定 Quest.lib 生成 Quest/NPC JSON | 正文不提交 Git |
| 浏览器稳定性 | 30 分钟真实墙钟 soak 成功 | run `34969057806` |
| 修正后浏览器回归 | synthetic + private-original 成功 | run `34971954768` |

### 0.4 当前未完成

- 用户对 **人工验证版 v2** 再次检查人物完整性、八方向移动和脚底锚点；自动测试不能替代视觉验收。
- Quest/NPC 与地图实体、坐标、触发点、条件分支、奖励、招募等原版运行时绑定尚未恢复。
- 当前训练敌人、战斗数值、M3 引导员和任务流程仍为显式 `UNVERIFIED` 工程占位。
- MagicRes/FOCUS 的原版 placement、blend、阶段衔接、timing；音效、死亡表现、前景遮挡仍需恢复。
- 完整背包/装备、成长/转职、正式任务链、更多地图流程仍未完成。
- 公开 Web 预览的访问控制/版权审查未完成，原版资源不得擅自公开部署。
- 若静态证据无法恢复关键行为，M4 需要隔离、可回滚 Windows VM；普通环境与 CI 禁止执行原始 `NeoDark.exe` 或未知 DLL。

### 0.5 下一步

当前优先级：

1. 收口人工视觉修复并让用户验证 v2 离线 HTML。
2. 将修复快进集成回 `codex/m3-content` / PR #4；不自动合并 `main`。
3. 继续静态追踪 Quest/NPC dispatcher、地图 placement 与 trigger 数据来源，必要时对固定 `NeoDark.exe` 做纯静态反汇编/交叉引用。
4. 在证据充分后，用真实 NPC/Quest ID 和触发关系逐步替换 `m3-guide`，而不是把静态对白强行绑定到地图。
5. 同步继续音频、遮挡层和 MagicRes placement/timing 考据。

---

## 1. 项目目标

### 1.1 实施路线

**证据固化 → 资源转换 → Web 诊断 → Web 可玩切片 → 行为校准 → 核心系统 → 双职业完整化 → Web 发布 → 可选联网**

终端用户目标是打开现代浏览器即可体验；不要求安装原 Windows 客户端、Godot、Node、Python 或 VM。私人单文件 HTML 作为当前最快的人机联合验收载体。

### 1.2 MVP 验收

1. 浏览器启动并选择剑士/巫师。
2. 至少一张安全/测试地图和一张战斗区域。
3. 待机、移动、方向、攻击、受击、施法、死亡表现；未知项明确标注。
4. 每职业普通攻击和至少 3 个代表技能；敌人、伤害、死亡、结算形成闭环。
5. NPC 对话、地图切换、基础背包和装备。
6. IndexedDB 存读档，JSON 导入导出作为可迁移备份。
7. Debug Panel 可检查角色、动作、方向、帧、bounds/anchor、地图坐标与通行数据。
8. 可重复构建、固定输入指纹、实际 Chromium 回归、真实墙钟稳定性验证和人工视觉复核。

仅有自动测试、按钮或占位训练逻辑，不足以宣布原版还原正确。

### 1.3 V1 验收

剑士 B100–B190、巫师 B109–B199 各十阶段，从初始阶段正常成长到最高阶段：外形、动作、属性、主要技能树、装备适配、升级/转职、代表任务、地图、音频、设置和存档恢复。按职业矩阵逐项验收。

### 1.4 暂缓范围

第三职业、大规模全部原作内容；公网账号、充值、交易、运营后台；与未知第三方服务器互通；原生移动 App/主机；Windows-first 发行；未经授权公开散布原资源。PWA/桌面封装只作为未来发行选项。

---

## 2. 技术与资产边界

- 主运行时：Phaser + TypeScript；Vite 构建；HTML/CSS 调试 UI。
- Python >= 3.12：静态提取、ANI/SPR/SGR/MMF/SMF/IMF/Set.lib/Quest.lib/Tip 解析、转换和验证。
- 浏览器消费 PNG/JSON/适配音频；不执行原 EXE/DLL，不在前端存密钥。
- 当前锁定依赖以 `web/package-lock.json` 为准。
- GitHub 私有仓库只保存代码、文档、工具、结构、哈希、测试和少量合成样本。
- 原安装包、完整展开、大量派生美术/音频和原始对白保存在私有归档/短期 CI artifact，不进入 Git。
- `web/public/game-data/` 与 `game/generated/` 默认 gitignore。
- 改动先功能分支/PR；未获明确批准不合并 `main`。

---

## 3. 证据规则

`VERIFIED`：固定哈希、严格解析、全量验证、像素/帧检查、静态反汇编或隔离环境重复实验直接支持。

`INFERRED`：有较强线索但语义仍需进一步证实，例如部分动作槽名称、兼容代码代表旧客户端行为。

`UNVERIFIED`：为推进原型暂用的设计替代，例如移速、动画毫秒值、训练战斗、M3 引导任务。

约束：

- 获得新证据后更新 `docs/evidence-ledger.md` 和回归测试。
- ANI raw timing 不自动当毫秒/FPS；`_05` 不统一当死亡。
- FOCUS 不套用 Body_ 八方向规则。
- 当前已确认的 Body_ raw direction row 只用于 B100/B109 等同类角色资源；若发现其他 layer family 不一致，单独记录。
- 锚点使用 SPR bounds；人物视觉连续性还需人工回归，不因数学边界合法就宣布正确。
- Quest 文件 token 只按文件事实解释；无调用链/行为证据时，不外推其游戏语义。
- 私有原作正文只在构建时派生，不提交 Git。

---

## 4. 里程碑与门禁

| 里程碑 | 交付 | 状态 |
| --- | --- | --- |
| M0 基线 | 固定样本、哈希、静态拆包 | **G0 通过** |
| M1 资源 | 双职业、地图、技能、内容容器与格式转换 | **核心通过，持续收口** |
| M2 Web 诊断 | 地图0/1、B100/B109、逐帧/方向/碰撞/Debug/离线HTML | **工程通过；人工视觉复核 v2 进行中** |
| M3 Web 可玩切片 | 移动→战斗→结算→NPC/地图→存档；真实内容层；稳定性 | **工程闭环和30分钟 soak 已完成；原版绑定未完成** |
| M4 行为校准 | 输入、移动、时序、伤害、UI、任务触发 | 静态考据中；动态 VM 未开始 |
| M5 核心系统 | 实体、战斗、技能、成长、任务、背包、存档迁移 | 未完成 |
| M6 双职业完整化 | 十阶段职业矩阵 | 未开始 |
| M7 Web 发布 | 内容、性能、兼容、访问控制、版权、回滚 | 未开始 |
| M8 可选联网 | 单机稳定后的独立权威服务端 | 暂缓 |

门禁：

- **G0：已通过。**
- **G1：核心通过。** 目标职业资源和至少一张地图可确定性转换。
- **G2-Web：工程自动化已通过；人工视觉语义重新验收中。** 首轮人工验证成功捕获并修复 SPR span 和方向映射缺陷，因此以后 G2 维护必须包含人工 spot-check。
- **G3：尚不宣布通过。** 虽然可玩工程闭环和 30 分钟 soak 已完成，但当前关键 NPC/任务仍是训练占位，且修正后人物需用户复核。
- **G4：**关键行为有可信证据或明确接受的正式替代。
- **G5：**双职业矩阵完成或批准例外；否则不称 V1。
- **G6：**公开发布前完成访问控制、版权、构建检查并取得发布授权。

---

## 5. 当前阶段任务

### M1 持续收口

维护 100 对目标 ANI/SPR、92 SGR、Set.lib/Quest.lib、27 Tip、地图与 MagicRes 全量回归。继续音频/UI/字体、资源索引和 MagicRes/FOCUS 语义考据。解析器遇到损坏输入必须显式报错，不静默修补。

### M2 人工诊断

离线单 HTML 是当前人工验证主载体。每次重大角色/地图/特效解析变化后至少验证：人物完整性、八方向朝向、动作帧顺序、脚底锚点、地图遮挡和技能 placement。自动 E2E 负责“能运行”，人工检查负责“看起来/运动语义正确”，两者不能互相替代。

### M3 可玩切片

保留当前训练闭环，但逐步用有来源的真实内容替换占位：NPC/Quest ID、触发条件、位置、分支、奖励。静态文本存在不等于知道运行时绑定。采用 WASD/点击控制也不等于已恢复原版输入。

### M4 行为校准

优先继续纯静态考古。若必须动态运行原客户端，只允许一次性 Windows VM/快照，不使用真实密码、不挂载敏感目录、不绕过认证、不攻击第三方服务。

---

## 6. 质量与自动化

必须持续通过：

- Python parser tests（含 SPR relative-span、ANI、Quest、Tip 等）。
- TypeScript typecheck/unit tests/build。
- Chromium E2E 和单 HTML 离线测试。
- fixed-hash private-original smoke：先校验安装包 SHA-256，再只做静态展开/转换。
- 真实资源重大检查点做 30 分钟 wall-clock soak；普通逻辑测试不能冒充。
- 人物/地图视觉解析重大变更必须安排人工 spot-check。

CI 不运行原安装器、`NeoDark.exe`、未知 DLL、兼容注入或 Frida 组件。

---

## 7. 文档职责

- `AGENTS.md`：项目执行/安全/分支控制。
- `Plan.md`：路线、门禁、实时状态。
- `Backlog.md`：具体任务。
- `docs/evidence-ledger.md`：事实证据。
- `docs/validation/`：自动与人工验收记录。
- `docs/decisions/`：重大架构决策。
- `manifests/`：固定输入/输出指纹。

---

## 8. 维护规则

1. 实质检查点完成时同步更新本文件状态和对应 Backlog。
2. 分开报告：本地成功、CI 成功、浏览器成功、人工视觉成功、原版行为证据；禁止把其中一个替代另一个。
3. 不写无依据完成百分比。
4. ref 更新只做非 force 快进；不自动合并 `main`。
5. Windows VM 未就绪不阻止 Web、解析、测试和静态考古。
6. 真正阻塞时记录缺失输入/能力、已尝试方法和最小人工动作。
7. 对话结束后不得声称仍在后台开发；只有明确已启动的 CI/自动任务可以描述为运行中。

---

## 9. 变更记录

- 2026-09-14 v1.1：M0 基线与 Windows/Godot 路线。
- 2026-09-15 v2.0：用户批准 Web-first；Windows VM 仅用于原版行为考据。
- 2026-09-15 v2.1：建立 Web 诊断/训练、锁文件、CI、离线 HTML、哈希和存档。
- 2026-09-15 v2.2：关闭 G2-Web 工程门禁；加入地图0001、MagicRes 与最小 NPC→地图→任务→存档闭环。
- 2026-09-15 v2.3：PR #2/#3 合并 main；恢复 Quest.lib/NPCScript/Quest0–9，建立 source-backed 内容层。
- **2026-09-15 v2.4：完成 Tutorial/Help/Neohelp/Prologue 与 Tip 静态结构；30 分钟真实墙钟 soak 通过；首轮人工验收发现 SPR span 与方向映射问题并完成真实资源修复，新增人工视觉门禁。**

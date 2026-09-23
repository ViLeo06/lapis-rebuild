# AGENTS.md

本文件定义 `lapis-rebuild` 中 AI Agent、Codex/Work、自动化脚本和人工协作者的项目级执行规则。

> 项目：`ViLeo06/lapis-rebuild`  
> 路线：**Web-first**  
> 第一优先级：剑士、巫师  
> 主计划：[`Plan.md`](./Plan.md)

## 1. 总原则

1. `Plan.md` 是路线、门禁和实时状态的单一主计划；实质进展必须同步。
2. 默认持续推进低风险、可逆工作，不因 Windows VM 未准备、部分行为未知或非关键格式未完而停下。
3. 证据优先：原版事实、推断和临时设计严格区分。
4. 自动测试证明“工程可运行”不等于证明“视觉/运动语义正确”；人物、地图、特效重大变化必须安排人工 spot-check。
5. 不为了架构而架构；优先最小、成熟、可验证方案。
6. 第一阶段目标是高质量、可调试的浏览器可玩闭环，而不是完整 MMO。

## 2. 技术路线

主运行时：

- Vite
- TypeScript
- Phaser
- HTML/CSS 调试 UI

Python 3.12 负责：安装包静态拆解、旧格式解析、资源转换、数据清洗、索引和验证。

浏览器优先消费 PNG/JSON/适配音频。现有 `game/` Godot 工程仅作历史参考，除非新的 `docs/decisions/` 明确改变架构，不恢复为主线。

## 3. 状态与文档同步

以下变化必须更新 `Plan.md -> 0. 当前状态`：

- 里程碑/门禁变化
- 新的格式结论或旧结论被推翻
- 关键阻塞出现/解除
- 当前下一目标变化
- 影响 MVP/V1 的范围变化
- 人工验收发现会影响原版还原度的缺陷

同时按职责更新：

- `docs/evidence-ledger.md`：证据等级和复现范围
- `docs/client-analysis.md`：客户端/格式静态分析
- `docs/validation/`：自动/人工验收记录
- `Backlog.md`：具体任务
- `docs/decisions/`：重大架构决策

禁止只把关键知识留在聊天记录。

## 4. 证据等级

### VERIFIED

由固定哈希、严格解析、全量样本、像素/帧检查、静态反汇编、可重复实验等直接支持。

### INFERRED

证据较强但仍包含语义推断，例如部分动作槽名或兼容代码与旧客户端行为的对应。

### UNVERIFIED

为了推进原型而采用的临时策略，例如移动速度、动画毫秒值、训练伤害、占位 NPC/任务。

规则：

- 不得把 INFERRED/UNVERIFIED 写成原版 VERIFIED 事实。
- 临时参数集中管理，不散落硬编码。
- 新证据到来后更新 evidence ledger 并增加回归测试。

## 5. 原客户端安全边界

普通开发环境、宿主机、CI/GitHub Actions **禁止执行**：

- 原安装器
- `NeoDark.exe`
- 未知 DLL
- Frida/注入组件
- 来源不明可执行文件

默认只做静态读取/解包/反汇编。

如确需动态行为考据：使用一次性、可回滚 Windows VM，先快照，不使用真实账号密码，不挂载敏感目录，只做最小被动观察，不绕过认证，不攻击/扫描第三方服务器。

## 6. Git / PR 规则

仓库：`ViLeo06/lapis-rebuild`。

- 不直接向 `main` 提交。
- 功能分支开发，通过 PR 集成。
- 未经负责人明确批准不合并 `main`。
- 当前阶段：**M7 Combat Content Expansion 已完成工程与用户试玩验收并合并 main**。执行计划为 `Plan.md v3.7`；稳定基线为 `main@6094aae3c4ff0a04af5dd4376f2b59b8b342d430`。下一里程碑尚未启动，必须从该 main 新建功能分支；已关闭的 S30–S34 worker 分支仅作历史证据，不继续追加共享运行时改动。
- 临时诊断/修复分支可使用 `codex/*`；验证后只做非 force 快进/正常 PR 集成。
- 同一路径修改前读取最新 blob SHA，避免覆盖并发更新。
- commit 保持小而清楚：`feat/fix/test/docs/refactor/chore`。

## 7. 资产和版权

Git 保存：代码、文档、解析器、结构化数据、测试、哈希、清单、少量合成/合法样本。

私有 Drive / CI 短期 artifact 保存：原始安装包、完整展开、大量美术/音频、批量派生资源、原始对白正文。

禁止把密码、token、cookie、临时签名下载 URL 或个人敏感信息写入 Git。

未经单独批准：不公开部署含原版版权资源的 Web，不公开分发原客户端/批量原素材，不假定私有仓库意味着静态站点也私有。

## 8. Web-first 与人工验证

Debug Panel 是核心研发工具，早期不得为“界面简洁”删除。至少应能查看角色/资源 ID、动作槽、raw direction row、当前帧、ANI raw timing、bounds/anchor、像素/地图坐标、IMF raw value、walkable、tile/resource ID（可可靠取得时）以及证据标签。

**人工视觉门禁新增规则：**

- 角色像素解码、方向映射、anchor/bounds、地图 z-order/遮挡、MagicRes placement 等视觉语义变化，不能只依赖 E2E。
- 每次相关重大变更后生成私人离线 HTML，至少人工检查剑士/巫师八方向、站立/走路/攻击切换和明显切片/抖动。
- 用户截图/手感反馈属于高价值验证输入；若与自动测试冲突，先把问题当真实缺陷调查，不用“CI通过”否定人工观察。

## 9. 当前已验证事实，禁止回退

### 客户端

- 2.2 安装包：470,688,152 bytes。
- SHA-256：`c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88`。
- 精确 7z payload：SHA-256 `9beb606655d2553c03e80d7eda36a48c135976a3812ce5432d3b2af23e996357`。
- 静态展开：22,885 普通文件，约2.699 GB。

### SPR

- `uint32 frame_count` + `<4i>` bounds；right/bottom exclusive。
- 每帧行游程 RGB565，未覆盖像素透明。
- **每个 span 首 `uint16` 是相对上一 opaque run 末端的 transparent skip，不是 absolute x。**
- 正确行解码：`x = cursor_x + skip; draw; cursor_x = x + count`。

### ANI / Body_

- 当前全部 `.ani` 1,236 bytes；方向表 `uint32[8][32]`；只读每行前 `frames_per_direction` 个 active slot；其余可能 stale。
- raw timing 单位未验证。
- 已检查 B100/B109 `Body_` raw direction row：`0 S,1 SW,2 W,3 NW,4 N,5 NE,6 E,7 SE`。
- 该方向顺序不外推到 `FOCUS`。

### 目标职业

- 剑士：100,110,120,130,140,150,160,170,180,190。
- 巫师：109,119,129,139,149,159,169,179,189,199。
- 20 阶段 × `_00/_01/_02/_03/_05` = 100 对 ANI/SPR，结构和 active index 通过验证。

### 地图 / 内容

- 92/92 SGR 可解析。
- 地图0对练场独立渲染曾与参考实现逐像素一致；地图1布日古斯外城已接入 Web。
- MMF selector `(packed>>23)&0x3f` 为直接 `resource_id`。
- 不得把坐标 helper 推广为任意像素全局互逆。
- Set.lib 12 members 可确定性提取。
- Quest.lib 15 members 可确定性提取；NPCScript/Quest/Tutorial/Help/Neohelp/Prologue 已有结构解析。
- 27/27 `.Tip` 可严格解析，共3547帧；`NPC350.Tip` 是图像 sprite library，不是 NPC placement 表。
- `FOCUS` 不套用 `Body_` 八方向语义。

## 10. 测试与 CI

修改解析器：运行 synthetic parser tests，并在可用时用 fixed-hash 私有原资源做全量/目标 smoke。

修改 Web：至少 typecheck、unit tests、production build、Chromium E2E、离线单 HTML。

关键检查点：真实 30 分钟 wall-clock soak 与快速逻辑测试分别记录；不能互相冒充。

任何测试失败必须修问题或有证据地拆分，不允许删除覆盖项制造 green CI。

CI 永远不运行原 Windows 客户端。

## 11. 自主推进与停止条件

默认可自主：读取仓库、功能分支代码/文档、测试、CI、私有派生数据、Plan/Backlog/evidence 更新、Draft PR 更新。

必须停下来确认：

- 合并 `main`（除非用户已对该具体合并明确授权）
- 公开发布/把私有版权资源上公网
- 删除/覆盖不可恢复数据
- 权限变更、付费
- 非隔离环境运行原客户端/未知二进制
- 证据无法决定且多个方案会显著改变正式玩法

不构成停止理由：Windows VM 未准备、某些 timing 未考据、非 MVP 格式未完、Drive 镜像尾项未完成。使用明确的 INFERRED/UNVERIFIED 标签继续独立工作。

## 12. 每次任务结束前检查

- 是否更新了 Plan 状态？
- 是否把新事实写入 evidence ledger/client analysis？
- 是否补了可重复测试？
- 是否区分了自动工程测试和人工视觉验收？
- 是否避免把临时玩法包装成原版？
- 是否保持 main/公开发布/原客户端执行边界？
- 是否记录下一步和真实阻塞？

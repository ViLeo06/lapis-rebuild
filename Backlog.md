# Backlog

> 2026-09-15 | Web-first | Plan v2.3 | codex/m3-content | Draft PR #4

## 已合并基线

- [x] PR #3：YBCS 2.2 安装包分卷归档登记，已合并 main。
- [x] PR #2：Web-first G2 与 M3 训练闭环，已合并 main。
- [x] Vite/TypeScript/Phaser、真实资源生成、双地图、B100/B109、MagicRes 诊断、训练战斗、装备、存档、离线 HTML。
- [x] M3 工程占位任务 `0000 → 0001 → 0000 → complete` 通过真实资源浏览器回归；始终标记 `UNVERIFIED`。

## M3 / 当前主线：真实内容来源

- [x] 静态扫描定位 `NRes/Quest.lib`、`NRes/NPC350.Tip` 及 Dlg/Tdg 候选。
- [x] `Quest.lib` 证实可使用现有 `.lib` 解密 + PKWARE DCL 链完整提取，15 个成员。
- [x] 固定 Quest.lib、NPC350.Tip 和 15 个 Quest.lib 成员的 SHA-256：`manifests/content-source-baseline.json`。
- [x] `NPCScript.txt` 语法恢复：39 个 NPC 块、125 个 active records、5 个 disabled records，声明数全部一致。
- [x] Quest0–Quest9 语法恢复：10 文件 / 42 STEP / 179 对话命令；保留 `CANCEL/SELECT/SCRIPT` 原始 token，不猜运行时含义。
- [x] 新增 `tools/convert/quest_content.py`、synthetic parser tests、`tools/validate/validate_quest_content.py`。
- [x] 私有 Web pack 构建时直接从固定 Quest.lib 生成 source-backed Quest/NPC JSON；原对白正文不进 Git。
- [x] Web 资源加载层校验 source-backed content；新增诊断内容面板和 synthetic content fixture。
- [ ] 当前代码通过 synthetic CI + private-original CI 后，固定本阶段浏览器检查点。
- [ ] 将可确认的原始 Quest/NPC 数据映射到地图实体/触发条件；在证据不足前不替换为猜测。
- [ ] 解析 Tutorial/HelpScript 的标签/步骤语法，区分 UI 教学和普通 Quest。
- [ ] 逆向 `NPC350.Tip` 二进制结构；目前仅有文件级证据，不声称 record layout。
- [ ] 继续检查 Dlg/*.Tdg 中与剧情/warp/message 相关的运行时内容。

## G3 稳定性

- [ ] 完成真正 30 分钟真实墙钟 Web soak；必须运行派生 Web 预览，不以模拟时钟或短 E2E 冒充。
- [ ] soak 同时覆盖 B100/B109、两地图、动作/方向、MagicRes、overlay 和 source-backed content 资源加载。
- [ ] 通过后更新 Plan / evidence ledger；未通过则先修故障再重跑。

## M4 / 原版行为校准

- [ ] ANI timing、命中时间、行动机制、技能效果、路径偏好。
- [ ] MagicRes/FOCUS 放置、混合、阶段衔接与 timing 单位。
- [ ] NPC/Quest 的地图触发、条件分支、奖励与 ID 绑定。
- [ ] 隔离 Windows VM 动态证据；不阻塞其他安全静态/Web 工作。

## 其他尾项

- [ ] 音效、原版死亡动画与前景遮挡。
- [ ] 完整成长、升级、技能树、任务链与地图流程。
- [ ] 公开部署前独立完成访问控制和版权审查。

## 边界

- PR #4 当前为下一阶段开发 PR；未经新的明确批准不自动合并 main。
- 原客户端仍不在普通环境/CI 执行。
- 静态源文本的存在不等于运行时触发语义已恢复。

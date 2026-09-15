# Backlog

> 2026-09-15 | Web-first | Plan v2.4 | `codex/m3-content` / Draft PR #4

## 已完成基线

- [x] PR #2 Web-first/G2/M3 基线已合并 main。
- [x] PR #3 2.2 安装包归档登记已合并 main。
- [x] Vite/TypeScript/Phaser、双地图、B100/B109、MagicRes诊断、训练战斗、装备、存档、离线单HTML。
- [x] M3 占位任务 `0000 → 0001 → 0000 → complete` 通过真实资源浏览器回归，始终标记 `UNVERIFIED`。
- [x] 真正 30 分钟墙钟 Web soak：run `34969057806` success。

## 人工验证 / 视觉正确性

- [x] 第一轮用户人工验证成功复现：剑士/巫师水平切片错位。
- [x] 确认 SPR span 首字段是相对 transparent skip，不是 absolute x；修复转换器并补 synthetic regression。
- [x] 第一轮用户人工验证成功复现：角色移动朝向左右镜像/倒着走。
- [x] 确认 B100/B109 Body_ raw direction row：`S,SW,W,NW,N,NE,E,SE`；修正 Web direction mapping 并补8方向测试。
- [x] 修正后 fixed-hash 2.2 private-original + synthetic CI：run `34971954768` success。
- [x] 生成人工验证版 v2 离线 HTML/ZIP。
- [ ] 用户复测 v2：人物是否仍切片、八方向朝向、脚底锚点、动作切换。
- [ ] 以后角色/地图/特效语义重大变化必须增加人工 spot-check，不以 green CI 代替。

## M3 / 真实内容来源

- [x] `Quest.lib` 15/15 members 静态提取。
- [x] `NPCScript.txt`：39 NPC blocks / 125 active / 5 disabled。
- [x] Quest0–9：10 files / 42 STEP / 179 dialogue commands。
- [x] 私有 Web pack 从固定 Quest.lib 生成 source-backed Quest/NPC JSON；正文不进 Git。
- [x] Tutorial：42 TALK blocks / 173 text records；控制 token 已结构化。
- [x] HelpScript：5 HELP / 14 STEP / 30 records。
- [x] Neohelp：18 sections / 336 records；引用范围做静态一致性检查。
- [x] Prologue：19 structural rows / 17 non-empty text rows。
- [x] `.Tip`：27/27 strict parse / 3547 frames；`NPC350.Tip` 已确认是 sprite library，不是 placement 表。
- [ ] 找到原始 `NPC → map → coordinate → Quest/Program` 绑定来源。
- [ ] 继续静态检查 Dlg/Tdg、NeoDark.exe xrefs、dispatcher/packet token；不执行原客户端。
- [ ] 只有在可证实 ID/trigger 关系后，才逐步替换 `m3-guide`。

## M4 / 行为校准

- [ ] ANI timing 单位、攻击/受击/施法前后摇、行动机制、路径偏好。
- [ ] MagicRes/FOCUS placement、blend、阶段衔接和 timing。
- [ ] NPC/Quest 的地图触发、条件分支、奖励、招募、ID绑定。
- [ ] 原版 UI/输入、死亡、音效和前景遮挡。
- [ ] 静态证据耗尽后，再准备隔离 Windows VM；不阻塞可继续的静态/Web 工作。

## M5+ 尾项

- [ ] 完整背包/装备规则、等级/转职、技能树、任务链和地图流程。
- [ ] 剑士/巫师十阶段职业矩阵。
- [ ] 公开部署前单独完成访问控制、版权和发布授权审查。

## 边界

- PR #4 继续作为阶段集成 PR；本轮只快进开发分支，不自动合并 `main`。
- 原安装器、`NeoDark.exe`、未知 DLL 不在普通环境/CI 执行。
- 静态文本存在不等于运行时触发语义已经恢复。

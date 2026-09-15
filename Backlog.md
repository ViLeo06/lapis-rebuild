# Backlog

> 2026-09-15 | Web-first | Plan v2.5 target | `codex/battle-mode-fix` | manual validation v3

## 已完成基线

- [x] PR #2 Web-first/G2/M3 基线已合并 main。
- [x] PR #3 2.2 安装包归档登记已合并 main。
- [x] Vite/TypeScript/Phaser、双地图、B100/B109、MagicRes诊断、装备、存档、离线单HTML。
- [x] M3 占位任务 `0000 → 0001 → 0000 → complete` 通过真实资源浏览器回归，始终标记 `UNVERIFIED`。
- [x] 真正 30 分钟墙钟 Web soak：run `34969057806` success。

## 人工验证 / 视觉正确性

- [x] 第一轮用户人工验证成功复现：剑士/巫师水平切片错位。
- [x] 确认 SPR span 首字段是相对 transparent skip，不是 absolute x；修复转换器并补 synthetic regression。
- [x] 第一轮用户人工验证成功复现：角色移动朝向左右镜像/倒着走。
- [x] 确认 B100/B109 Body_ raw direction row：`S,SW,W,NW,N,NE,E,SE`；修正 Web direction mapping 并补8方向测试。
- [x] 修正后 fixed-hash 2.2 private-original + synthetic CI：run `34971954768` success。
- [x] 用户复测 v2：人物切片和倒走问题均已改正。
- [x] 第二轮人工反馈：正常移动不应绘制路线指引线；已从常规画面移除。
- [x] 第二轮人工反馈：角色 SPR bounds/anchor 方框不应默认闪烁；已改成默认隐藏，仅 Debug Panel 手动开启。
- [ ] 用户复测 v3：正常移动画面、战斗切换、行动槽、战斗移动限制和退出战斗返回点。
- [ ] 以后角色/地图/特效/战斗语义重大变化必须增加人工 spot-check，不以 green CI 代替。

## M3 / 战斗架构纠正

- [x] 2003 同期资料交叉确认：原作存在独立的非战斗状态与战斗画面/战斗场景，二者状态 UI 和指令不同。
- [x] 同期资料确认：战斗不是普通实时砍杀；角色需等待 `行动槽` 蓄满后执行移动/攻击，随后再次等待，属于行动槽驱动的半回合/即时混合战术系统。
- [x] Web 原型拆分 `field` 与 `battle` 状态；进入战斗保存非战斗地图/锚点，退出后返回原位置。
- [x] 战斗 UI 增加行动槽；移动/攻击受行动槽门禁，普通地图移动不受战斗行动槽限制。
- [x] 战斗移动临时读取已知职业 move 基线：B100=5，B109=4；当前按“最多格数”解释为 `UNVERIFIED`，待运行时证据校准。
- [x] 战斗中锁定地图/角色切换、禁存档和非战斗任务交互；战斗命令只在 battle mode 出现。
- [ ] 找到真实 `field encounter / task NPC → battle scene` 映射来源，替换当前“进入战斗画面”研发按钮。
- [ ] 恢复原版战斗场景背景/地图选择、战斗单位 placement 和队伍/副官/龙兵实体，不以当前训练木桩冒充原作。
- [ ] 校准行动槽充能算法/速度、移动是否独占一次行动、攻击/技能行动成本、回合/即时交错规则。
- [ ] 校准可移动格显示、攻击范围、ESC/逃跑、胜利结束条件和加入他人战斗规则。
- [ ] 继续搜索可用原客户端源码/服务端实现；当前尚未找到可信公开原始源码仓库。

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

- 本轮变更留在 `codex/battle-mode-fix`；未经明确批准不自动合并 `main`。
- 原安装器、`NeoDark.exe`、未知 DLL 不在普通环境/CI 执行。
- 同期资料可证明战斗架构的大方向，但不能自动证明当前临时毫秒数、AI或数值就是原版实现。

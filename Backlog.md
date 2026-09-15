# Backlog

> 2026-09-16 | Web-first | Plan v2.5 target | `codex/battle-mode-fix` | manual validation v4

## 已完成基线

- [x] PR #2 Web-first/G2/M3 基线已合并 main。
- [x] PR #3 2.2 安装包归档登记已合并 main。
- [x] Vite/TypeScript/Phaser、双地图、B100/B109、MagicRes诊断、装备、存档、离线单HTML。
- [x] M3 占位任务 `0000 → 0001 → 0000 → complete` 通过真实资源浏览器回归，始终标记 `UNVERIFIED`。
- [x] 真正 30 分钟墙钟 Web soak：run `34969057806` success。
- [x] recovered-readiness v4 fixed-hash 2.2 private-original + synthetic smoke：run `35027023563` success；真实资源离线单 HTML 已重新生成。

## 人工验证 / 视觉正确性

- [x] 第一轮用户人工验证成功复现：剑士/巫师水平切片错位。
- [x] 确认 SPR span 首字段是相对 transparent skip，不是 absolute x；修复转换器并补 synthetic regression。
- [x] 第一轮用户人工验证成功复现：角色移动朝向左右镜像/倒着走。
- [x] 确认 B100/B109 Body_ raw direction row：`S,SW,W,NW,N,NE,E,SE`；修正 Web direction mapping 并补8方向测试。
- [x] 修正后 fixed-hash 2.2 private-original + synthetic CI：run `34971954768` success。
- [x] 用户复测 v2：人物切片和倒走问题均已改正。
- [x] 第二轮人工反馈：正常移动不应绘制路线指引线；已从常规画面移除。
- [x] 第二轮人工反馈：角色 SPR bounds/anchor 方框不应默认闪烁；已改成默认隐藏，仅 Debug Panel 手动开启。
- [x] v4 已切换到恢复出的 20 格行动环、满槽门禁、按行动类型扣点、离散 tick 回 1 点模型；500ms 继续标 `RECOVERED_SECONDARY`。
- [ ] 用户复测 v4：field→battle 感觉、20格行动槽等待节奏、移动/普攻/技能扣点、战斗返回点、整体是否更接近记忆。
- [ ] 以后角色/地图/特效/战斗语义重大变化必须增加人工 spot-check，不以 green CI 代替。

## M3 / 战斗架构与静态恢复

- [x] 2003 同期资料交叉确认：原作存在独立的非战斗状态与战斗画面/战斗场景，二者状态 UI 和指令不同。
- [x] 同期资料确认：战斗不是普通实时砍杀；角色需等待 `行动槽` 蓄满后执行移动/攻击，随后再次等待，属于行动槽驱动的半回合/即时混合战术系统。
- [x] Web 原型拆分 `field` 与 `battle` 状态；进入战斗保存非战斗地图/锚点，退出后返回原位置。
- [x] 战斗 UI 增加行动槽；移动/攻击受行动槽门禁，普通地图移动不受战斗行动槽限制。
- [x] 静态恢复行动槽核心：玩家 20 格环；只有满槽可行动；MOVE/ATTACK/REST authored cost=6/4/5；目标职业 magic rate=100 对 20 格环折算为 10；tick 每次 +1。500ms cadence 仍待动态确认。
- [x] 战斗移动读取已知职业 move 基线：B100=5，B109=4；“最大移动格”语义已有较强二级恢复依据，但仍需动态/更多原始 xref 校准。
- [x] Retail AI grammar/core chooser 已恢复：`ODNORMAL/ODATTACK/ODDEFENCE`、`REST/ATTACK/MAGIC`、默认 `ODNORMAL REST(20),ATTACK(80)`、`rand()%100`、三组 HP/MP 阈值、inclusive weighted compare。
- [x] 客户端伤害边界已确定：普通攻击 `6A/82` 请求不携带 damage；客户端消费 authoritative absolute HP。当前可判定 retail 精确伤害公式至少不在这条客户端 uplink 中。
- [x] Encounter transport 边界已恢复：近距离场景对象可发 `49/21/01` 请求；battle entry 独立从 session/downlink 获得 battle zone + 可选 grid geometry，然后加载 `sz-%04d.mmf`。
- [x] 原版 story battle scene 资源开始恢复：`sz-0001/0003/0007/0009/0011/0013/0015.lib` 的 `.SRF/.DEO/.DEE`、formation/recruit 结构已静态 catalog。
- [x] 战斗中锁定地图/角色切换、禁存档和非战斗任务交互；战斗命令只在 battle mode 出现。
- [ ] 恢复 **每个具体敌人/战斗 roster → AI program/override** 绑定；继续拆 `AREA/SOILDER` target selection、寻路/目标 tie-break。
- [ ] 搜索 retired server/私服服务端实现或协议实现，以恢复 exact hit/damage/critical formula；若无服务端证据，正式记录为 reconstruction policy 而不是伪造“原版公式”。
- [ ] 找到真实 `field encounter / task NPC → battle zone` 的 server predicate/映射来源；当前已确认 battle zone 由 session/downlink 提供，不能再假定有客户端通用 map→battle 公式。
- [ ] 恢复更多原版 battle zone 的 `.lib` story formations、队伍/副官/龙兵实体和 battle UI/placement。
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
- [x] `CombatMap.Tip` 与 battle/training map family 已做静态视觉比对；可证明选择 UI 资源族，不证明普通地图 encounter 映射。
- [ ] 找到原始 `NPC → map → coordinate → Quest/Program` 绑定来源。
- [ ] 继续静态检查 Dlg/Tdg、NeoDark.exe xrefs、dispatcher/packet token；不执行原客户端。
- [ ] 继续 catalog 21/23/25/27、31/33/35/37、41/43、51/53、61/63/65、71/73/75、81、91/93 等后续 story battle `.lib`。
- [ ] 只有在可证实 ID/trigger 关系后，才逐步替换 `m3-guide`。

## M4 / 行为校准

- [ ] ANI timing 单位、攻击/受击/施法前后摇、路径偏好。
- [ ] 500ms readiness cadence 的原客户端独立动态确认。
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
- 原安装器、`NeoDark.exe`、未知 DLL 不在普通环境/CI 执行；UPX 仅对固定哈希文件做离线静态解包。
- bundled compatibility/reverse-engineering Python 是 `RECOVERED_SECONDARY`，不能自动升级为 retail fact；关键事实必须回到固定 `NeoDark.exe` 字节签名、原始资源或历史资料交叉验证。
- Story battle `.lib` 能证明 zone 内容/formation，不能自动证明 field→zone 触发映射；offline placements 不是 retail field-spawn table。
- Client request/absolute-HP boundary不能推出 retired server 的 exact damage formula。

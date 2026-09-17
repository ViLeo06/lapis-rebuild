# 《佣兵传说》复刻项目计划

> 版本：v3.0｜更新：2026-09-18｜Web-first  
> 用途：个人怀旧、研究、非商业复刻。第一优先级：剑士、巫师。  
> 执行规则：`AGENTS.md`；任务：`Backlog.md`；证据：`docs/evidence-ledger.md`。

## 0. 当前状态

### 0.1 当前检查点

主线保持 **Vite + TypeScript + Phaser + Python 静态转换工具链**。Godot 工程只保留参考，不继续双线开发。

- `main` 已收口 PR #2/#3/#4/#5，以及第一波并行考古 PR #7–#11（S1 Encounter、S2 Enemy AI、S3 Damage、S4 Quest/NPC、S5 Visual）。
- M0/G0：完成。安装包、精确 payload、全量静态展开、哈希和主要解析器均可复现。
- M1：核心通过。ANI/SPR/SGR/MMF/SMF/IMF/Set.lib/Quest.lib/Tip 与 battle binary 已形成静态解析/探针链。
- M2/G2-Web：通过。SPR 横向切片、角色左右方向、正常画面路线线条和 bounds 调试叠层已经过人工校准。
- M3：Web 已采用 **FIELD → 独立 BATTLE → RETURN** 结构，并使用行动槽驱动战术移动/攻击，不再把普通地图实时训练当成原作战斗模型。
- 第一波 S1–S5 已完成并合并。最重要的结果不是“所有旧服务器规则都找到了”，而是把 **客户端能证明什么、服务器曾经决定什么、哪些只能做重构策略** 分清了。
- S6 Runtime Integration 与 S7 Release Validation 已完成：Encounter/AI/Damage/Quest-NPC/ANI 等证据边界已经接入运行时，并通过 fixed-hash 2.2 单 HTML 验证。
- M4 第二波 S8–S12（Game UI、World/Quest、Battle Presentation、Swordsman/Wizard、Progression/Save）已全部合并；S13 已统一接入 M4 玩家运行时。
- S14 Release Validation 已完成：final run `35281047574` 的 synthetic、private-original Chromium/offline 与新版 M4 30 分钟真实墙钟 soak 全部 success。最终 HTML SHA-256 为 `28ef2dcadeb0e3e7216f9b21cff44e725b54b2854944230df0db7c5433fd462c`。

### 0.2 第一波 S1–S5 收口结果

#### S1 Encounter

固定 2.2 客户端已经证明两类不同的场景交互和一个独立 battle-entry 边界：

- world/network entity：类型 `101..103`、Manhattan `<4` 时发送 `49 21 01 + uint16(entity +0x1C)`；其他类型走 `08 + uint16(entity +0xB4)`；
- scene object：Manhattan `<9` 后发送 `49 04 02 00 + uint16(runtime scene-object +0x80)`；
- battle entry：入站 `0x98 mode 1` 明确提供 `battleZoneId` 和可选 battle-grid geometry，客户端据此加载 `sz-%04d.mmf`。

结论：**交互请求 ≠ 本地直接进战斗**。没有证据支持通用客户端 `fieldMapId -> battleZoneId` 公式。真正 `field/object/event -> battleZoneId` 的最终选择属于旧 server/session 边界。

兼容层里 `1030->1 / 1070->3 / 1090->7 / 1100->9` 只保留为 `RECOVERED_SECONDARY`，默认不能冒充 retail truth。

#### S2 Enemy AI

AI 不再只是“知道语法”，绑定链也恢复了一层：

- battle roster stride `0xC8`；unit key `+0x00`；category `+0xB8`；local behavior string `+0xC4`；
- roster unit key 会进入 live unit `+0x24`；
- client 有 100-slot、stride `0x110` 的 network AI program table；入站 `6A 69` 安装完整 AI program；
- program 优先级：匹配 network program > category 7/8 roster program > 空字符串 fallback `ODNORMAL REST(20),ATTACK(80)`；其他 category 走另一处理器；
- target acquisition 在通过 eligibility/footprint/filter 后，对 candidate pool 使用 `rand()%candidate_count`，没有再按最近距离排序。

仍缺：**历史上某一只具体怪物/某一场具体 encounter 当时实际收到了哪条非默认 program**。静态客户端没有保存这批 live payload，因此不能编造具体 enemy-id→program 表。

#### S3 Damage

S3 进一步确认了旧客户端的伤害权威边界：

- 普攻 `6A/82` 不上传最终 damage；
- `6A/05` 下行携带 signed absolute HP，客户端直接覆盖 live HP，再计算 delta 做表现；
- `ability.atr`、`itemtbl.atr`、`Magictbl.atr`、`Magicptn.atr` 中的命中/回避/暴击/伤害/防御/魔法字段已固定位置和哈希；
- `ability.atr` column 25 `cry` 已证明属于受击表现选择，不是伤害输入；
- 已观察到的 `%9/%5` 本地 RNG 位于 authoritative HP 已知之后，是表现随机，不是伤害 RNG。

结论：**exact retail hit/damage/critical/defence/magic/elemental formula 目前不能从客户端路径恢复**。S6 若需要可玩公式，只能集中成一个明确标记 `UNVERIFIED / RECONSTRUCTION_POLICY` 的离线规则。

#### S4 Quest/NPC

S4 已到达明确的 client evidence boundary：

- field interaction 先发请求，client handler 内没有 `object -> dialogue/quest/reward/warp/battle` 本地总表；
- NPCScript block selector 由服务器 `0x92` payload 提供；NPCScript 数字 tuple 已证明主要进入 `SetRect`，属于 UI geometry，不是世界坐标；
- Quest `(questIndex, stepIndex)` 可由 `0x2B` 或 grouped `6A/55` 下发；client 负责加载/展示本地 Quest 文本状态；
- `Employ.Tdg` 的确认路径发送 `0x4E/0x4D` 请求，没有在已恢复路径直接完成最终 roster mutation；
- `Warp.Tdg` 发送 `A4 02`、随后 `A4 01 + selected`，已恢复 UI 请求边界，但未证明 client selection 自己直接切图；
- 没有恢复到 Quest command 直接本地发 reward/recruit/warp/battle 的通用分支。

结论：原版 NPC/Quest 的 eligibility、reward、recruitment、warp acceptance、battle decision 等大量逻辑属于旧服务器。**不要用 SMF object id 与 NPCScript block id 的数字相等关系硬绑。**

#### S5 Visual Fidelity

本轮恢复了几项可以直接进入 S6 的视觉事实：

- ANI raw timing 在常见 consumer 中按 `frame_interval_ms = 1000 / raw_timing` 消费，计时来源是 QPC/Frequency 归一到毫秒；
- 至少一个独立 consumer 使用 `1000 / (raw_timing - 1)`，因此 parser 必须保留 raw value，不应一次性转换成唯一 duration；
- character action state 数字直接映射 `B%03d_%02d.ani`；
- authoritative HP 下降路径会先选择/播放 hit SFX，再设置 character state `3`，因此 `_03` 已运行时验证为 hit reaction；
- BGM 由当前 zone metadata 选择 track，并格式化 `Sound/NDS-8%03d.mid`；
- 1,097 个 SMF / 178,227 条 object record 中 signed `layer` 全为 `-1`，不能把这个字段当成前景 z-order；
- MagicRes `FOCUS/_FOCUS` 必须保留原始 row，不套 Body_ 方向语义。

仍未恢复：通用 death state、attacker impact frame、MagicRes placement/anchor/blend/stage composition、SMF flags→occlusion 语义、完整 magic/death SFX trigger 表、BGM fade/restart/loop 规则。

### 0.3 已恢复的战斗基线

**行动槽 / readiness**

- 玩家 native readiness 环：20。
- 只有 `readiness_current >= readiness_maximum` 时才允许普通行动。
- MOVE / ATTACK / REST authored cost：6 / 4 / 5。
- 行动后扣成本，不是整槽归零；battle tick 每次 +1。
- 目标剑士/巫师 magic rate=100，在当前恢复公式下对应 cost=10。
- 约 500ms/tick 仍是 `RECOVERED_SECONDARY`，尚未由原 `NeoDark.exe` 隔离动态测量独立确认。

**AI grammar / chooser**

- order：`ODNORMAL / ODATTACK / ODDEFENCE`；
- target token：`AREA / SOILDER`；
- action：`REST / ATTACK / MAGIC`；
- default：`ODNORMAL REST(20),ATTACK(80)`；
- chooser：`rand()%100`，并已恢复 HP/MP threshold 与 inclusive weighted compare。

**Battle entry / damage**

- battle scene 由 explicit `battleZoneId` 驱动；
- exact damage 由旧服务器权威状态决定，client 消费 absolute HP。

### 0.4 已验证基线

| 项目 | 当前结论 | 证据/范围 |
| --- | --- | --- |
| 安装包 | 470,688,152 bytes | SHA-256 `c42f37b...d6cdae88` |
| 静态展开 | 22,885 个普通文件 / 2,699,237,296 bytes | 不执行原客户端 |
| ANI | 6,948 个，固定 1,236 bytes | 8×32 active-prefix model；S5补齐 timing consumer |
| SPR | relative transparent skip | B100/B109 多 span + 人工复核 |
| Body_ 方向 | `S,SW,W,NW,N,NE,E,SE` | 真实帧人工/静态交叉检查 |
| readiness | max20；MOVE/ATTACK/REST=6/4/5；tick+1 | 500ms cadence 仍二级证据 |
| AI runtime | grammar/chooser + roster/network binding precedence 已恢复 | concrete historical program payload 仍缺 |
| Encounter | world entity / scene object interaction + explicit battle entry 已恢复 | server predicate / authoritative map→zone 仍缺 |
| Damage | authored combat fields + absolute-HP authority boundary 已恢复 | exact formula 仍缺 |
| Quest/NPC | selector/quest/Employ/Warp client-server boundary 已恢复 | server condition/reward/recruit/battle logic 仍缺 |
| Visual | ANI timing、state3 hit reaction、zone BGM 部分恢复 | death/MagicRes placement/occlusion 等仍缺 |
| SGR | 92/92 可解析 | 0 structural errors |
| Quest.lib | 15/15 members | 固定哈希、静态提取 |
| NPCScript | 39 blocks / 125 active / 5 disabled | block selector 由 server payload 驱动 |
| Tip | 27/27 strict parse / 3547 frames | `NPC350.Tip` 是 sprite library |
| 浏览器稳定性 | 30 分钟真实墙钟 soak 成功 | run `34969057806`，旧检查点 |
| v4 private-original | fixed-hash smoke 成功 | run `35059120452` |
| 第一波 S1–S5 主 CI | 五个 PR head 均 success | PR #7–#11 |
| S13 M4 runtime | 玩家 HUD/任务/职业/成长/表现统一接入 | merge `8b437124cc5d2242af080191ef8ca92764a47615` |
| S14 final private-original | fixed-hash 2.2 browser/offline + M4 acceptance + 30min soak 全通过 | run `35281047574` |
| M4 最终单 HTML | 8,709,711 bytes | SHA-256 `28ef2dca...fd462c` |

### 0.5 当前真正没解决的东西

下面这些不应该继续假装“再扫一次客户端就一定能找到”：

- 旧服务器真正的 encounter eligibility / map-event→battleZone 决策；
- 历史 live roster / `6A69` payload，因此缺具体敌人实例的真实 AI program；
- 旧服务器 exact hit/damage/critical/elemental 公式；
- Quest/NPC 的真实 condition、reward、recruitment、warp acceptance、battle decision；
- 500ms readiness cadence 的原客户端动态独立确认；
- death、attacker impact frame、MagicRes placement/blend/stage、foreground occlusion、完整音效触发；
- 完整背包/装备、成长/转职、正式任务链和更多地图流程；
- 公开 Web 预览的访问控制与版权审查。

如果后续拿到旧服务端、packet capture、录像、韩/日服实现或其他独立证据，可以重新打开这些问题。否则 S6 必须把缺口建模成 **可替换的 reconstruction authority/policy**，而不是把猜测包装成原版事实。

### 0.6 下一步

M4 **Playable Nostalgia Slice** 已通过 S14 收口。下一阶段进入 **M5 Content Depth / Playtest Iteration**，由用户真实试玩反馈驱动，不再为了“多考古”本身扩张范围：

1. 先收集 M4 HTML 的人工试玩问题，按“阻断 / 明显违和 / 可后置”分级；
2. 清理剩余开发态视觉痕迹（包括旧 footer build label），继续把默认界面向正常游戏靠拢；
3. 扩充第二个可靠 field map、NPC/Quest 片段和连续地图流程，但所有退役服务器缺口继续走 reconstruction authority；
4. 深化剑士/巫师技能、装备、成长与表现，不伪造 exact retail damage/progression 公式；
5. 在证据允许时启用真实音频链；无法证明的 fade/loop/trigger 继续隔离为可替换策略；
6. 每个可玩里程碑继续执行 synthetic -> fixed-hash private-original -> single HTML -> 人工试玩；重大运行时改动再跑真实墙钟 soak；
7. 只有拿到旧服务端、packet capture、录像或其他独立证据时，才重新打开被标记为 server-boundary 的原版语义问题。

S14 的详细验收记录见 `docs/validation/s14-m4-release-20260918.md`。

---

## 1. 项目目标

### 1.1 实施路线

**证据固化 → 资源转换 → Web 诊断 → Web 可玩切片 → 行为校准 → 核心系统 → 双职业完整化 → Web 发布 → 可选联网**

终端用户目标是打开现代桌面浏览器即可体验；不要求安装原 Windows 客户端、Godot、Node、Python 或 VM。私人单文件 HTML 是当前最快的人机联合验收载体。

### 1.2 MVP 验收

1. 浏览器启动并选择剑士/巫师。
2. 非战斗地图正常自由移动；交互请求与 battle entry 分离建模，进入战斗时使用显式 battle zone。
3. 战斗采用 readiness 驱动的战术移动/攻击框架；未知规则明确标记 reconstruction policy。
4. 待机、移动、方向、攻击、受击、施法、死亡表现；未知项明确标注。
5. 每职业普通攻击和至少 3 个代表技能；敌人、伤害、死亡、结算形成闭环。
6. NPC 对话、地图切换、基础背包和装备。
7. IndexedDB 存读档，JSON 导入导出作为备份。
8. Debug Panel 保持 opt-in；正常玩家画面不显示 route polyline / bounds overlay。
9. fixed-hash 可重复构建、Chromium 回归、真实资源人工复核和必要的 wall-clock soak。

仅有自动测试、按钮或占位训练逻辑，不足以宣布原版还原正确。

### 1.3 V1 验收

剑士 B100–B190、巫师 B109–B199 各十阶段，从初始阶段正常成长到最高阶段：外形、动作、属性、主要技能树、装备适配、升级/转职、代表任务、地图、战斗场景、行动机制、音频、设置和存档恢复。按职业矩阵逐项验收。

### 1.4 暂缓范围

第三职业、大规模全部原作内容；公网账号、充值、交易、运营后台；与未知第三方服务器互通；原生移动 App/主机；Windows-first 发行；未经授权公开散布原资源。

---

## 2. 技术与资产边界

- 主运行时：Phaser + TypeScript；Vite 构建；HTML/CSS 调试 UI。
- Python >= 3.12：静态提取、资源解析、固定哈希 probe、转换与验证。
- 浏览器消费 PNG/JSON/适配音频；不执行原 EXE/DLL，不在前端存密钥。
- 当前依赖以 `web/package-lock.json` 为准。
- GitHub 私有仓库只保存代码、文档、工具、结构、哈希、测试和少量合成样本。
- 原安装包、完整展开、大量派生美术/音频和原始对白保存在私有 Drive/短期 CI artifact，不进入 Git。
- `web/public/game-data/` 与 `game/generated/` 默认 gitignore。
- 改动走功能分支/PR；高风险发布/权限/版权动作需单独确认。

---

## 3. 证据规则

`VERIFIED`：固定哈希、严格解析、全量验证、像素/帧检查、静态反汇编或隔离环境重复实验直接支持。

`VERIFIED-HISTORICAL`：同期官方/主流媒体/玩家操作资料支持高层玩法/UI 架构，但不等于内部源码。

`RECOVERED_SECONDARY`：固定版本兼容/传输实现等可复现二级静态证据；不能自动升级为 retail fact。

`INFERRED`：有较强线索但语义仍需继续证实。

`RECONSTRUCTION_POLICY / UNVERIFIED`：为离线可玩性补齐退役服务器或缺失表现规则的显式替代实现。

约束：

- 新证据必须有可复现输入、版本/哈希和 probe/test；
- server-boundary 项目缺少独立证据时允许结论为“客户端无法证明”；
- authored stats 与 reconstruction formula 必须分层；
- ANI 保留 raw timing，按 consumer policy 解释；
- FOCUS 不套 Body_ 八方向规则；
- field interaction 与 battle entry 分开；
- Quest/NPC block/step 与 world entity ID 不做无证据直连；
- 私有原作正文只在构建时派生，不提交 Git。

---

## 4. 里程碑与门禁

| 里程碑 | 交付 | 状态 |
| --- | --- | --- |
| M0 基线 | 固定样本、哈希、静态拆包 | **G0 通过** |
| M1 资源 | 双职业、地图、技能、内容容器与格式转换 | **核心通过，持续收口** |
| M2 Web 诊断 | 地图、角色、逐帧/方向/碰撞/Debug/离线 HTML | **G2-Web 通过** |
| M3 Web 可玩切片 | field→battle→return→NPC/地图→存档 | **工程结构已建立；等待 S6 用新证据重构核心运行时** |
| M4 行为校准 | readiness、AI、damage、encounter、Quest/NPC、visual | **第一波客户端静态考古完成；server-boundary 已明确** |
| M5 核心系统 | 实体、战斗、技能、成长、任务、背包、存档迁移 | **S6 开始进入运行时整合** |
| M6 双职业完整化 | 十阶段职业矩阵 | 未开始 |
| M7 Web 发布 | 性能、兼容、访问控制、版权、回滚 | 未开始 |
| M8 可选联网 | 单机稳定后的独立权威服务端 | 暂缓 |

门禁：

- **G0 / G1 / G2-Web：已通过。**
- **G3：部分通过。** field/battle/readiness 工程结构已存在，但第一波证据尚未整合进统一运行时。
- **G4：部分通过。** 大量 client behavior 已固定；旧服务器规则需要 reconstruction policy 或未来独立证据。
- **G5：**双职业矩阵完成或批准例外；否则不称 V1。
- **G6：**公开发布前完成访问控制、版权、构建检查并取得发布授权。

---

## 5. 阶段执行方案

### 5.1 第一波 S1–S5 — 已完成

| Session | PR | 结果 |
| --- | --- | --- |
| S1 Encounter | #9 | 交互 action 与 battle entry 分离；server/session map→zone authority 边界确认 |
| S2 Enemy AI | #7 | roster/network AI binding precedence 与 random candidate selection 恢复；具体历史 payload 仍缺 |
| S3 Damage | #10 | authored combat fields 与 absolute-HP authority boundary 收口；exact formula 未恢复 |
| S4 Quest/NPC | #8 | NPC/Quest/Employ/Warp 的 client-server boundary 收口；真实 server rules 不在客户端 |
| S5 Visual | #11 | ANI timing consumer、state3 hit reaction、zone BGM 等恢复；death/MagicRes/occlusion 继续未知 |

第一波使用“冻结共享运行时文件、各自新增 probe/docs/tests”的方式并行完成，五个 PR 无交叉冲突。这一策略验证有效。

### 5.2 第二波 S6 Runtime Integration — 下一步

分支：`codex/runtime-integration`

S6 是当前唯一需要集中修改 `web/src/scene.ts`、`web/src/main.ts`、`web/src/battle.ts` 等共享运行时的 Session。

核心要求：

- 不追求“把所有未知都变成 VERIFIED”，而是把已恢复事实和 reconstruction policy 分层；
- interaction intent、authority decision、battle entry 分开；
- AI program source / authored stats / Quest state / visual timing 都带 provenance；
- server-side 缺失规则集中放在可替换 policy/adapter，不散落硬编码；
- 先完成一个剑士/巫师都能进入、行动、攻击/施法、受击、结算、返回的可验证切片；
- S6 必须补 tests 和 integration note，不能只“看起来能玩”。

### 5.3 第三波 S7 Release Validation

分支：`codex/release-validation`

S7 不开发新玩法，只做验收和必要测试修复：

- fixed-hash 2.2 private-original smoke；
- standalone single HTML；
- Chromium browser/offline tests；
- 人工式逐步试玩；
- 人物/地图/战斗/特效/音频 spot-check；
- 必要时重新跑 30 分钟真实墙钟 soak；
- 检查版权资源没有误进 Git；
- 检查 `UNVERIFIED/RECONSTRUCTION_POLICY` 没有被误标成 original/recovered；
- 形成 validation report。

### 5.4 PR 合并规则

- S1–S5 已关闭，不再往旧分支追加共享运行时改动。
- S6 从第一波全部收口后的最新 `main` 新建。
- S7 从 S6 合并后的最新 `main` 新建。
- `Plan.md`、`Backlog.md`、`docs/evidence-ledger.md` 由协调 Session 在阶段收口时统一更新。
- 公共运行时重构不要拆成多个并行 PR 同时争抢 `scene/main/battle`。

---

## 6. 质量与自动化

持续要求：

- Python parser/probe tests；
- TypeScript typecheck/unit tests/build；
- Chromium E2E 和 standalone HTML offline tests；
- field/battle/readiness/return 状态回归；
- fixed-hash private-original smoke；
- 真实资源重大检查点做人工 spot-check；
- 大型运行时重构后按需要做 wall-clock soak。

CI 不运行原安装器、`NeoDark.exe`、未知 DLL、兼容注入或 Frida 组件。

---

## 7. 文档职责

- `AGENTS.md`：项目执行/安全/分支控制。
- `Plan.md`：路线、门禁和实时阶段状态。
- `Backlog.md`：具体任务。
- `docs/evidence-ledger.md`：权威证据索引。
- `docs/systems/`：各考古主题结论。
- `docs/integration-notes/`：第一波给 S6 的运行时接入契约。
- `docs/validation/`：自动与人工验收记录。
- `docs/decisions/`：重大架构决策。
- `manifests/` / `data/manifests/`：固定输入/输出指纹与结构化证据。

---

## 8. 维护规则

1. 实质检查点完成时同步更新 Plan/Backlog/evidence ledger。
2. 分开报告：CI 成功、静态证据、浏览器成功、人工视觉/玩法成功，禁止互相替代。
3. 不写无依据完成百分比。
4. 功能改动走独立分支/PR，禁止 force 更新共享分支。
5. Windows VM 未就绪不阻止 Web、解析和静态工作；只有确实需要动态原客户端证据时才启用隔离环境。
6. 真正阻塞时记录缺失输入、已尝试方法和最小下一步。
7. 不把私有 GitHub 仓库等同于原版资源可公开分发。
8. 不把 reconstruction policy 写成 recovered retail behavior。

---

## 9. 变更记录

- 2026-09-14 v1.1：M0 基线与 Windows/Godot 路线。
- 2026-09-15 v2.0：用户批准 Web-first；Windows VM 仅用于原版行为考据。
- 2026-09-15 v2.1：建立 Web 诊断/训练、锁文件、CI、离线 HTML、哈希和存档。
- 2026-09-15 v2.2：关闭 G2-Web 工程门禁；加入地图0001、MagicRes 与最小 NPC→地图→任务→存档闭环。
- 2026-09-15 v2.3：恢复 Quest.lib/NPCScript/Quest0–9，建立 source-backed 内容层。
- 2026-09-15 v2.4：完成 Tutorial/Help/Neohelp/Prologue 与 Tip 静态结构；30 分钟 soak 通过；SPR span/方向进入人工门禁。
- 2026-09-15 v2.5：依据同期资料纠正为 field/battle 分离 + readiness 战术模式，并完成视觉叠层校准。
- 2026-09-16 v2.6：PR #4/#5 收口；批准 S1–S5 并行考古 → S6 整合 → S7 验收。
- **2026-09-16 v2.7：S1–S5 / PR #7–#11 全部审阅并合并。恢复 encounter 客户端边界、AI instance binding precedence、damage authored fields/server authority、Quest/NPC server-selected runtime boundary、ANI timing/hit/BGM 语义；第一波静态考古收口，项目正式进入 S6 Runtime Integration。**

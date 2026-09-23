# 《佣兵传说》复刻项目计划

> 版本：v3.6｜更新：2026-09-22｜Web-first  
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
- 2026-09-18 人工试玩反馈确认：**M4 虽已工程跑通，但距离“可玩”仍明显不足**。当前最高优先级不是继续扩大技术验证，而是恢复完整视角操作、可见 NPC、可见怪物、相机跟随、自动场景切换，并为旧服务器缺失的战斗数值建立稳定可玩的 reconstruction balance。
- M5 S15–S19 已完成并统一接线，集成 PR #29 合并为 `efbadaf0b0781ee205bd7a2541b265a41c7929e9`。fixed-hash 2.2 final run `35405864082` 的 synthetic、private-original Chromium/offline 与 30 分钟 M5 soak 全部 success。
- M5 private pack 已实际使用原客户端 map 1 / map 7、B1001 world visual、B4524/B4544 monster visual；具体“训练引导员/训练怪物/训练屋”绑定继续明确标记 `RECONSTRUCTION_POLICY`。
- 最终 M5 单 HTML：11,190,078 bytes；SHA-256 `12cd51547679d4aae225f5382941ddd93c878e3a93a56910607012f5fe3d9140`。自动/人工式浏览器链路已经证明自然闭环；**最终玩家体感验收仍以用户亲自试玩为准。**
- 2026-09-19 用户亲自试玩已给出 M5 体感门结论：**未通过**。NPC 虽可见，但世界 NPC 当前不是可点击交互目标；点击引导员会落入地图点击移动路径，无法自然触发对话/任务。HUD 也仍明显偏开发壳：状态栏过大、引导框和下方框位置不合理、遮挡偏重，且未优先复用已经搜集到的原版/同期界面证据。项目立即转入 **M5.1 User Playtest Repair**。
- 2026-09-20 用户亲自试玩最终 S24 standalone HTML 后明确确认 **通过**。M5.1 已完成原版结构优先 HUD、NPC pointer/hitbox、显式对话/任务选择、手机触控、延迟追中相机与战斗主动撤退确认。最终验收运行时 head `97bd5063749a15e114ce85119015f9dcb8b7afc0`；run `35442734082` synthetic/private-original/Chromium/offline 成功，E2E `58 passed / 4 skipped / 0 failed`；artifact `10583854810`；最终单 HTML 11,214,215 bytes，SHA-256 `0ddc54035f88c6b9c0e13a31fa621ac4a74a4455fb40e9959076fded34a201b7`。**M5 Playability Gate 通过，项目正式进入 M6 Dual-class Completion。**
- 2026-09-21 M6 Dual-class Completion 已完成自动化与人工验收。S25/S26/S28 已汇入 S29；原 S27 分支无实现，后由 S29 补齐巫师十阶段。生产 runtime 现支持剑士 `100→190`、巫师 `109→199` 共 20 阶段，保留 M5.1 三技能基线、阶段晋阶、M6 SaveV2 extension、装备约束与双职业独立存档轨道。fixed-hash private runtime head `0a51f242a6357031f7f5b83c743fae7724c7e2f9` 的 private E2E 为 `61 passed / 4 skipped / 0 failed`；最终 M6 validation run `35562393435` success，新 30 分钟 soak `1,800,634 ms`、0 page error、0 external request。最终 private HTML 22,968,621 bytes，SHA-256 `f509c71b69ae5b41419a1f9c397108200bad1a1ef449f386927378d7d0ae59b4`。用户已于 2026-09-21 人工试玩确认无问题，**M6 Gate 正式通过**。
- 2026-09-22 M7 Combat Content Expansion 已完成 S30–S34 工程集成。当前生产 runtime 具备 19 个固定等级怪物 archetype、Lv1–65 七阶段怪物梯度、剑士/巫师各 7 技能 × 6 级、15 场固定 roster/不同 battle zone 训练战、无限 HP/MP Recovery、Developer Preset、手机端核心操作与 M7 SaveV2。可执行源 head `62566a549a2d1f6f2c15b1a4370329e4382ae94a` 的 run `35690650510` 为 parser 84/84、unit 269/269、Playwright 72 passed / 4 skipped / 0 failed；S17 evidence run `35690650505` success。工程收口时生成过 122,196,302 bytes、SHA-256 `6ba496998b507c7ab863cc219acbcf2e9e2508abca5cb98ebaaac97032cc782b` 的 private-original artifact，但该字节快照未持久化到 GitHub/Drive。当前可实际交付给用户的同源码/同 fixed-hash 资产重建包为 `lapis-m7-private-62566a5-handoff.html`，同为 122,196,302 bytes，SHA-256 `4c337dd2cb34f838d961207eeb2a126a4c146089dae07cdcdda069f54eec156f`，3,772/3,772 内嵌项校验通过。**M7 Engineering Gate 通过；Human Playability Gate 以当前可下载 handoff SHA 为准，PR #42 不得提前合并 main。**

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

需要区分两类问题。

**A. 客户端资产/表现仍应继续恢复，因为它们直接决定能不能像游戏：**

- NPC 图像、方向、动作、动画族，以及 NPC 形象如何绑定到世界实体；
- 怪物图像、方向、攻击/受击/死亡动作，以及 battle roster/unit 如何绑定具体怪物外观；
- fullscreen、zoom in/out、viewport resize 与角色中心相机跟随；
- field/building/interior 等场景的空间触发和自动切换，不再由玩家手点调试框；
- 第二个及更多可靠 field/interior map 的实际可走区域、入口/出口、NPC 放置；
- death、MagicRes placement/blend/stage、foreground occlusion、完整音效触发等仍影响体验的视觉表现。
- **原版 UI 精确像素仍未完全恢复。** M5.1 已建立 S20 reference pack，并按原版结构关系完成玩家 HUD 重构；未被 fixed-hash 2.2 直接证明的精确像素、alpha、字体和缺失功能仍保持 `RECONSTRUCTION_POLICY` / disabled placeholder。
- **NPC 交互的历史 server 语义仍不完整。** M5.1 已完成 pointer/hitbox → interaction intent → 显式对话/任务选择，并保留键盘 E 与手机触控；但具体 NPC 身份、任务条件、奖励、招募/传送/战斗决定仍属于旧服务器缺口，继续由可替换 reconstruction policy 承担。

其中已有明确线索：`NPC350.Tip` 已验证为 sprite library，但还没有完成“图像/动作 → NPC archetype → 地图实体”的运行时恢复。

**B. 旧服务器缺失后不能再等原始公式，必须以可替换 reconstruction policy 补齐：**

- encounter eligibility / event→battleZone 最终决策；
- 历史 live `6A69` 具体 enemy AI program；
- exact hit/damage/critical/defence/magic/elemental formula；
- Quest/NPC 的真实 condition、reward、recruitment、warp acceptance、battle decision；
- 原版成长曲线和完整职业数值。

这类问题的目标改为：**保留原客户端 authored stats，建立合理、稳定、可调、可测的离线数值体系，优先保证可玩性；绝不把替代数值标成原版恢复。**

公开 Web 预览的访问控制与版权审查继续留到发布阶段。

### 0.6 下一步

**M7 工程集成已完成，当前唯一阶段门是用户对最终 private-original standalone HTML 的人工试玩。**

在用户对当前可下载 handoff SHA-256 `4c337dd2cb34f838d961207eeb2a126a4c146089dae07cdcdda069f54eec156f` 明确验收前：

- PR #42 保持未合并；
- 不把自动测试或 private pack 哈希完整性等同于用户体感通过；
- 不启动新的大范围 shared-runtime 里程碑覆盖 M7 现场问题；
- 若试玩发现缺陷，优先在 S34 分支修复并重新生成精确 SHA 的试玩包；
- authored client data / recovered evidence / reconstruction policy 三层继续严格分离。

用户验收通过后，再关闭 M7 Human Playability Gate，并讨论后续 Web 发布/更多内容扩展。

---

## 1. 项目目标

### 1.1 实施路线

**证据固化 → 资源转换 → Web 诊断 → Web 可玩切片 → 行为校准 → 核心系统 → 双职业完整化 → 战斗内容扩展 → Web 发布 → 可选联网**

终端用户目标是打开现代桌面浏览器即可体验；不要求安装原 Windows 客户端、Godot、Node、Python 或 VM。私人单文件 HTML 是当前最快的人机联合验收载体。

### 1.2 MVP 验收

1. 浏览器启动并选择剑士/巫师。
2. 支持全屏、窗口自适应、放大/缩小；人物移动时相机跟随，地图可连续探索。
3. 非战斗地图正常自由移动；玩家能直接看到 NPC，并通过空间接近/交互接任务。
4. 走到建筑/入口/出口等空间触发区时自动切换 field/interior scene，不依赖调试下拉框。
5. 战斗采用 readiness 驱动的战术移动/攻击框架；敌人必须使用恢复出的怪物图像和动作，而不是抽象占位。
6. 待机、移动、方向、攻击、受击、施法、死亡表现；未知项明确标注。
7. 每职业普通攻击和至少 3 个代表技能；在原公式缺失时使用明确的 ReconstructionCombatBalance，保证 HP/攻击/防御/技能/怪物强度可玩且可调。
8. NPC 对话、任务、地图切换、怪物战斗、奖励、基础背包和装备形成自然闭环。
9. IndexedDB 存读档，JSON 导入导出作为备份。
10. Debug Panel 保持 opt-in；正常玩家无需 Developer diagnostics 即可完成任务和战斗。
11. fixed-hash 可重复构建、Chromium 回归、真实资源人工复核和必要的 wall-clock soak。

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
| M3 Web 可玩切片 | field→battle→return→NPC/地图→存档 | **工程闭环通过** |
| M4 行为校准/玩家壳 | readiness、AI、damage boundary、Quest/NPC、UI、双职业、SaveV2 | **S14 工程验收通过，但人工试玩确认仍不足以称“可玩”** |
| M5 可玩性恢复 | viewport/camera、NPC visual、monster visual、scene transition、reconstruction balance | **工程/私有验收通过；2026-09-19 用户试玩暴露阻断，转 M5.1** |
| M5.1 用户试玩修复 | 原版 UI 外壳、NPC pointer/hitbox、对话/任务交互、真实输入验收 | **通过：S20–S24 + 用户最终试玩** |
| M6 双职业完整化 | 十阶段职业矩阵 | **通过：S25–S29 + 用户试玩** |
| M7 Combat Content Expansion | Lv1–65 怪物/七阶段技能/15 训练战/Recovery/Developer Preset | **工程通过；等待用户试玩** |
| M8 Web 发布 | 性能、兼容、访问控制、版权、回滚 | 未开始 |
| M9 可选联网 | 单机稳定后的独立权威服务端 | 暂缓 |

门禁：

- **G0 / G1 / G2-Web：已通过。**
- **G3：通过。** field/battle/readiness/M4 runtime 与 M5 viewport/NPC/monster/scene transition 已整合并通过 fixed-hash 浏览器验收。
- **G4：部分通过。** 大量 client behavior 已固定；旧服务器规则继续由 reconstruction policy 补齐。
- **M5 Playability Gate：通过。** 2026-09-19 首轮人工试玩暴露的 NPC 点击与 HUD 阻断已由 M5.1 S20–S24 修复；2026-09-20 用户对最终 S24 standalone HTML 亲自试玩确认通过。工程证据与人工体感门均已闭合，后续缺陷进入普通 M6 backlog，不再阻塞 M6。
- **G5：通过。** M6 双职业十阶段矩阵与用户试玩已闭合。
- **M7 Human Playability Gate：待通过。** 工程/自动化/private-original artifact 已完成；必须由用户试玩精确 SHA 后才能关闭。
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

### 5.2 S6–S7 Runtime Integration / Release Validation — 已完成

S6 已把第一波考古边界接入运行时；S7 已完成 fixed-hash private-original single HTML 与人工式验证。

关键原则继续沿用：

- interaction intent、authority decision、battle entry 分层；
- AI / damage / quest / visual policy 都带 provenance；
- server 缺失规则集中为可替换 reconstruction policy；
- 不把“测试能跑”直接等于“玩家能玩”。

### 5.3 M4 S8–S14 Player Shell / 双职业切片 — 已完成工程验收

M4 已完成玩家 HUD、World/Quest reconstruction、Battle Presentation、剑士/巫师、Progression/SaveV2，以及 S13 集成、S14 fixed-hash 验收。

最终 S14 HTML 自动/人工式验证均通过，但 2026-09-18 用户实际试玩指出：当前版本仍缺少决定“能不能玩”的基础体验——可控视角、可见 NPC、可见怪物、相机跟随、空间驱动场景切换和可信的离线战斗数值。

因此 M4 被视为 **工程验证完成**，不是玩法完成。

### 5.4 M5 Playable Recovery — 工程验收已完成

S15–S19 已全部合并并由协调 Session 完成共享运行时接线。PR #29 合并到 main 后，M5 已不再依赖调试 selector 完成基础任务/场景/战斗闭环。

最终工程证据：

- fixed-hash 2.2 run `35405864082`：synthetic + private-original success；
- M5 private E2E：可见 NPC → 接任务 → 自动进屋 → 可见怪物 → 2v1 战斗 → 返回交任务；
- S19 balance v2 对齐 simulator 与 live cadence；
- 30 分钟 M5 soak success；
- 最终 HTML SHA-256 `12cd51547679d4aae225f5382941ddd93c878e3a93a56910607012f5fe3d9140`。

**注意：工程门通过不替代用户亲自试玩的体感门。**

2026-09-19 用户亲自试玩已经实际触发这一规则：M5 工程收口保留，但 **Playability Gate 判定失败**，后续由 M5.1 修复，不得用 run `35405864082` 的 green CI 覆盖人工反馈。

### 5.5 M5.1 User Playtest Repair — S20–S24 — 已完成

统一起点：`main@abf05e1873b18bc89aaeb8dcb89aed491d4f4306`。计划由协调分支 `codex/m5-1-playtest-repair-plan` 固化为 v3.3；五条工作线从该计划提交切出，任何 Session 都不得自行回退到 v3.2 或旧 M5 基线。

| Session | 分支 | 主任务 | 关键交付 |
| --- | --- | --- | --- |
| S20 | `codex/s20-original-ui-archaeology` | Original UI Archaeology / Reference Pack | 原版/同期 UI 证据清单、客户端 UI 资产 inventory、截图/素材与 HUD 区域映射、2.1↔2.2 可用时静态差分、可复现 reference pack |
| S21 | `codex/s21-field-hud-restoration` | Original HUD Shell / Layout Polish | 缩小顶部状态区、右上任务/引导、底部面板下沉、左下子框缩小、半透明、原版结构 placeholder、Debug 分层 |
| S22 | `codex/s22-npc-pointer-interaction` | NPC Pointer / Hitbox / Input Arbitration | NPC clickable hit target、hover/cursor、点击不穿透移动、zoom/fullscreen 坐标正确、pointer/E 统一 interaction intent |
| S23 | `codex/s23-npc-dialogue-quest-flow` | NPC Dialogue / Quest / Guide Runtime | 引导员对话/任务状态机、interaction intent 消费、任务接受/推进/战斗引导、server-boundary provenance、可替换 reconstruction policy |
| S24 | `codex/s24-m5-1-acceptance` | Player-input Acceptance / Integration | 真实 pointer/keyboard E2E、UI 多分辨率截图门禁、无 Debug 主流程、private-original fixed-hash 单 HTML/Chromium/offline/soak 与最终用户试玩包 |

#### 并行文件所有权

为避免再次让五条线争抢同一个核心文件：

- **S20**：只改 research/tools/docs/reference manifests；不改生产 Web runtime。
- **S21**：优先拥有 `web/src/ui/*`、相关 UI CSS 与 UI tests；不改 `scene.ts`、world/quest runtime。
- **S22**：拥有 NPC pointer/hit-test/input adapter；`web/src/scene.ts` 在本轮并行期只允许 S22 做最小必要接线。不得改 UI shell 样式和任务语义。
- **S23**：优先新增/修改 world/quest/dialogue/interaction domain 模块；不得并行修改 `scene.ts`、`web/src/ui/game-shell.css` 或 `battle.ts`。需要 scene glue 时通过明确接口与 integration note 交给 S24。
- **S24**：并行期以 `web/e2e/*`、validation harness、docs 为主；S20–S23 收口后才同步最新 main 做最小共享 glue 和最终验收。

全体冻结，除协调收口外原则上不改：

- `Plan.md`
- `Backlog.md`
- `docs/evidence-ledger.md`
- `web/src/main.ts`
- `web/src/battle.ts`

#### UI 恢复规则

- 先证明“原版界面有哪些稳定区域、锚点、边框/背景/按钮素材”，再决定实现；原客户端资产优先级高于后期同源截图，同期官方/玩家资料用于补结构。
- 已知功能缺失允许 placeholder，但 placeholder 必须占据原版结构中的对应位置，并明确 disabled / unavailable；不能因为功能没做就重新排版。
- 半透明是当前重构的可读性要求，不自动宣称为原版 alpha；若找到原版透明度/混合证据，再升级证据等级。
- Debug Panel 保留，但默认隐藏/opt-in；正式 HUD 与 Debug DOM/视觉层分开。

#### NPC 交互验收

至少证明：

1. 玩家在 field 看见训练引导员；
2. 鼠标 hover/点击命中 NPC visual/hitbox，而不是命中地图移动；
3. 距离不满足时给出靠近/不可交互反馈，不能远距离无条件触发；
4. 距离满足后点击 NPC，进入统一 interaction intent；
5. 产生可见对话/任务提示并可接受任务；
6. 后续既有“入口 → 训练屋 → 怪物 → battle → return → NPC 交任务”链路不回退；
7. 键盘 E 作为辅助输入与鼠标进入同一逻辑，不维护两套任务推进；
8. fullscreen / zoom / camera follow 后 pointer world coordinate 与 hitbox 仍正确。

#### 外部考古接入边界

S20/S23 必须读取 `docs/research/external-web-research-20260918.md`。其中村庄设施图、训练场双入口、任务条件、技能表和怪物行为属于同源历史证据；只有与 fixed-hash 2.2 客户端资产/对象/地图交叉确认后，才能升级为当前国服重构事实。S19 已使用的日本伤害候选公式仍维持校准候选，不在本轮借 UI/NPC 修复升级。

#### M5.1 最终门禁

最终验收必须由正常玩家输入自然完成：

`启动 → 原版结构 HUD 可见且不遮挡 → 移动/缩放/全屏 → 鼠标点击 NPC → 对话/接任务 → 走入训练入口自动切场景 → 看见怪物 → 战斗 → 返回 → 再次点击 NPC → 交任务`

同时要求：

- 1366×768、1920×1080 至少两个桌面 viewport 无关键 HUD 重叠；
- 不打开 Developer diagnostics、不调用测试专用内部方法也能完成主流程；
- 点击 NPC 的 E2E 必须使用真实浏览器 pointer/keyboard event；
- fixed-hash 2.2 private-original single HTML、Chromium、offline、必要 wall-clock soak 重新通过；
- 最终仍由用户亲自试玩决定 M5 Playability Gate 是否关闭。
### 5.6 M6 Dual-class Completion — S25–S29

统一基线：M5.1 PR #36 合并后的最新 `main`。五条线从同一 M6 起点切出，禁止回退到 M5/M5.1 旧基线。

| Session | 分支 | 主任务 | 关键交付 |
| --- | --- | --- | --- |
| S25 | `codex/s25-m6-dual-class-matrix` | Dual-class Matrix / Data Archaeology | 20 阶段视觉/属性/技能/装备/成长证据矩阵、缺口与 provenance |
| S26 | `codex/s26-m6-swordsman-progression` | Swordsman Ten-stage Progression | 剑士十阶段成长、技能/装备/阶段切换、单元与浏览器验收 |
| S27 | `codex/s27-m6-wizard-progression` | Wizard Ten-stage Progression | 巫师十阶段成长、魔法/MP/装备/阶段切换、单元与浏览器验收 |
| S28 | `codex/s28-m6-world-progression-content` | World / Quest / Equipment Expansion | 等级/背包/装备/转职/任务/地图流程与奖励 policy |
| S29 | `codex/s29-m6-integration-acceptance` | M6 Integration / Acceptance | 统一 runtime、SaveV2 migration、双职业真实输入 E2E、private-original/offline/soak |

并行原则：S25 以 research/tools/data/docs 为主；S26/S27 分职业域文件；S28 负责 progression/world/quest/equipment 域；`scene.ts`、`main.ts`、`battle.ts`、`Plan.md`、`Backlog.md`、`docs/evidence-ledger.md` 在并行期继续由协调/集成线控制。S29 只在前四线形成稳定 integration notes 后修改共享核心。

证据原则继续沿用：原客户端 authored data 原样保存；未知 server condition、公式、成长或奖励规则必须集中到 `RECONSTRUCTION_POLICY`，不得包装成原版恢复。

### 5.7 M7 Combat Content Expansion — S30–S34 — 工程完成 / 人工门待验

统一基线：`main@1d592d0e2194567c5d7d863e6a48250407dabeb3`。

| Session | PR | 主任务 | 工程结果 |
| --- | ---: | --- | --- |
| S30 | #43 | Monster Catalog / Difficulty Matrix | 19 个固定等级怪物，七阶段覆盖，healer/elite/boss 等角色齐全 |
| S31 | #45 | Swordsman Seven-stage Skills | 7 技能 × 6 级；舍身/爆发/强防/控制等统一 status runtime |
| S32 | #46 | Wizard Seven-stage Skills | 7 技能 × 6 级；毒/吸 MP/禁疗/石化/失明/诅咒组合 |
| S33 | #44 | Training / Recovery / Developer Preset | 15 场训练、HP/MP Recovery、Developer Preset、手机交互 |
| S34 | #42 | Integration / Balance / Acceptance | fixed roster/zone、M7 SaveV2、shared core、E2E、private HTML |

正式 M7 等级轴：`1–5 / 6–15 / 16–25 / 26–35 / 36–45 / 46–55 / 56–65`；转阶段点：`6 / 16 / 26 / 36 / 46 / 56`。M6 Stage 8–10 能力继续保留。

最终工程证据：

- executable source：`62566a549a2d1f6f2c15b1a4370329e4382ae94a`；
- run `35690650510`：84 parser + 269 unit + 76 Playwright discovered；425 passed / 4 skipped / 0 failed；
- S17 evidence run `35690650505`：success；
- Drive 18-part fixed installer 静态重组 SHA 与批准基线完全一致；原客户端未执行；
- private pack：3,771 indexed files / 89,656,141 bytes / 0 integrity failures；
- final standalone：122,196,302 bytes；SHA-256 `6ba496998b507c7ab863cc219acbcf2e9e2508abca5cb98ebaaac97032cc782b`。

**边界：** exact retail damage/status formula、历史 per-encounter AI、敌方属性成长、authoritative field/event→encounter 仍是 server-boundary；M7 数值、训练绑定、Recovery 等在无直接证据处均保持 `RECONSTRUCTION_POLICY`。

**当前门禁：** 工程通过不等于用户试玩通过。PR #42 保持未合并，等待用户对上述精确 SHA 的 standalone HTML 亲自验收。

### 5.8 PR 合并规则

- S1–S19 已关闭，不再往旧分支追加 M5.1 runtime 改动。
- v3.3 计划先在 `codex/m5-1-playtest-repair-plan` 形成独立 PR；未经负责人明确批准不直接合并 main。
- S20–S24 从同一个 v3.3 计划提交切分；各自只修改上表归属范围，禁止把共享文档顺手带进功能 PR。
- S20–S23 的功能 PR 在进入最终集成前必须同步当时最新 main；若计划 PR 采用 squash merge，工作分支需正常 merge/rebase 解决共同祖先差异，不 force push 共享分支。
- S24 是本轮后置集成/验收线：前半程并行准备测试，后半程在 S20–S23 收口后同步最新 main，做最小 glue、跑完整 private-original 验收并产出人工试玩包。
- `Plan.md`、`Backlog.md`、`docs/evidence-ledger.md` 继续由协调 Session 在阶段收口时统一更新。
- 未经负责人对具体 PR 的明确批准，不合并 main；不因 CI green 自动宣告用户体感门通过。

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

- **2026-09-18 v3.1：依据 S14 后真实人工试玩反馈，将 M5 重新定义为 Playable Recovery。新增 S15–S19 五条并行主线：viewport/camera/fullscreen、NPC visual、monster visual、world scene transition、reconstruction combat balance。明确 NPC350.Tip 是可继续恢复的 sprite library；旧服务端数值不再等待 exact formula，而以独立可替换的平衡层保证可玩性。**

- **2026-09-19 v3.2：S15–S19 与统一 M5 runtime integration 收口。final run `35405864082` synthetic/private-original/Chromium/offline/30min soak 全通过；S19 升级为 balance v2 并对齐 live cadence；最终 M5 single HTML 固定为 11,190,078 bytes / SHA-256 `12cd5154...3d9140`。下一步转为 M5.1 用户真实试玩打磨，不再以自动测试代替体感验收。**

- **2026-09-19 v3.3：用户真实试玩判定 M5 Playability Gate 未通过。确认 NPC visual 尚无 pointer hit target、点击会落入地图移动路径；HUD 仍偏开发壳且未按原版结构收敛。启动 M5.1 S20–S24：原版 UI 考古、HUD 恢复、NPC pointer/hitbox、对话/任务 runtime、真实玩家输入验收。同步纳入 2026-09-18 外部深调资料（村庄设施/训练场双入口/任务技能表/2.1 差分线索），并继续严格区分 fixed-hash 2.2 事实与同源历史候选。**
- **2026-09-22 v3.6：M7 S30–S34 工程收口。19 怪物、双职业前七阶段 14 技能×6级、15 训练战、Recovery、Developer Preset、M7 SaveV2 和 mobile/exit 统一接线；run `35690650510` 与 S17 evidence run 全绿。固定哈希 Drive 分片静态生成 private-original standalone，SHA-256 `6ba49699...cc782b`。M7 Engineering Gate 通过，Human Playability Gate 等待用户试玩；PR #42 不合并 main。**

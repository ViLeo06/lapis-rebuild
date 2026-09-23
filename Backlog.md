# Backlog

> 2026-09-23 | Web-first | Plan v3.7 | M7 engineering + human playability gates passed | active: next milestone definition

## 已完成基线

- [x] PR #2 Web-first/G2/M3 基线已合并 main。
- [x] PR #3 2.2 安装包归档登记已合并 main。
- [x] PR #4 Quest/NPC 静态内容与稳定性已合并 main。
- [x] PR #5 readiness / battle entry / AI grammar / visual fix 等战斗考古收口已合并 main。
- [x] 第一波 S1–S5：PR #7–#11 已独立审阅、CI 全绿并合并 main。
- [x] Vite/TypeScript/Phaser、双地图、B100/B109、MagicRes 诊断、装备、存档、离线单 HTML。
- [x] 30 分钟真实墙钟 Web soak：run `34969057806` success。
- [x] v4 fixed-hash 2.2 private-original smoke：run `35059120452` success。

## 人工验证 / 视觉正确性

- [x] SPR span 相对 transparent skip 修复，并由用户人工复测确认。
- [x] B100/B109 Body_ raw direction `S,SW,W,NW,N,NE,E,SE`；east/west 修复并人工复测确认。
- [x] 正常移动 route polyline 移除；bounds/anchor 默认隐藏，仅 Debug Panel opt-in。
- [x] v4 使用 20 格 readiness、满槽门禁、MOVE/ATTACK/REST=6/4/5、离散 tick +1；500ms 仍标 `RECOVERED_SECONDARY`。
- [x] S6/S7 后已重新人工式试玩：field interaction → battle entry、行动等待、AI、攻击/受击、施法、结算、返回。
- [x] S6/S7/S14 已复核 ANI cadence、hit reaction、MagicRes 临时策略与可玩表现；未恢复的 retail placement/occlusion/audio 语义继续保留边界。

## S1 Encounter — 已收口

- [x] world entity type `101..103` + Manhattan `<4` → `49 21 01 + uint16(+0x1C)`。
- [x] 其他 world entity path → `08 + uint16(+0xB4)`；两个字段不是同一个 runtime word。
- [x] scene object + Manhattan `<9` → `49 04 02 00 + uint16(runtime +0x80)`。
- [x] inbound `0x98 mode 1` 提供 explicit `battleZoneId` + optional grid geometry；client 加载 `sz-%04d.mmf`。
- [x] 明确没有证据支持通用客户端 `fieldMapId -> battleZoneId` 公式。
- [x] `1030->1 / 1070->3 / 1090->7 / 1100->9` 仅保留 `RECOVERED_SECONDARY`，默认不当 retail truth。
- [ ] 若未来拿到 server source / packet capture / preserved protocol，再恢复真正的 eligibility 与 authoritative field/object/event→battleZone 映射。

## S2 Enemy AI — 已收口

- [x] roster stride `0xC8`；unit key `+0x00`；category `+0xB8`；local behavior string `+0xC4`。
- [x] 100-slot network AI table / stride `0x110`；入站 `6A69` 安装 program。
- [x] program precedence：network match > category 7/8 roster program > empty fallback；其他 category 走 alternate handler。
- [x] eligible target pool 最终使用 `rand()%candidate_count`，没有在 pool 内再做 nearest-distance ranking。
- [x] client 在发 `6A89` 前完成 action/target/placement 数据准备；server 最终 validation/application 仍未知。
- [ ] 具体历史 `enemy/roster id -> non-default AI program` 需要真实 roster/session/6A69 capture；当前静态客户端没有保存这些 live payload。
- [ ] `AREA/SOILDER` 具体游戏语义和多可行格 placement tie-break 仍待独立证据。

## S3 Damage — 已收口

- [x] `6A/82` 普攻 uplink 不携带最终 damage。
- [x] `6A/05` 下行 authoritative signed absolute HP；client 直接写 live HP，再算 delta 做表现。
- [x] ability/item/magic authored hit/evasion/critical/damage/defence/magic 字段已固定位置和哈希。
- [x] `ability.atr` column 25 `cry` 已证明是受击表现选择字段。
- [x] 本地 `%9/%5` RNG 位于 HP 结果已知之后，不作为 damage RNG 证据。
- [x] 正式结论：exact retail physical/magic hit/damage/critical/defence/elemental formula 当前不能从 client path 恢复。
- [x] 离线可玩数值已集中进入 S19 `ReconstructionCombatBalance`；authored retail stats 与 reconstruction formula 分层保存。
- [ ] 若未来反推原公式，需 packet/stat/video corpus 做单变量控制和 held-out 验证。

## S4 Quest/NPC — 已收口

- [x] field interaction handler 内无本地 `object -> dialogue/quest/reward/warp/battle` 总表。
- [x] NPCScript block selector 由 server `0x92` payload 提供。
- [x] NPCScript numeric tuples 已证明进入 `SetRect`，属于 UI geometry，不是世界 placement。
- [x] Quest `(questIndex, stepIndex)` 由 `0x2B` / grouped `6A55` 下发给 client presentation loader。
- [x] Employ confirmation 发送 `0x4E/0x4D`；当前路径未直接完成最终 roster mutation。
- [x] Warp UI 发送 `A4 02`、随后 `A4 01 + selected`；selection 本身不等于已证明的 client-authoritative map switch。
- [x] 明确不能用 `SMF object_id == NPCScript blockId` 或 Quest 数字相等关系硬绑。
- [ ] condition / reward / recruitment / warp acceptance / Quest-driven battle 等旧 server rule 需要重构 policy 或未来服务端证据。

## S5 Visual Fidelity — 已收口

- [x] ANI common consumer：`frame_interval_ms = 1000 / raw_timing`；QPC/Frequency 归一到毫秒。
- [x] 至少一个 consumer 使用 `1000 / (raw_timing - 1)`；因此保留 raw timing + consumer-specific policy。
- [x] character action state 数字直接映射 `B%03d_%02d.ani`。
- [x] authoritative HP loss → hit SFX → action state 3；`_03` runtime-verified 为 hit reaction。
- [x] zone-driven BGM 选择与 `Sound/NDS-8%03d.mid` 路径已恢复。
- [x] 全部 1,097 SMF / 178,227 records 的 signed `layer` 都是 `-1`，不能拿它做前景 z-order。
- [x] FOCUS/_FOCUS 保留原始 row，不套 Body_ direction semantics。
- [ ] universal death state / exact attacker impact frame。
- [ ] MagicRes placement / anchor / blend / stage transition / multi-effect composition。
- [ ] SMF flags → foreground occlusion 语义。
- [ ] 完整 magic/death/attack SFX trigger，BGM fade/restart/loop。

## S6 Runtime Integration — 已收口

- [x] 建立 InteractionIntent / BattleEntry 显式权威边界。
- [x] 接入 world/scene-object interaction gate 与 provenance。
- [x] AI program source/precedence 与训练 reconstruction AI 分层。
- [x] RetailAuthoredStats 与 ReconstructionDamagePolicy 分层。
- [x] Quest/NPC server-selected presentation boundary + offline reconstruction authority。
- [x] ANI raw timing、state3 hit reaction、zone BGM selector 接入。
- [x] death / MagicRes placement / occlusion 等未知项保留可替换 policy。
- [x] field → battle → action/result → return 可玩闭环。
- [x] 剑士、巫师代表动作/技能通过浏览器回归。

## S7 Release Validation — 已收口

- [x] fixed-hash 2.2 private-original smoke。
- [x] standalone single HTML。
- [x] Chromium browser + offline tests。
- [x] 人工式完整试玩。
- [x] provenance / copyright boundary 复核。

## M4 S8–S14 — 已收口

- [x] S8 Game UI：默认玩家 HUD / Battle HUD / menu；Developer diagnostics opt-in。
- [x] S9 World/Quest：数据驱动 reconstruction quest slice 与 world authority。
- [x] S10 Battle Presentation：attack/hit/death/magic/audio presentation policy 分层。
- [x] S11 Swordsman/Wizard：职业目录、合法装备、代表技能、MP/range/effect 数据。
- [x] S12 Progression/Save：inventory/equipment/reward/EXP/SaveV2/migration。
- [x] S13 Runtime Integration：五条模块统一接入旧 S7 Phaser runtime；merge `8b437124cc5d2242af080191ef8ca92764a47615`。
- [x] S14 manual-style swordsman quest path：quest complete / 15 gold / 300 EXP / Lv3 / SaveV2。
- [x] S14 wizard：authored HP/MP + visible magic + diagnostics opt-in。
- [x] S14 fixed-hash final run `35281047574`：synthetic + private-original 全成功。
- [x] S14 新版 M4 30 分钟真实墙钟 soak：`1,800,543 ms`、59 samples、0 page error、0 external request。
- [x] 最终 HTML：8,709,711 bytes；SHA-256 `28ef2dcadeb0e3e7216f9b21cff44e725b54b2854944230df0db7c5433fd462c`。
- [x] 验收报告：`docs/validation/s14-m4-release-20260918.md`。

## M5 S15–S19 — 工程验收已收口

- [x] S15 Viewport / Camera / Fullscreen：全屏、responsive viewport、zoom、camera-follow/clamp、坐标适配。
- [x] S16 NPC Visual Recovery：NPC/world-character visual inventory、catalog/gallery；M5 private runtime 使用 B1001 原客户端像素。
- [x] S17 Monster Visual Recovery：monster visual catalog/gallery；M5 runtime 使用 B4524/B4544 原客户端像素。
- [x] S18 World Scene Transition：空间 door/exit trigger；map1 → map7 → map1 自动场景切换。
- [x] S19 Reconstruction Combat Balance：集中数值层、simulator、enemy tiers、reward；live battle 已对齐 S19 cadence。
- [x] S19 balance v2：减算型 reconstruction `round(offense * multiplier - defense * 0.65)`；PR #27 日服候选式仅作为外部校准方向，不当 mainland retail formula。
- [x] PR #29 M5 统一接线已合并 main：`efbadaf0b0781ee205bd7a2541b265a41c7929e9`。
- [x] fixed-hash final run `35405864082`：synthetic + private-original + Chromium/offline success。
- [x] private M5 玩家闭环：可见 NPC → 接任务 → 自动进屋 → 可见怪物 → 2v1 胜利 → 返回交任务 → SaveV2。
- [x] 30 分钟 M5 wall-clock soak：`1,800,406 ms` / 59 samples / 0 page error / 0 external request。
- [x] 最终 M5 HTML：11,190,078 bytes；SHA-256 `12cd51547679d4aae225f5382941ddd93c878e3a93a56910607012f5fe3d9140`。
- [x] 用户亲自试玩最终 M5.1 S24 HTML：2026-09-20 明确确认通过；M5 Playability Gate 关闭。

## M5.1 S20–S24 — 已收口

- [x] S20 Original UI Archaeology：原版/同期 UI reference pack、HUD 区域映射、TDG parser/probe、资产 manifest。
- [x] S21 Original HUD Shell：紧凑顶部/底部结构、右上任务区、半透明、原版结构 placeholder、Developer diagnostics opt-in。
- [x] S22 NPC Pointer：真实 world-space hit target、NPC click-before-move arbitration、pointer/E 共用 interaction authority。
- [x] S23 NPC Dialogue/Quest：显式 Accept/Decline/Turn in/Close、stale-session 防重、胜负/任务阶段正确衔接。
- [x] S24 desktop + mobile input：NPC 点击/触控、对话、移动、目标、技能、任务闭环。
- [x] 延迟追中相机：移动时缓慢追赶，停下后收敛到中心；地图边界 clamp 保持。
- [x] 战斗主动撤退：退出请求 → 确认/取消；退出不发奖励、不算胜利，并抑制立即重复触发。
- [x] 最终 executable head：`97bd5063749a15e114ce85119015f9dcb8b7afc0`。
- [x] run `35442734082`：synthetic + fixed-hash private-original + Chromium/offline success；E2E `58 passed / 4 skipped / 0 failed`。
- [x] 最终 artifact `10583854810`；single HTML 11,214,215 bytes；SHA-256 `0ddc54035f88c6b9c0e13a31fa621ac4a74a4455fb40e9959076fded34a201b7`。
- [x] 2026-09-20 用户亲自试玩通过，批准收口并进入 M6。

## M6 S25–S29 — 已收口

### S25 Dual-class Matrix / Data Archaeology
- [x] 建立剑士 B100–B190、巫师 B109–B199 共 20 阶段统一矩阵。
- [x] 固定视觉 family、authored stats、技能/魔法、装备与阶段证据边界。
- [x] server-boundary 与 reconstruction policy 单独标注，不把弱证据升级为原版事实。

### S26 Swordsman Ten-stage Progression
- [x] 剑士 `100→190` 十阶段 progression domain。
- [x] 阶段视觉、属性、装备、三技能 M5.1 兼容、promotion 与 SaveV2。
- [x] 单元/浏览器回归通过。

### S27 Wizard Ten-stage Progression
- [x] 原 S27 分支无实现；由 S29 接管并补齐。
- [x] 巫师 `109→199` 十阶段、MP/魔法、装备、三技能 M5.1 兼容、promotion 与 SaveV2。
- [x] authored `19401/19501` 继续作为证据保留，不虚构未实现效果。

### S28 World / Quest / Equipment Expansion
- [x] M6 progression / quest-chain / equipment / save migration authority 接入。
- [x] authored data 与 reconstruction reward/condition/formula 分层。
- [x] 玩家装备路径经 M6 equipment authority 验证。

### S29 M6 Integration / Acceptance
- [x] S25/S26/S28 汇入 S29；S27 在 S29 补齐并统一生产 runtime。
- [x] 生产 class catalog 包含 20 个职业阶段；剑士 `100→190`、巫师 `109→199`。
- [x] M6 SaveV2 extension + M5.1 SaveV2 migration。
- [x] private real-resource browser acceptance：`61 passed / 4 skipped / 0 failed`。
- [x] final M6 validation run `35562393435` success。
- [x] 新 30 分钟 M6 wall-clock soak：`1,800,634 ms`，0 page error，0 external request。
- [x] 最终 private HTML：22,968,621 bytes；SHA-256 `f509c71b69ae5b41419a1f9c397108200bad1a1ef449f386927378d7d0ae59b4`。
- [x] 2026-09-21 用户亲自试玩确认无问题；M6 human gate 通过。

## M7 S30–S34 — Combat Content Expansion

### S30 Monster Catalog / Difficulty
- [x] 19 个固定等级怪物 archetype，覆盖 Lv1–65 七等级段。
- [x] melee / high-offense / high-defense / fast / ranged / tank / DOT / control / magic / healer / elite / boss 覆盖。
- [x] Lv26 self-healing monster 可用于灰烬/healingBlocked 验收。
- [x] 怪物等级/属性不随玩家等级自动缩放；数值统一标 `M7MonsterBalancePolicy / RECONSTRUCTION_POLICY`。
- [x] PR #43，集成 SHA `e26e68c9b28d98f4311490741a136723a2b064f2`。

### S31 Swordsman Seven-stage Skills
- [x] 前七技能全部实现，Stage 解锁为 Lv1/6/16/26/36/46/56。
- [x] 7 技能 × 6 级 = 42 skill-level states。
- [x] 舍身为 60s 持续 Buff + 10s 周期 HP 代价 + 1 HP floor；与爆发独立。
- [x] 强防仅降低物理伤害；重击与打晕控制定位分离。
- [x] PR #45，集成 SHA `911872bbc3b035090890c104c1e8884789b8e728`。

### S32 Wizard Seven-stage Skills
- [x] 前七技能全部实现，Stage 解锁为 Lv1/6/16/26/36/46/56。
- [x] 7 技能 × 6 级 = 42 skill-level states。
- [x] 毒雾 INT scaling + DOT；自然力量 staff hit 吸 MP；灰烬禁疗；石化行动/普通攻击限制；黑暗之帐与失明分离；诅咒之剑一次双倍窗口。
- [x] PR #46，集成 SHA `aec7d519c56443aca71e67440d7ed1971e07c906`。

### S33 Training / Recovery / Developer Preset
- [x] 15 场训练战：推荐等级 2/5/6/10/15/16/25/26/35/36/45/46/55/56/65。
- [x] 15 个 original-client battle zone 目标：1/3/9/11/13/15/21/23/31/41/51/61/71/81/91。
- [x] HP +200 / MP +200，readiness cost 10，无限次数，不消耗道具。
- [x] 双职业 Developer Preset + Unlock All Skills Lv6；Debug 状态阻止污染普通 SaveV2。
- [x] 手机端 Training/Recovery/Skill/Exit 全可触控。
- [x] PR #44，集成 SHA `26ffefbcb8a764a062994293034dd2fb7752216b`。

### S34 Integration / Acceptance
- [x] S30–S33 精确 head 先集成至 S34；最终由 PR #42 统一合并 main。
- [x] production first-seven promotion axis 改为 6/16/26/36/46/56，同时保留 M6 Stage 8–10。
- [x] shared battle core 使用 fixed concrete S30 roster + explicit battle zone。
- [x] M7 status/skill runtime、healer/禁疗、DOT、stun、petrify、Sacrifice、Recovery、SaveV2 接入。
- [x] Web/parser run `35690650510` success：84 parser + 269 unit + 72 Playwright passed / 4 skipped / 0 failed。
- [x] S17 evidence run `35690650505` success。
- [x] Drive 18-part 安装包静态重组 SHA 精确匹配固定 2.2；原 EXE/DLL 未执行。
- [x] private pack 3,771 indexed files / 89,656,141 bytes / 0 integrity failures。
- [x] 历史工程 standalone：122,196,302 bytes；SHA-256 `6ba496998b507c7ab863cc219acbcf2e9e2508abca5cb98ebaaac97032cc782b`；该字节快照未持久化供下载。
- [x] 当前用户 handoff standalone：`lapis-m7-private-62566a5-handoff.html`，122,196,302 bytes；SHA-256 `4c337dd2cb34f838d961207eeb2a126a4c146089dae07cdcdda069f54eec156f`；3,772/3,772 内嵌项校验通过。
- [x] S34 五项试玩修复最终 CI：run `35834469240` success；集成 head `80e7c4307156b18a31c3631542c304d3cf5969b8` 与 CI head `dd6a8383963df667c4013004a0667080ae2bd201` tree 一致（`1b44600e5d352649f766f054be63dd971614765a`）。
- [x] 最终用户试玩版：`lapis-s34-final-playtest-20260923.html`，122,226,459 bytes；SHA-256 `862eceb493e87ff53be2d102923b67441eef7791193a1f73ea13649e59f6e409`；private pack 3,771/3,771 size/SHA 校验通过，0 missing / 0 integrity failure。
- [x] 遗留 PR #43–#46 文件级审计后确认已被 S34 吸收并关闭为 superseded；未重复 merge 旧 worker 分支。
- [x] **用户于 2026-09-23 亲自试玩最终 S34 standalone SHA `862eceb493e87ff53be2d102923b67441eef7791193a1f73ea13649e59f6e409` 并确认 M7 Human Playability Gate 通过。**
- [x] PR #42 已在用户明确批准后合并 main；merge commit `6094aae3c4ff0a04af5dd4376f2b59b8b342d430`。

## 下一步

- [x] M7/S34 用户试玩、证据更新、遗留 PR 清理与 main 合并全部收口。
- [ ] 与用户确认下一任务/里程碑后，再从 `main@6094aae3c4ff0a04af5dd4376f2b59b8b342d430` 新建功能分支。
- [ ] 下一阶段启动时同步升级 Plan/Backlog，并明确新的人工验收门与证据边界。
- [ ] 若出现 M7 回归，单独登记新缺陷并引用已验收 artifact SHA `862eceb4...e409` 与 merge `6094aae3...`，不改写历史验收。
- [x] 按 MVP 顺序完成一轮当前客户端非战斗场景实测：`cap-018.bmp`–`cap-026.bmp` 新增户外地图、自由行走/镜头跟随、仓库管理员对话选项与仓库 UI 证据；记录见 `docs/validation/manual-20260923-town-exploration.md`。只有 UI 级实测，不将当前 YBCS 标记外推至固定资产 2.2 或历史国服。
- [ ] 延续 `docs/validation/manual-20260923-combat-materials-plan.md`：寻找可确认的战斗入口，实测 FIELD→BATTLE、MOVE/ATTACK/REST/MAGIC、敌方行动、结算和 RETURN。战斗信息面板、NPC 名称/问候及场景选择都不视作已经进入 battle scene；每个动作单独留证，继续区分 YBCS 当前客户端、本项目固定资产 2.2 与历史资料，不据此启动共享 runtime 大改。
- [ ] 原客户端复测剧情1入口：确认 `参加` 后实际进入 battle scene 所需的第二步交互/资格条件；不得把一次客户端观察直接升级为服务器规则。
- [x] 归档本次当前客户端实机素材：城镇仓库 `cap-018.bmp`–`cap-026.bmp` 共 9 张及 session03 `cap-027.bmp`–`cap-057.bmp` 共 31 张，私有 Drive 保存两批原图 ZIP/清单及第三批总览图，Git 保存观察报告和第三批逐图 SHA-256 索引；见 `docs/validation/manual-20260923-town-exploration.md` 与 `docs/validation/manual-20260923-mvp-exploration-session03.md`。
- [ ] 用 session03 的城镇/室内/NPC 样本对本地 Web 做同场景人工对照：点击目标标记与约 4 秒后镜头/角色位置、街道↔道具屋/锻造屋落点、问候/肖像/选项、F8 小地图及 F3/F4/F5 面板。逐项保存重建侧画面并记录差异，避免仅凭原客户端截图声称 Web 已有缺陷。

## 边界

- 第一波 S1–S5 已关闭，不再向旧分支追加共享运行时改动。
- 当前旧 server/source/capture 缺失不是“多扫几遍客户端”就一定能解决；缺口必须显式落在 reconstruction policy 层。
- 原安装器、未知 DLL 不在普通环境/CI 执行；`NeoDark.exe` 仅在用户本轮明确授权的已打开 Windows 当前会话中按 `AGENTS.md` 第 5 节观察，CI 永不执行；UPX 只做固定哈希静态解包。
- compatibility / reverse-engineering secondary source 不能自动升级为 retail fact。
- battle scene 内容不等于 field→zone 触发映射；client authored stats 不等于 server formula。
- 原版正文和大量版权资源不进入 Git，公开发布需单独授权/审查。

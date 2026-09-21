# Backlog

> 2026-09-21 | Web-first | Plan v3.5 | M6 user gate passed | active: next milestone planning

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

## 下一里程碑 — 方案讨论中

- [ ] 怪物内容扩充与等级/难度梯度：方案待确认。
- [ ] 剑士/巫师各阶段实际技能补齐：方案待确认。
- [ ] 训练营多 battle scene / 怪物组合选择：方案待确认。
- [ ] HP/MP 恢复动作与无限调试道具：方案待确认。
- [ ] 正式编号、任务拆分、文件所有权与验收标准：待用户确认方案后再立项。

## 边界

- 第一波 S1–S5 已关闭，不再向旧分支追加共享运行时改动。
- 当前旧 server/source/capture 缺失不是“多扫几遍客户端”就一定能解决；缺口必须显式落在 reconstruction policy 层。
- 原安装器、`NeoDark.exe`、未知 DLL 不在普通环境/CI 执行；UPX 只做固定哈希静态解包。
- compatibility / reverse-engineering secondary source 不能自动升级为 retail fact。
- battle scene 内容不等于 field→zone 触发映射；client authored stats 不等于 server formula。
- 原版正文和大量版权资源不进入 Git，公开发布需单独授权/审查。

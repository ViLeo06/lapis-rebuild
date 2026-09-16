# Backlog

> 2026-09-16 | Web-first | Plan v2.7 | post S1–S5 closure | next: S6 Runtime Integration

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
- [ ] S6 完成后重新人工试玩：field interaction → battle entry、行动等待、AI、攻击/受击、施法、结算、返回。
- [ ] S6 视觉整合后重点复核 ANI cadence、hit reaction、BGM、MagicRes 临时策略和遮挡。

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
- [ ] S6 若需要离线可玩数值，只能集中实现显式 `RECONSTRUCTION_POLICY`，authored retail stats 与公式分层保存。
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

## S6 Runtime Integration — 下一步

分支建议：`codex/runtime-integration`

- [ ] 建立 `InteractionIntent -> EncounterAuthority -> BattleEntry`，显式传入 `battleZoneId`，禁止 field map 猜 battle map。
- [ ] 接入 world entity `<4` / scene object `<9` 两套交互 gate，保留不同 runtime id 字段和 provenance。
- [ ] 建立 AI program source/precedence 数据模型；接入已恢复 candidate selection，不把训练 AI 冒充历史具体 program。
- [ ] 分开 `RetailAuthoredStats` 与 `ReconstructionDamagePolicy`；所有临时伤害公式集中、可替换、显式 UNVERIFIED。
- [ ] 建立 Quest/NPC server-selected presentation state + offline reconstruction authority；禁止数字 ID 直连世界实体。
- [ ] 接入 ANI raw timing policy、state3 hit reaction、zone BGM。
- [ ] death / MagicRes placement / occlusion 等未知项只做可替换 policy，不写成 VERIFIED。
- [ ] 形成新的 field → interaction → authority → battle → action → result → return 可玩闭环。
- [ ] 剑士和巫师都走通普通攻击 + 至少代表技能。
- [ ] unit tests + Chromium E2E + standalone synthetic preview 全绿。
- [ ] 整理 S6 integration report / PR；合并前做独立审查。

## S7 Release Validation — S6 后执行

- [ ] fixed-hash 2.2 private-original smoke。
- [ ] 重新生成 standalone single HTML。
- [ ] Chromium browser + offline tests。
- [ ] 人工式完整试玩与人物/地图/战斗/特效/音频 spot-check。
- [ ] 必要时重新跑 30 分钟真实墙钟 soak。
- [ ] 检查版权资源没有进入 Git。
- [ ] 检查 `UNVERIFIED/RECONSTRUCTION_POLICY` 没有误标 original/recovered。
- [ ] 形成 validation report。

## M5+ 后续

- [ ] 完整背包/装备规则、等级/转职、技能树、正式任务链和地图流程。
- [ ] 剑士/巫师十阶段职业矩阵。
- [ ] 公开部署前完成访问控制、版权和发布授权审查。

## 边界

- 第一波 S1–S5 已关闭，不再向旧分支追加共享运行时改动。
- 当前旧 server/source/capture 缺失不是“多扫几遍客户端”就一定能解决；缺口必须显式落在 reconstruction policy 层。
- 原安装器、`NeoDark.exe`、未知 DLL 不在普通环境/CI 执行；UPX 只做固定哈希静态解包。
- compatibility / reverse-engineering secondary source 不能自动升级为 retail fact。
- battle scene 内容不等于 field→zone 触发映射；client authored stats 不等于 server formula。
- 原版正文和大量版权资源不进入 Git，公开发布需单独授权/审查。

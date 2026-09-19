# M6 Dual-class Ten-stage Canonical Matrix

> S25 authoritative human-readable companion to `manifests/m6-dual-class-ten-stage-matrix.json`.
> Baseline: `4aea5b81fa4cca00c9a80b3ff2389eb391c09b17`. Fixed-hash static probe run: `35476887492`.

## 1. 结论

S25 已把大陆 2.2 固定哈希客户端中，剑士 `100..190` 与巫师 `109..199` 共 20 个阶段整理为同一数据契约。能够静态证明的范围明显大于 M5.1：除了 HP/MP/move/hit，还恢复了 `con/mcon/wis/mwis/str/mstr/dex/mdex/int/mint/reg/mreg`、`elu/blow/melu`、readiness 原始字段、逐阶段 `levelabl.atr` 200 行、10 条 `Magictbl.atr` 技能记录、对应 MagicPtn 表现行，以及 200/200 个目标 ANI/SPR 文件存在性。

这并不等于恢复了旧服务器。**转职触发、技能最终解锁条件、EXP 公式、属性应用公式、装备最终资格、任务条件、奖励、伤害公式仍是 SERVER-BOUNDARY 或 UNVERIFIED。**

`dex` 是原始字段名；S25 不把它静默改名为 `AGI`。`m*` 字段也原样保存，不解释成某种乘数/上限/成长公式。

## 2. 固定来源与复现链

- 安装包 SHA-256: `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88`
- `Set.lib` SHA-256: `ce1bb0425b367289f144e0780147f7c63abb833733035949853ce70dfb3c82fe`
- `ability.atr`: `0bab4c622336378e52fb0d13b6e5d50a78f2c514d687332d47042c416a07c04b`
- `levelabl.atr`: `0766b9ab5c357e1e830708ca90589cbe715bf02265e185a4c6ae900eefe287dc`
- `itemtbl.atr`: `cf5c9786810b80619ae3133ad77a27d9fb51f2078c30c947c482483d1030eb2e`
- `Magictbl.atr`: `d885bbd1bddffd3d4bf05b2b4e36232c62d94fc78209d46861b01986779ef0d9`
- `Magicptn.atr`: `5affdd750873e7ccb5a364cc372870b98cde95df905140fa88aedd79155cfceb`
- Drive visual inventory: `lapis-rebuild-assets/30_parsed/tables/client-files-verified-20260915.csv`, SHA-256 `ccef8ede9627a27f167c63d0896c32c006b12de49af068f466199808b2f849ce`.
- GitHub Actions fixed-hash S25 run `35476887492`; source artifact digest `sha256:6374e56df74bd9599f445309b76b26aaf9b6593ecf138da151a687a294e201e0`.

工作流只做静态下载、哈希校验、解包、表格/资源 inventory；没有运行原安装器或 `NeoDark.exe`。

## 3. 剑士十阶段

| 阶 | ID | 名称 | HP/MP | STR/INT/DEX | hit/elu/blow | mhit/melu | authored DEF | levelabl 内部等级 | authored EXP 首→末 | next-class hint | levelabl→Magic |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | --- |
| 1 | 100 | 见习剑士 | 125/100 | 10/10/10 | 160/2/2 | 160/5 | 5 | 1..5 | 500 → 6300 | 110 | 1101 重击(Lv1) / MP 25 |
| 2 | 110 | 剑士 | 137/105 | 10/10/10 | 160/4/2 | 160/7 | 5 | 1..10 | 8505 → 44033 | 120 | 1201 连砍(Lv1) / MP 23 |
| 3 | 120 | 高级剑士 | 150/110 | 10/10/10 | 170/6/3 | 170/9 | 5 | 1..10 | 55042 → 410090 | 130 | 1301 强防(Lv1) / MP 20 |
| 4 | 130 | 剑术师范 | 162/115 | 10/10/10 | 170/8/3 | 170/11 | 5 | 1..10 | 512612 → 1276765 | 140 | 1401 爆发(Lv1) / MP 20 |
| 5 | 140 | 皇家剑士 | 175/120 | 10/10/10 | 180/10/4 | 180/13 | 5 | 1..10 | 1391674 → 3022566 | 150 | 1501 舍身(Lv1) / MP 20 |
| 6 | 150 | 狂战士 | 187/125 | 10/10/10 | 180/12/4 | 180/15 | 5 | 1..10 | 3294598 → 7155515 | 160 | — |
| 7 | 160 | 大剑师 | 200/130 | 10/10/10 | 190/14/5 | 190/17 | 5 | 1..10 | 7799511 → 16939705 | 170 | — |
| 8 | 170 | 英雄 | 212/135 | 10/10/10 | 190/16/5 | 190/19 | 5 | 1..10 | 18464279 → 40102443 | 180 | — |
| 9 | 180 | 战神 | 225/140 | 10/10/10 | 200/18/6 | 200/21 | 5 | 1..10 | 43711663 → 94937067 | 190 | — |
| 10 | 190 | 传说战神 | 237/145 | 10/10/10 | 200/20/6 | 200/23 | 5 | 1..15 | 103481403 → 345806600 | — | — |

## 4. 巫师十阶段

| 阶 | ID | 名称 | HP/MP | STR/INT/DEX | hit/elu/blow | mhit/melu | authored DEF | levelabl 内部等级 | authored EXP 首→末 | next-class hint | levelabl→Magic |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | --- |
| 1 | 109 | 见习巫师 | 100/130 | 10/10/10 | 160/2/2 | 160/10 | 0 | 1..5 | 500 → 6300 | 119 | 19101 黑暗之帐(Lv1) / MP 20 |
| 2 | 119 | 巫师 | 110/136 | 10/10/10 | 160/4/3 | 160/12 | 0 | 1..10 | 8505 → 44033 | 129 | 19201 毒雾(Lv1) / MP 20 |
| 3 | 129 | 高级巫师 | 120/143 | 10/10/10 | 170/6/3 | 170/14 | 0 | 1..10 | 55042 → 410090 | 139 | 19301 自然力量(Lv1) / MP 20 |
| 4 | 139 | 黑暗巫师 | 130/149 | 10/10/10 | 170/8/4 | 170/16 | 0 | 1..10 | 512612 → 1276765 | 149 | 19401 灰烬(Lv1) / MP 27 |
| 5 | 149 | 咒术师 | 140/156 | 10/10/10 | 180/10/4 | 180/18 | 0 | 1..10 | 1391674 → 3022566 | 159 | 19501 诅咒之眼(Lv1) / MP 18 |
| 6 | 159 | 祭司 | 150/162 | 10/10/10 | 180/12/5 | 180/20 | 0 | 1..10 | 3294598 → 7155515 | 169 | — |
| 7 | 169 | 大祭司 | 160/169 | 10/10/10 | 190/14/5 | 190/22 | 0 | 1..10 | 7799511 → 16939705 | 179 | — |
| 8 | 179 | 亡灵法师 | 170/175 | 10/10/10 | 190/16/6 | 190/24 | 0 | 1..10 | 18464279 → 40102443 | 189 | — |
| 9 | 189 | 地狱法师 | 180/182 | 10/10/10 | 200/18/6 | 200/26 | 0 | 1..10 | 43711663 → 94937067 | 199 | — |
| 10 | 199 | 黑暗女神 | 190/188 | 10/10/10 | 200/20/6 | 200/28 | 0 | 1..15 | 103481403 → 345806600 | — | — |

### 共同 authored ability 字段

这 20 行中，`con/wis/str/dex/int/reg` 均为 10，对应 `mcon/mwis/mstr/mdex/mint/mreg` 均为 100；`sp=20`、`ran=1`、`actic=6`、`atic=4`、`rtic=5`、`mtic=100`、`command=4`、`acom=10`、`pcom=5`。剑士 `cla=0 / defence=5 / cry=0 / mov=5`；巫师 `cla=9 / defence=0 / cry=1 / mov=4`。这些是 **VERIFIED-STATIC-ORIGINAL** 表值，不是最终服务器派生属性。

## 5. levelabl 成长与阶段切换线索

固定表共有 1,397 行，目标双职业命中 200 行。原始表头明确包含 `직업 / 레벨 / con / wis / str / dex / int / reg / ... / 경험치 / ...`。

对目标链：第 1 阶有 5 个内部 level 行；第 2–9 阶各 10 行；第 10 阶 15 行。每个阶段最后一行的 `next_class_raw` 对剑士形成 `100→110→...→190`，对巫师形成 `109→119→...→199`，最终阶段保持自指。

这里必须分两层：

- 行、内部 level、`experience_value`、`next_class_raw` 等数字是 **VERIFIED-STATIC-ORIGINAL**；
- “达到该内部 level 就由原服务器无条件转职”只是 **INFERRED**，不能当成原版规则；
- quest、NPC、物品、服务端资格判断与真正 promotion authority 仍是 **SERVER-BOUNDARY**。

因此 S26/S27 可以把这个结构当作离线重构 policy 的强候选输入，但必须把采用规则本身标成 `RECONSTRUCTION_POLICY`。

## 6. 技能 / 魔法绑定

`levelabl.atr` column 14 与 `Magictbl.atr` 的 exact-ID join 共得到 10 条目标记录：

| 职业 | 阶段 | ID | 名称 | MP | Dist | Area | Att | MagicPtn | 说明 |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 剑士 | 100 | 1101 | 重击(Lv1) | 25 | 1 | 0 | 8 | 1 | 用剑强烈攻击而致使敌人晕倒. |
| 剑士 | 110 | 1201 | 连砍(Lv1) | 23 | 1 | 0 | 8 | 2 | 用剑连续攻击两次. |
| 剑士 | 120 | 1301 | 强防(Lv1) | 20 | 0 | 0 | 111 | 3 | 提高防御力. |
| 剑士 | 130 | 1401 | 爆发(Lv1) | 20 | 0 | 0 | 111 | 4 | 提高力量和生命,_但降低防御力. |
| 剑士 | 140 | 1501 | 舍身(Lv1) | 20 | 0 | 0 | 111 | 5 | 消耗自己的生命来提高攻击力. |
| 巫师 | 109 | 19101 | 黑暗之帐(Lv1) | 20 | 2 | 0 | 122 | 181 | 降低命中率. |
| 巫师 | 119 | 19201 | 毒雾(Lv1) | 20 | 4 | 1 | 16 | 182 | 用毒使其中毒. |
| 巫师 | 129 | 19301 | 自然力量(Lv1) | 20 | 0 | 0 | 111 | 183 | 用手杖攻击的时候,_吸收魔法力. |
| 巫师 | 139 | 19401 | 灰烬(Lv1) | 27 | 3 | 2 | 122 | 184 | 阻止体力的恢复. |
| 巫师 | 149 | 19501 | 诅咒之眼(Lv1) | 18 | 4 | 2 | 122 | 185 | 把敌人石化,_防止敌人行动. |

这些 ID、MP、Dist、Area、Att、EA/EB/EC、MagicPtn 等字段是 **VERIFIED-STATIC-ORIGINAL**。但 EA/EB/EC 不是已恢复的伤害公式；target/team 的最终玩法语义、技能状态效果算术与 server unlock condition 不得从字段名直接补齐。

150/159 之后 column 14 为 0，只能说“该列未给出新的 Magictbl 引用”，**不能推导为后五阶段不存在技能**。`levelabl` 另外还有 `사용기술 / 고용용병` 数值列（剑士 21101..21110、巫师 21901..21910 等），S25 保留这些值，但尚未恢复其针对玩家阶段的消费语义，标为 `UNVERIFIED`。

## 7. Visual family

20 阶段均存在 `B<stage>_00/01/02/03/05` 的 ANI 与 SPR，对应总计 **200/200** 文件。固定哈希 CI 与 Drive verified inventory 双重交叉验证。

- 数字 action state → `B%03d_%02d.ani`：`VERIFIED-STATIC-ORIGINAL`；
- `_03` hit reaction：`VERIFIED-STATIC-ORIGINAL`；
- `_00` idle、`_01` move、`_02` attack/cast：`RECOVERED_SECONDARY`；
- `_05` 的统一语义：`UNVERIFIED`；
- MagicRes placement / anchor / blend / stage composition：继续 `UNVERIFIED`。

## 8. Equipment / item 证据

S25 新确认 `itemtbl.atr` 原始表头包含：

- `장착위`（装备位置字段）
- `장착렙`（装备等级字段）
- 10 个布尔样职业/兵种列 `보/비/기/수/창/궁/승/신/마/사`
- min/max damage、DEF、magic power、magic DEF、命中/回避等既有字段
- `con/str/dex/int/wis/reg`

代表物品 1/3/10/12/25/31 的这些字段已进入 canonical matrix。剑士 `ability.cla=0`、巫师 `cla=9`，而样例剑装/巫师装分别在 item flag index 0/9 上呈现一致性，因此 `item_flag[cla]` 是一个很强的**静态候选关系**。但 S25 没有恢复对应的原客户端 consumer，故这个映射仍标 **INFERRED**，最终 class/stage eligibility 仍标 **SERVER-BOUNDARY**。

`장착렙` 字段存在本身可证明；“服务器如何执行该等级要求、是否还有其它条件”不能证明。

## 9. 仍不能声称恢复的内容

- 原版完整 EXP 公式；当前只恢复显式 `experience_value` 表值。
- 原版 promotion 触发等级/条件；当前只有 client-authored `next_class_raw` hint。
- 属性增长的最终应用公式，尤其 `m*` 字段含义。
- skill unlock 的服务端条件、完整技能 roster。
- equipment 的最终职业/阶段/等级合法性。
- Quest/NPC/item 驱动的转职资格和奖励。
- physical/magic hit/damage/critical/defence formula。
- ability `gold/EXP` 列的最终奖励触发语义。

以上都必须由 S26–S28 用显式 `RECONSTRUCTION_POLICY` 补，或等待更强的原始 server/runtime 证据。

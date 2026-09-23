# M7.1 S35 — Dual-class Skill Evidence Matrix

Date: 2026-09-23  
Branch: `codex/s35-m7-1-skill-evidence-matrix`  
Baseline: `main@6094aae3c4ff0a04af5dd4376f2b59b8b342d430`

## 1. Conclusion

- Recovered **60/60** fixed-client `Magictbl.atr` rows for the first five swordsman and wizard skill families, Lv1–Lv6.
- All requested raw fields (`Skill ID`, `Name`, `Att`, `Dist`, `Area`, `MP`, `Time`, `Team`, `Unit`, `EA`, `EB`, `EC`, `TICK`, `LVPT`, `MagicPtn`, `icon`, `Iter`, `Explanation`) are `VERIFIED-STATIC-ORIGINAL`.
- The ten Lv1 rows are a **10/10 exact raw-field join** with the S25 canonical matrix.
- Raw fields are not server formulas. EA/EB/EC, Time→seconds, status hit/resist, stacking and final duration remain bounded.

## 2. Fixed-hash provenance

| Layer | SHA-256 / result | Evidence |
| --- | --- | --- |
| 2.2 installer | `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88` | VERIFIED-STATIC-ORIGINAL |
| embedded 7z | `9beb606655d2553c03e80d7eda36a48c135976a3812ce5432d3b2af23e996357` | VERIFIED-STATIC-ORIGINAL |
| `Set.lib` | `ce1bb0425b367289f144e0780147f7c63abb833733035949853ce70dfb3c82fe` | VERIFIED-STATIC-ORIGINAL |
| `Magictbl.atr` | `d885bbd1bddffd3d4bf05b2b4e36232c62d94fc78209d46861b01986779ef0d9` | VERIFIED-STATIC-ORIGINAL |
| rows selected | 60 | machine-verified |
| S25 Lv1 join | 10/10 | exact |

Static path: Drive 18 parts → exact installer → exact 7z carve → static archive extraction → `Set.lib` decoder → `Magictbl.atr`. No original EXE/DLL was executed.

### User workbook boundary

`职业技能基础值与效果.xlsx` was not exposed on the current conversation, Library, or Drive connector surfaces during this S35 run. Values explicitly carried into the M7.1 task packet were cross-checked against the recovered fixed-hash table. Because `Magictbl.atr` is direct original-client evidence, this does **not** lower the 60-row raw-field evidence grade; S35 simply does not claim a cell-by-cell audit of the unavailable workbook copy.

## 3. Complete 60-row matrix

### Swordsman — 重击

| ID | Name | Att | Dist | Area | MP | Time | Team | Unit | EA | EB | EC | TICK | LVPT | MagicPtn | icon | Iter | Explanation |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1101 | 重击(Lv1) | 8 | 1 | 0 | 25 | 3 | 34 | 3 | 40 | 10 | 5 | 10 | 1 | 1 | 0 | 1 | 用剑强烈攻击而致使敌人晕倒. |
| 1102 | 重击(Lv2) | 8 | 1 | 0 | 32 | 3 | 34 | 3 | 48 | 12 | 6 | 10 | 2 | 1 | 0 | 1 | 用剑强烈攻击而致使敌人晕倒. |
| 1103 | 重击(Lv3) | 8 | 1 | 0 | 38 | 3 | 34 | 3 | 56 | 14 | 7 | 10 | 3 | 1 | 0 | 1 | 用剑强烈攻击而致使敌人晕倒. |
| 1104 | 重击(Lv4) | 8 | 1 | 0 | 44 | 3 | 34 | 3 | 64 | 16 | 8 | 10 | 4 | 1 | 0 | 1 | 用剑强烈攻击而致使敌人晕倒. |
| 1105 | 重击(Lv5) | 8 | 1 | 0 | 50 | 3 | 34 | 3 | 72 | 18 | 9 | 10 | 5 | 1 | 0 | 1 | 用剑强烈攻击而致使敌人晕倒. |
| 1106 | 重击(Lv6) | 8 | 1 | 0 | 60 | 3 | 34 | 3 | 80 | 20 | 10 | 10 | 6 | 1 | 0 | 1 | 用剑强烈攻击而致使敌人晕倒. |

Field evidence for every column above: `VERIFIED-STATIC-ORIGINAL`.

### Swordsman — 连砍

| ID | Name | Att | Dist | Area | MP | Time | Team | Unit | EA | EB | EC | TICK | LVPT | MagicPtn | icon | Iter | Explanation |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1201 | 连砍(Lv1) | 8 | 1 | 0 | 23 | 3 | 34 | 3 | 40 | 0 | 2 | 10 | 1 | 2 | 2 | 2 | 用剑连续攻击两次. |
| 1202 | 连砍(Lv2) | 8 | 1 | 0 | 29 | 3 | 34 | 3 | 48 | 0 | 2 | 10 | 2 | 2 | 2 | 2 | 用剑连续攻击两次. |
| 1203 | 连砍(Lv3) | 8 | 1 | 0 | 35 | 3 | 34 | 3 | 56 | 0 | 2 | 10 | 3 | 2 | 2 | 2 | 用剑连续攻击两次. |
| 1204 | 连砍(Lv4) | 8 | 1 | 0 | 40 | 3 | 34 | 3 | 64 | 0 | 2 | 10 | 4 | 2 | 2 | 2 | 用剑连续攻击两次. |
| 1205 | 连砍(Lv5) | 8 | 1 | 0 | 46 | 3 | 34 | 3 | 72 | 0 | 2 | 10 | 5 | 2 | 2 | 2 | 用剑连续攻击两次. |
| 1206 | 连砍(Lv6) | 8 | 1 | 0 | 55 | 3 | 34 | 3 | 80 | 0 | 2 | 10 | 6 | 2 | 2 | 2 | 用剑连续攻击两次. |

Field evidence for every column above: `VERIFIED-STATIC-ORIGINAL`.

### Swordsman — 强防

| ID | Name | Att | Dist | Area | MP | Time | Team | Unit | EA | EB | EC | TICK | LVPT | MagicPtn | icon | Iter | Explanation |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1301 | 强防(Lv1) | 111 | 0 | 0 | 20 | 3 | 34 | 3 | 20 | 45 | 0 | 15 | 1 | 3 | 4 | 1 | 提高防御力. |
| 1302 | 强防(Lv2) | 111 | 0 | 0 | 25 | 3 | 34 | 3 | 25 | 60 | 0 | 15 | 2 | 3 | 4 | 1 | 提高防御力. |
| 1303 | 强防(Lv3) | 111 | 0 | 0 | 30 | 3 | 34 | 3 | 30 | 70 | 0 | 15 | 3 | 3 | 4 | 1 | 提高防御力. |
| 1304 | 强防(Lv4) | 111 | 0 | 0 | 35 | 3 | 34 | 3 | 35 | 85 | 0 | 15 | 4 | 3 | 4 | 1 | 提高防御力. |
| 1305 | 强防(Lv5) | 111 | 0 | 0 | 40 | 3 | 34 | 3 | 40 | 95 | 0 | 15 | 5 | 3 | 4 | 1 | 提高防御力. |
| 1306 | 强防(Lv6) | 111 | 0 | 0 | 45 | 3 | 34 | 3 | 50 | 120 | 0 | 15 | 6 | 3 | 4 | 1 | 提高防御力. |

Field evidence for every column above: `VERIFIED-STATIC-ORIGINAL`.

### Swordsman — 爆发

| ID | Name | Att | Dist | Area | MP | Time | Team | Unit | EA | EB | EC | TICK | LVPT | MagicPtn | icon | Iter | Explanation |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1401 | 爆发(Lv1) | 111 | 0 | 0 | 20 | 3 | 34 | 3 | 10 | 40 | 5 | 15 | 1 | 4 | 6 | 1 | 提高力量和生命,_但降低防御力. |
| 1402 | 爆发(Lv2) | 111 | 0 | 0 | 25 | 3 | 34 | 3 | 15 | 50 | 7 | 15 | 2 | 4 | 6 | 1 | 提高力量和生命,_但降低防御力. |
| 1403 | 爆发(Lv3) | 111 | 0 | 0 | 30 | 3 | 34 | 3 | 20 | 60 | 10 | 15 | 3 | 4 | 6 | 1 | 提高力量和生命,_但降低防御力. |
| 1404 | 爆发(Lv4) | 111 | 0 | 0 | 35 | 3 | 34 | 3 | 25 | 70 | 12 | 15 | 4 | 4 | 6 | 1 | 提高力量和生命,_但降低防御力. |
| 1405 | 爆发(Lv5) | 111 | 0 | 0 | 40 | 3 | 34 | 3 | 30 | 80 | 15 | 15 | 5 | 4 | 6 | 1 | 提高力量和生命,_但降低防御力. |
| 1406 | 爆发(Lv6) | 111 | 0 | 0 | 45 | 3 | 34 | 3 | 35 | 100 | 17 | 15 | 6 | 4 | 6 | 1 | 提高力量和生命,_但降低防御力. |

Field evidence for every column above: `VERIFIED-STATIC-ORIGINAL`.

### Swordsman — 舍身

| ID | Name | Att | Dist | Area | MP | Time | Team | Unit | EA | EB | EC | TICK | LVPT | MagicPtn | icon | Iter | Explanation |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1501 | 舍身(Lv1) | 111 | 0 | 0 | 20 | 3 | 34 | 3 | 15 | 30 | 10 | 10 | 1 | 5 | 8 | 1 | 消耗自己的生命来提高攻击力. |
| 1502 | 舍身(Lv2) | 111 | 0 | 0 | 25 | 3 | 34 | 3 | 18 | 38 | 12 | 10 | 2 | 5 | 8 | 1 | 消耗自己的生命来提高攻击力. |
| 1503 | 舍身(Lv3) | 111 | 0 | 0 | 30 | 3 | 34 | 3 | 22 | 48 | 15 | 10 | 3 | 5 | 8 | 1 | 消耗自己的生命来提高攻击力. |
| 1504 | 舍身(Lv4) | 111 | 0 | 0 | 35 | 3 | 34 | 3 | 26 | 60 | 18 | 10 | 4 | 5 | 8 | 1 | 消耗自己的生命来提高攻击力. |
| 1505 | 舍身(Lv5) | 111 | 0 | 0 | 40 | 3 | 34 | 3 | 30 | 74 | 21 | 10 | 5 | 5 | 8 | 1 | 消耗自己的生命来提高攻击力. |
| 1506 | 舍身(Lv6) | 111 | 0 | 0 | 45 | 3 | 34 | 3 | 35 | 90 | 25 | 10 | 6 | 5 | 8 | 1 | 消耗自己的生命来提高攻击力. |

Field evidence for every column above: `VERIFIED-STATIC-ORIGINAL`.

### Wizard — 黑暗之帐

| ID | Name | Att | Dist | Area | MP | Time | Team | Unit | EA | EB | EC | TICK | LVPT | MagicPtn | icon | Iter | Explanation |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 19101 | 黑暗之帐(Lv1) | 122 | 2 | 0 | 20 | 3 | 34 | 3 | 5 | 10 | 0 | 15 | 1 | 181 | 360 | 1 | 降低命中率. |
| 19102 | 黑暗之帐(Lv2) | 122 | 3 | 0 | 20 | 3 | 34 | 3 | 10 | 20 | 0 | 15 | 2 | 181 | 360 | 1 | 降低命中率. |
| 19103 | 黑暗之帐(Lv3) | 122 | 3 | 1 | 25 | 3 | 34 | 3 | 10 | 30 | 0 | 15 | 3 | 181 | 360 | 1 | 降低命中率. |
| 19104 | 黑暗之帐(Lv4) | 122 | 4 | 1 | 25 | 3 | 34 | 3 | 15 | 35 | 0 | 15 | 4 | 181 | 360 | 1 | 降低命中率. |
| 19105 | 黑暗之帐(Lv5) | 122 | 4 | 2 | 30 | 3 | 34 | 3 | 20 | 40 | 0 | 15 | 5 | 181 | 360 | 1 | 降低命中率. |
| 19106 | 黑暗之帐(Lv6) | 122 | 5 | 2 | 35 | 3 | 34 | 3 | 25 | 50 | 0 | 15 | 6 | 181 | 360 | 1 | 降低命中率. |

Field evidence for every column above: `VERIFIED-STATIC-ORIGINAL`.

### Wizard — 毒雾

| ID | Name | Att | Dist | Area | MP | Time | Team | Unit | EA | EB | EC | TICK | LVPT | MagicPtn | icon | Iter | Explanation |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 19201 | 毒雾(Lv1) | 16 | 4 | 1 | 20 | 3 | 34 | 3 | -15 | 20 | 8 | 12 | 1 | 182 | 362 | 1 | 用毒使其中毒. |
| 19202 | 毒雾(Lv2) | 16 | 4 | 1 | 25 | 3 | 34 | 3 | -20 | 25 | 7 | 12 | 2 | 182 | 362 | 1 | 用毒使其中毒. |
| 19203 | 毒雾(Lv3) | 16 | 5 | 2 | 30 | 3 | 34 | 3 | -25 | 30 | 6 | 12 | 3 | 182 | 362 | 1 | 用毒使其中毒. |
| 19204 | 毒雾(Lv4) | 16 | 5 | 2 | 35 | 3 | 34 | 3 | -30 | 35 | 5 | 12 | 4 | 182 | 362 | 1 | 用毒使其中毒. |
| 19205 | 毒雾(Lv5) | 16 | 6 | 2 | 40 | 3 | 34 | 3 | -35 | 40 | 4 | 12 | 5 | 182 | 362 | 1 | 用毒使其中毒. |
| 19206 | 毒雾(Lv6) | 16 | 6 | 3 | 50 | 3 | 34 | 3 | -40 | 45 | 3 | 12 | 6 | 182 | 362 | 1 | 用毒使其中毒. |

Field evidence for every column above: `VERIFIED-STATIC-ORIGINAL`.

### Wizard — 自然力量

| ID | Name | Att | Dist | Area | MP | Time | Team | Unit | EA | EB | EC | TICK | LVPT | MagicPtn | icon | Iter | Explanation |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 19301 | 自然力量(Lv1) | 111 | 0 | 0 | 20 | 3 | 34 | 3 | 0 | 20 | 0 | 10 | 1 | 183 | 364 | 1 | 用手杖攻击的时候,_吸收魔法力. |
| 19302 | 自然力量(Lv2) | 111 | 0 | 0 | 25 | 3 | 34 | 3 | 0 | 30 | 0 | 10 | 2 | 183 | 364 | 1 | 用手杖攻击的时候,_吸收魔法力. |
| 19303 | 自然力量(Lv3) | 111 | 0 | 0 | 30 | 3 | 34 | 3 | 0 | 40 | 0 | 10 | 3 | 183 | 364 | 1 | 用手杖攻击的时候,_吸收魔法力. |
| 19304 | 自然力量(Lv4) | 111 | 0 | 0 | 35 | 3 | 34 | 3 | 0 | 50 | 0 | 10 | 4 | 183 | 364 | 1 | 用手杖攻击的时候,_吸收魔法力. |
| 19305 | 自然力量(Lv5) | 111 | 0 | 0 | 40 | 3 | 34 | 3 | 0 | 60 | 0 | 10 | 5 | 183 | 364 | 1 | 用手杖攻击的时候,_吸收魔法力. |
| 19306 | 自然力量(Lv6) | 111 | 0 | 0 | 45 | 3 | 34 | 3 | 0 | 70 | 0 | 10 | 6 | 183 | 364 | 1 | 用手杖攻击的时候,_吸收魔法力. |

Field evidence for every column above: `VERIFIED-STATIC-ORIGINAL`.

### Wizard — 灰烬

| ID | Name | Att | Dist | Area | MP | Time | Team | Unit | EA | EB | EC | TICK | LVPT | MagicPtn | icon | Iter | Explanation |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 19401 | 灰烬(Lv1) | 122 | 3 | 2 | 27 | 3 | 34 | 3 | 0 | 30 | 15 | 15 | 1 | 184 | 366 | 1 | 阻止体力的恢复. |
| 19402 | 灰烬(Lv2) | 122 | 3 | 3 | 33 | 3 | 34 | 3 | 0 | 35 | 20 | 15 | 2 | 184 | 366 | 1 | 阻止体力的恢复. |
| 19403 | 灰烬(Lv3) | 122 | 3 | 3 | 39 | 3 | 34 | 3 | 0 | 40 | 25 | 15 | 3 | 184 | 366 | 1 | 阻止体力的恢复. |
| 19404 | 灰烬(Lv4) | 122 | 4 | 4 | 45 | 3 | 34 | 3 | 0 | 45 | 30 | 15 | 4 | 184 | 366 | 1 | 阻止体力的恢复. |
| 19405 | 灰烬(Lv5) | 122 | 4 | 4 | 51 | 3 | 34 | 3 | 0 | 50 | 35 | 15 | 5 | 184 | 366 | 1 | 阻止体力的恢复. |
| 19406 | 灰烬(Lv6) | 122 | 4 | 5 | 60 | 3 | 34 | 3 | 0 | 60 | 40 | 15 | 6 | 184 | 366 | 1 | 阻止体力的恢复. |

Field evidence for every column above: `VERIFIED-STATIC-ORIGINAL`.

### Wizard — 诅咒之眼

| ID | Name | Att | Dist | Area | MP | Time | Team | Unit | EA | EB | EC | TICK | LVPT | MagicPtn | icon | Iter | Explanation |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 19501 | 诅咒之眼(Lv1) | 122 | 4 | 2 | 18 | 3 | 34 | 3 | 0 | 20 | 10 | 15 | 1 | 185 | 368 | 1 | 把敌人石化,_防止敌人行动. |
| 19502 | 诅咒之眼(Lv2) | 122 | 4 | 2 | 23 | 3 | 34 | 3 | 0 | 26 | 13 | 15 | 2 | 185 | 368 | 1 | 把敌人石化,_防止敌人行动. |
| 19503 | 诅咒之眼(Lv3) | 122 | 4 | 2 | 30 | 3 | 34 | 3 | 0 | 32 | 18 | 15 | 3 | 185 | 368 | 1 | 把敌人石化,_防止敌人行动. |
| 19504 | 诅咒之眼(Lv4) | 122 | 5 | 3 | 36 | 3 | 34 | 3 | 0 | 38 | 22 | 15 | 4 | 185 | 368 | 1 | 把敌人石化,_防止敌人行动. |
| 19505 | 诅咒之眼(Lv5) | 122 | 5 | 3 | 43 | 3 | 34 | 3 | 0 | 44 | 28 | 15 | 5 | 185 | 368 | 1 | 把敌人石化,_防止敌人行动. |
| 19506 | 诅咒之眼(Lv6) | 122 | 5 | 4 | 49 | 3 | 34 | 3 | 0 | 50 | 32 | 15 | 6 | 185 | 368 | 1 | 把敌人石化,_防止敌人行动. |

Field evidence for every column above: `VERIFIED-STATIC-ORIGINAL`.

## 4. Key curves recovered from the fixed client

### Swordsman

- 重击 MP: `25 / 32 / 38 / 44 / 50 / 60`.
- 连砍 MP: `23 / 29 / 35 / 40 / 46 / 55`; `Iter=2` and Explanation both preserve the two-hit identity.
- 强防 EA: `20 / 25 / 30 / 35 / 40 / 50`. This is strong calibration for approved flat-DEF reconstruction, but **EA=flat DEF is not a recovered server formula**.
- 爆发 EA: `10 / 15 / 20 / 25 / 30 / 35`; EC: `5 / 7 / 10 / 12 / 15 / 17`. The original text proves strength/life up and defence down; concrete ATK/MaxHP/DEF arithmetic remains reconstruction.
- 舍身 EA: `15 / 18 / 22 / 26 / 30 / 35`, exactly matching the approved M7.1 ATK calibration. Periodic HP loss remains `PLAYER_MEMORY + RECONSTRUCTION_POLICY`.

### Wizard

- 黑暗之帐 MP `20/20/25/25/30/35`; Dist `2/3/3/4/4/5`; Area `0/0/1/1/2/2`. Fixed client says accuracy reduction.
- 毒雾 MP `20/25/30/35/40/50`; Dist `4/4/5/5/6/6`; Area `1/1/2/2/2/3`; EA `-15/-20/-25/-30/-35/-40`; EB `20/25/30/35/40/45`; EC `8/7/6/5/4/3`; TICK `12` at all levels.
- 自然力量 EB `20/30/40/50/60/70`, but Explanation only proves staff-hit MP absorption, not EB-as-MP-per-hit.
- 灰烬 MP `27/33/39/45/51/60`; Dist `3/3/3/4/4/4`; Area `2/3/3/4/4/5`; original text says healing block.
- 诅咒之眼 MP `18/23/30/36/43/49`; Dist `4/4/4/5/5/5`; Area `2/2/2/3/3/4`; original text proves petrify + cannot act.

## 5. Conflict and boundary audit

### Poison — EA / EB / EC / TICK

- Raw EA/EB/EC/TICK values are original; their server arithmetic is `SERVER-BOUNDARY`.
- `EC == tick count` remains `UNVERIFIED`; EC falls `8→3` while TICK stays `12`, and no client consumer chain proves the interpretation.
- Sina 2003-09-22 reports the initial poison hit at roughly **2×** later automatic poison damage. This supports the M7.1 `100 → 50 → 50 ...` direction as `VERIFIED-HISTORICAL`-supported reconstruction. The same older article describes poison lasting until death, so total duration is version-sensitive and must not override fixed-2.2 policy.
- Existing ~500ms battle tick is `RECOVERED_SECONDARY`; combining it with original `TICK=12` gives a **~6s candidate cadence**, not retail wall-clock proof.

### 灰烬 — healing block vs action lock

- Fixed 2.2: `阻止体力的恢复.`
- Sina 2003-11-20: affected enemy cannot add HP.
- Healing Block is therefore the stronger original/historical semantic; modern action-lock wording is `CONFLICTING_SECONDARY`.

### 自然力量 — MP drain magnitude

- Fixed 2.2 proves staff-hit MP absorption and preserves EB `20→70`.
- Sina 2003-11-20 reports about `1–3 MP` absorbed on successful staff hits.
- Therefore `20–70 MP/hit` as original behavior is `CONFLICTING_SECONDARY`; EB meaning remains `SERVER-BOUNDARY`.

### 舍身 — one-shot vs periodic HP cost

- Fixed 2.2 proves life is consumed to raise attack, but not cadence.
- Modern one-shot self-damage is not proven and conflicts with approved player-memory reconstruction.
- M7.1 retains periodic HP cost, ~10-second cadence, floor 1 HP. EA `15/18/22/26/30/35` is original calibration; using it as runtime ATK bonus is `RECONSTRUCTION_POLICY`.

### Time field

- **All 60 rows have `Time=3`**, covering instant attacks and long-lived buffs/debuffs.
- Therefore `Time=3 seconds` is not defensible. Raw Time is original; Time→seconds is `SERVER-BOUNDARY`.

### Black Veil source conflict

- Fixed 2.2 Explanation says `降低命中率`.
- Sina 2003-11-20 player article describes attack reduction.
- Under the project client-priority rule, S37 should implement accuracy debuff and preserve the historical disagreement as `CONFLICTING_SECONDARY`.

## 6. Historical corroboration

- Sina 2003-09-22, `巫师职业的要点`: poison scales with INT/REG; first hit described as twice later poison damage.
- Sina 2003-11-07, `再论巫师这职业`: independently supports INT as poison offensive stat and REG as counter-stat.
- Sina 2003-11-21, `新魔法系列运用`: Nature Force staff hit drains MP (~1–3); Ash blocks HP recovery; Curse Eye prevents action and petrified targets are not attacked.
- Sina 2003-10-29 and 2003-11-11 independently show Strong Defence / Burst as characteristic swordsman tools.

## 7. Handoff

### S36

1. Restore exact MP curves.
2. Strong Defence: flat DEF `+20/+25/+30/+35/+40/+50` is calibrated by original EA, but the EA→DEF mapping stays `RECONSTRUCTION_POLICY`.
3. Burst: raw EA `10/15/20/25/30/35` and EC `5/7/10/12/15/17` support ATK-up / DEF-down calibration. Reusing EA for approved MaxHP flat bonus is reconstruction, not recovered server formula.
4. Sacrifice: keep periodic HP loss; use EA `15/18/22/26/30/35` as approved ATK calibration.

### S37

1. Consume exact Dist/Area/MP curves.
2. Poison: immediate hit + later fixed 50% is historically supported; do not infer EC=tick count.
3. If using ~6s poison cadence, label it `RECOVERED_SECONDARY + RECONSTRUCTION_POLICY`.
4. Nature Force drain stays small; do not use EB 20–70 MP/hit.
5. Ash = AOE Healing Block.
6. Curse Eye = Petrify + Cannot Act; historical evidence additionally supports no ordinary attack targeting while petrified.

### S41

- Treat `manifests/m7-1-dual-class-skill-evidence.json` as S35 provenance authority.
- Acceptance enforces 60 rows, 18 raw fields, 10/10 S25 Lv1 exact join, and conflict labels.
- Do not promote EA/EB/EC/Time interpretations to original server facts.

## 8. Out of scope

The original table contains additional profession families. S35 intentionally does not implement them in M7.1.

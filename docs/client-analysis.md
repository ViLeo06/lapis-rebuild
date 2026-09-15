# 2.2 客户端静态分析基线

> 基线日期：2026-09-15  
> 分析方式：纯静态；未执行安装器、登录器、Frida/注入组件或未知 DLL。

## 1. 原始安装包

| 项目 | 值 |
| --- | --- |
| 文件名 | `YBCS-Online-Setup-2.2.exe` |
| 来源 | `https://oss.figupaw.com/client-updates/YBCS-Online-Setup-2.2.exe` |
| 大小 | 470,688,152 字节 |
| SHA-256 | `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88` |
| 文件类型 | PE32 / x86 / Nullsoft Installer |

本次从 Google Drive 的 18 个分卷重新拼装，拼装后的大小和 SHA-256 与归档清单完全一致。

## 2. 内嵌 7z

安装器中只发现一处 7z signature，绝对偏移为 `295909` (`0x483e5`)。

不能简单从该偏移截取到 EXE 末尾，因为 NSIS 末尾仍有 trailer。准确长度由 7z Signature Header 中的 `NextHeaderOffset + NextHeaderSize` 计算：

| 项目 | 值 |
| --- | --- |
| 7z 偏移 | 295,909 |
| 精确大小 | 469,089,543 字节 |
| SHA-256 | `9beb606655d2553c03e80d7eda36a48c135976a3812ce5432d3b2af23e996357` |
| 安装器尾部非 7z 数据 | 1,302,700 字节 |

`tools/extract/extract_client.py` 已按上述方式实现精确 carving，并且不会运行安装器。

## 3. 展开结果

静态展开结果：

- archive entries：22,970
- 普通文件：22,885
- 目录：85
- 展开普通文件总字节数：2,699,237,296
- `.spr`：7,674
- `.ani`：6,948
- `.sgr`：92
- `.mmf/.smf/.imf`：各 1,097

主要目录包括 `client/Char/`、`client/MagicRes/`、`client/SGRes/`、`client/SOUND/`、`client/Dlg/`、`environment/`、`tools/`。

其中 `environment/` 与部分工具属于 2026 兼容运行环境；`client/NeoDark.exe` 与大量资源保留旧客户端结构。因此该包应视为“旧 NeoDark/Lapis 资源 + 2026 兼容运行时”的混合包，而不是干净的 2003 中国大陆安装介质。

## 4. `.spr` 已验证格式

`.spr` 已完成实样解码并在剑士/巫师目标资源上批量验证：

1. `uint32 frame_count`
2. `frame_count` 个边界记录：`int32 left, top, right, bottom`
3. 每帧一个压缩块：
   - `uint32 payload_size`
   - `uint16 row_count`
   - 每行 `uint16 span_count`
   - 每个 span：`uint16 x`, `uint16 pixel_count`, 后接 RGB565 像素
4. span 未覆盖的像素透明。

右/下边界为 exclusive：`width = right-left`，`height = bottom-top`。

例如 `B100_00.spr` 第一帧边界 `(-26,-52,17,5)`，实际尺寸为 `43 × 57`。

## 5. `.ani` 已验证格式

本次确认 `.ani` 并非模糊的“固定记录候选”，而是稳定的 1,236 字节结构。客户端内全部 6,948 个 `.ani` 均满足该长度与基本字段布局。

核心：

| Offset | 类型 | 含义 |
| ---: | --- | --- |
| `0x000` | `char[64]` | 生成器/源描述，常见 CP949 |
| `0x040` | `uint32` | layer count，全部样本为 1 |
| `0x044` | `char[64]` | layer name |
| `0x084` | `uint32` | 每方向有效帧槽数 |
| `0x088` | `uint32[8][32]` | 8 个方向、每方向最多 32 个 frame index |
| `0x488` | `float32` | 原始 timing/speed 参数，单位待行为验证 |
| `0x48c` | `uint32` | reserved，观察为 0 |
| `0x490` | `byte[68]` | reserved/stale generator memory |

### 关键陷阱

`uint32[8][32]` 中只有每行前 `frames_per_direction` 个值有效。后续槽位有时包含看似合理的旧 frame index，若错误扫描全部 32 个槽位，会制造假的越界结论。

## 6. 剑士 / 巫师目标矩阵

已对以下 20 个职业阶段、每阶段 5 个动作槽，共 100 对 `.ani + .spr` 做严格交叉验证：

- 剑士：`100,110,120,130,140,150,160,170,180,190`
- 巫师：`109,119,129,139,149,159,169,179,189,199`
- action slot：`_00,_01,_02,_03,_05`

结果：

- 配对：100
- `.spr` 严格结构错误：0
- `.ani` 有效 frame index 越界：0
- 目标矩阵 `frames_per_direction`：4–11
- raw timing：95 个 `5.0`，4 个 `10.0`，1 个 `7.0`

因此剑士/巫师基础角色动画资源已达到批量转换条件。

## 7. 动作槽视觉语义

当前高概率映射：

| 后缀 | 高概率含义 | 依据 |
| --- | --- | --- |
| `_00` | idle | 8方向站姿、轻微呼吸/眨眼 |
| `_01` | walk | 明显循环步态 |
| `_02` | attack / cast-attack | 剑士挥剑、巫师施法攻击 |
| `_03` | hit reaction | 夸张受击姿势 |
| `_05` | special / class-specific | 剑士额外挥砍；巫师为更长特效动作，不能统一称 death |

方向槽视觉上高概率按顺时针：`南、东南、东、东北、北、西北、西、西南`。

在 M2 行为基准前，引擎层保留 `action_slot` 与 `direction_slot` 原始编号，不把推断当成不可修改事实。

## 8. 地图资源新基线

客户端包含 1,097 组 `.mmf/.smf/.imf` 与 92 个共享 `.sgr`。

对全部 92 个 `.sgr` 使用静态结构解析器验证：**92/92 完整解析到文件尾，0 错误**。已确认 SGR 包含三类资源分区：

- compact DIB family；
- middle grid/image family；
- extended DIB family。

作为首张最小测试地图，`sz-0000` 已完成静态依赖解析：

- `Set.lib/zone_name.txt`：地图 0 名称为 **“对练场”**；
- MMF：24 × 24 tile selector grid；
- IMF：47 × 47 collision grid；
- SMF：75 个 scene records；
- MMF 依赖 SGR：3, 202, 171, 153, 150, 152；
- 所需资源均存在。

使用同包 2026 兼容运行时中已恢复的静态资源规则作为交叉证据，已成功离线渲染出 `sz-0000` 的 1536 × 768 完整场景。这使“至少一张地图可静态渲染”从未知变成已证明可行；下一步是把规则收敛为项目自身的独立转换器并导出碰撞数据。

## 9. `Set.lib` 新基线

`client/NRes/Set.lib` 已静态展开，容器内 12 个成员，包括：

- `ability.atr`
- `itemtbl.atr`
- `levelabl.atr`
- `Magictbl.atr`
- `Magicptn.atr`
- `solskill.atr`
- `Effectptn.atr`
- `zone_name.txt`

文本数据主体为 GBK/GB18030 中文，而 ANI 头部说明文本常为 CP949；两者编码不能混用。

已直接从 `ability.atr` 再次验证职业名与基础值；从 `levelabl.atr + Magictbl.atr` 验证技能链。例如：

- 剑士起始技能：`1101 重击(Lv1)`；后续有 `1201 连砍`、`1301 强防`；
- 巫师起始技能：`19101 黑暗之帐(Lv1)`；后续有 `19201 毒雾`、`19301 自然力量`。

## 10. 安全边界

- 未运行 `YBCS-Online-Setup-2.2.exe`。
- 未运行 `NeoDark.exe`。
- 未运行兼容层、Frida、注入组件或未知 DLL。
- 如需 M2 动态行为采集，必须进入一次性 Windows VM / 快照环境，不使用真实账号密码。

# 2.2 客户端静态分析基线

> 基线日期：2026-09-15  
> 分析方式：纯静态；未执行安装器、`NeoDark.exe`、兼容注入组件或未知 DLL。

## 1. 原始安装包

| 项目 | 值 |
| --- | --- |
| 文件名 | `YBCS-Online-Setup-2.2.exe` |
| 大小 | 470,688,152 字节 |
| SHA-256 | `c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88` |
| 文件类型 | PE32 / x86 / Nullsoft Installer |

Google Drive 的 18 个分卷可重组得到完全相同的大小和 SHA-256。

## 2. 精确内嵌 7z

唯一 7z signature 位于绝对偏移 `295909` (`0x483e5`)。不能直接截到 EXE 文件尾，因为 NSIS 后部仍有 trailer。

| 项目 | 值 |
| --- | --- |
| 7z 偏移 | 295,909 |
| 精确大小 | 469,089,543 字节 |
| SHA-256 | `9beb606655d2553c03e80d7eda36a48c135976a3812ce5432d3b2af23e996357` |
| 非 7z 尾部 | 1,302,700 字节 |

`tools/extract/extract_client.py` 按 7z Signature Header 的 `NextHeaderOffset + NextHeaderSize` 精确 carving，全程不运行安装器。

## 3. 静态展开规模

- archive entries：22,970
- 普通文件：22,885
- 目录：85
- 普通文件总字节：2,699,237,296
- `.spr`：7,674
- `.ani`：6,948
- `.sgr`：92
- `.mmf/.smf/.imf`：各 1,097

主要目录包括 `client/Char/`、`client/MagicRes/`、`client/SGRes/`、`client/SOUND/`、`client/Dlg/`、`client/NRes/`。安装包同时含旧客户端资源和 2026 兼容环境，因此不能把整包简单等同为“2003 国服原始安装盘”。

## 4. `.spr` 格式：2026-09-15 人工复核后修正

帧结构：

1. `uint32 frame_count`
2. `frame_count × <4i>`：`left, top, right, bottom`，right/bottom exclusive
3. 每帧：
   - `uint32 payload_size`
   - `uint16 row_count`
   - 每行 `uint16 span_count`
   - 每个 span：`uint16 transparent_skip, uint16 pixel_count`
   - 后接 `pixel_count` 个 RGB565 `uint16`

关键修正：**span 首字段不是绝对 x，而是相对上一 opaque run 末端的透明跳过量。**

每行的正确解码伪代码：

```text
cursor_x = 0
for each span:
    x = cursor_x + transparent_skip
    draw pixel_count RGB565 pixels at x
    cursor_x = x + pixel_count
```

首个人工 Web 验证包把该字段误作 absolute x，导致剑士和巫师在多 span 行出现明显水平切片/错位。真实 `B100_01.spr`、`B109_01.spr` 的 span header 静态探针证明相对解释能形成合法、不重叠的行布局。

代表性真实 B100 walk 行：`[[13,1],[1,32]]`。按 absolute x 会让第二段从 x=1 开始覆盖第一段；按 relative skip 则依次位于 x=13 长1、x=15 长32，落在帧宽内并恢复连续人物图像。

解析器：`tools/convert/spr.py`；证据探针：`tools/inspect_spr_runs.py`；回归：`tests/parsers/test_spr_relative_spans.py`。

`B100_00.spr` 第一帧 bounds `(-26,-52,17,5)`，实际尺寸 `43×57`。

## 5. `.ani` 固定布局

全部 6,948 个 `.ani` 均为 1,236 字节。

| Offset | 类型 | 含义 |
| ---: | --- | --- |
| `0x000` | `char[64]` | generator/source 描述，常见 CP949 |
| `0x040` | `uint32` | layer count；当前观察为 1 |
| `0x044` | `char[64]` | layer name |
| `0x084` | `uint32` | frames per direction |
| `0x088` | `uint32[8][32]` | 8 行方向槽，每行最多32个 index |
| `0x488` | `float32` | raw timing/speed，单位未知 |
| `0x48c` | `uint32` | reserved，观察为0 |
| `0x490` | `byte[68]` | reserved/stale generator memory |

只允许读取每行前 `frames_per_direction` 个 active slot；其余槽位可能残留看似合理的 stale frame index。

## 6. 剑士 / 巫师目标矩阵

阶段：

- 剑士 `100,110,120,130,140,150,160,170,180,190`
- 巫师 `109,119,129,139,149,159,169,179,189,199`
- 动作槽 `_00,_01,_02,_03,_05`

共 100 对 `.ani + .spr`，严格结构与有效 ANI index 范围通过。目标 `frames_per_direction` 为 4–11；raw timing 主要为 5.0。

## 7. Body_ 动作与方向

高概率动作语义：

| 后缀 | 当前解释 |
| --- | --- |
| `_00` | idle |
| `_01` | walk |
| `_02` | attack / cast-attack |
| `_03` | hit reaction |
| `_05` | special / class-specific，不统一称 death |

首轮人工可玩验证暴露旧方向映射左右镜像。重新对真实 B100/B109 walk 帧逐 row 视觉检查，raw ANI row 朝向为：

| row | 朝向 |
| ---: | --- |
| 0 | South |
| 1 | South-West |
| 2 | West |
| 3 | North-West |
| 4 | North |
| 5 | North-East |
| 6 | East |
| 7 | South-East |

因此 Web screen vector（+x 向右、+y 向下）使用该 raw row 顺序；旧的 east→2 / west→6 映射已修为 east→6 / west→2。

此结论适用于当前已检查的 `Body_` 角色资源，不外推到 `FOCUS` MagicRes 等不同 layer family。

## 8. 地图资源

客户端包含 1,097 组 `.mmf/.smf/.imf` 与 92 个共享 `.sgr`。92/92 SGR 可完整解析到 EOF。

首批 Web 地图：

- `sz-0000` 对练场：1536×768；IMF 47×47。
- `sz-0001` 布日古斯_外城：2240×1280；IMF 69×79。

地图0独立项目渲染曾与兼容参考渲染逐像素一致。当前 Web 使用平面诊断渲染；前景遮挡/z-order仍需继续恢复。

## 9. Set.lib / Quest.lib / Tip

`NRes/Set.lib` 已恢复目录解密 + PKWARE DCL 解压，包含 ability/item/level/magic/zone 等 12 个成员。

`NRes/Quest.lib` 使用同类容器链，可提取 15/15 members，包括 `NPCScript.txt`、Quest0–9、`Tutorial.txt`、`HelpScript.txt`、`Neohelp.txt`、`Prologue.txt`。原始文本只进入私人构建，不提交 Git。

`.Tip` 已恢复为 sprite/image library family：27/27 文件严格解析，合计 3547 frames。`NPC350.Tip` 已确认是 3000×1125、50 帧（每帧300×225、10×5）的图像资源，**不是 NPC placement/behavior 数据表**。

## 10. 当前安全与解释边界

- 未运行安装器、`NeoDark.exe`、未知 DLL、Frida 或兼容注入组件。
- Quest/NPC 静态文本不等于知道地图 placement、trigger、reward 或 runtime branch。
- ANI raw timing 单位仍未知。
- FOCUS MagicRes 的 placement、direction、blend、timing 仍未恢复。
- 若静态考据不足，原版动态采集只能在一次性、可回滚 Windows VM 中进行。

# NeoDark 原生战斗证据：静态解压与交叉引用

日期：2026-09-15。范围：固定 2.2 包内的原生 `client/NeoDark.exe`；不把 2026 兼容实现当作 2003 原始服务端源码。

## 1. 本轮实际执行了什么

原程序具有 `UPX0 / UPX1 / .rsrc` 压缩段。直接在压缩文件里搜索字符串与代码引用会漏掉大量内容；“未找到 xref”不能解释为“没有这段战斗逻辑”。

使用固定哈希的官方 Linux UPX 工具，只执行 `upx -d -o neodark-unpacked.bin NeoDark.exe`，随后用字节读取和 `objdump` 静态反汇编分析解压后的数据文件。

**未启动原安装器、NeoDark.exe、未知 DLL、Frida 或兼容注入组件；未连接原游戏服务器。** `neodark-unpacked.bin` 作为不可执行数据归档在短期私有 artifact，不提交 Git。

| 项目 | SHA-256 |
| --- | --- |
| 原始压缩 NeoDark.exe | `c1be05eb2977a8aae8cbe8b716bc1e3957263edde8187d5269d554b327f13cbd` |
| 官方 UPX 5.2.1 Linux amd64 工具归档 | `402162aad30af47e60dbd767fb2e64ca394ace9727ba1f40283641f1d1b91657` |
| 静态解压输出（1,155,072 bytes） | `432636dd2129b6dd688527eaecdf183a46567112a8d9f6ffc4569d25697c2de7` |
| Set.lib 提取的 tileattr.atr | `fbdd1cf08e80c581d68c182ca1f28d9850fb63e05e25954ae02e2332b8a70dc9` |

执行记录：GitHub Actions `34982799287` 成功；工作流 `.github/workflows/static-battle-unpack.yml`。必须同时校验输入和转换工具，不以解压产物哈希替代原输入哈希。

## 2. 完整路径字符串的实际引用

镜像基址 `0x00400000`。下面区分**指令首地址**与**立即数首地址**；原探针只搜文件名后缀会错过指向整个路径开头的引用。

| 完整字符串 | 字符串 VA | push 指令 VA | 立即数 VA |
| --- | --- | --- | --- |
| `dlg\CombatSelect.Tdg` | `0x004F4B90` | `0x00417F6A` | `0x00417F6B` |
| `NRes\CombatMap.Tip` | `0x004F5FC4` | `0x0042C9E7` | `0x0042C9E8` |
| `tileattr.atr` | `0x004F9890` | `0x004A0B3C` | `0x004A0B3D` |

已使用静态反汇编确认这三处是完整的 `push imm32` 指令，而不是只在任意字节中碰巧匹配一个地址。它们证明原生代码确实引用这些资源；尚不证明每个 UI 控件的作用、具体遇敌条件或场景编号映射。

`CombatMap.Tip` 的静态结构是 569×197 canvas、10 个 113×98 图像帧；这是小型图像库，不能仅因名字带 CombatMap 就把它冒称为完整战场背景。`CombatSelect.Tdg` 的 UI 容器布局仍待恢复。

## 3. 原生地形记录寻址公式

函数入口 `0x004A10A0`，到 `ret 8` 结束共 50 字节。静态代码片段 SHA-256：

`e1b5d529da0b4aa85039d4e6297a63a75325b8242ef258284ab0cbd5f675ebaf`

由指令算术可以直接推出：

```text
raw_terrain = second_argument
terrain = raw_terrain > 127 ? raw_terrain - 128 : raw_terrain
if terrain < 0 or terrain > 27:
    terrain = 0

record_address = object_base + 0x9DFC + terrain * 180 + first_argument * 12
```

这里“180 字节一行、12 字节一条记录、归一化地形索引范围 0..27”是 **VERIFIED-STATIC**。该函数自身没有证明 first_argument 的合法上界；15 个 12 字节槽来自行步长，调用者是否限制索引需要单独验证。

还不能仅凭这段地址计算断言三个 DWORD 的完整战斗语义、百分比单位、服务端公式或所有职业修正。

## 4. 第三个 DWORD 的拒绝分支

独立检查两个原生调用点：

- `0x00403AA3` 调用记录寻址函数，`0x00403AAC` 读取 `[record+8]`；随后依次比较 `99` 和 `-99`，任一相等即跳向同一个拒绝/提前结束分支 `0x00403C92`。
- `0x00403D54` 调用同一函数，`0x00403D5D` 读取 `[record+8]`；同样比较 `99` 与 `-99` 并跳向 `0x00403E94`。

**已验证的最窄结论**：这两条原生调用链都将记录第三字段的 99 / -99 当成阻断当前分支的特殊值。结合邻近坐标/访问标记和兼容实现可推断其属于移动可达性计算，但完整路径算法与所有边界仍应继续沿调用链确认。

## 5. 原始表格与加载器

`tileattr.atr` 实际有 27 个非注释行，每行 34 列：一个行标识和 33 个整数。原生加载器入口 `0x004A0B30` 引用上述文件名；其解析格式字符串位于 `0x004F9820`，包含一个 `%s` 和 33 个 `%d`；循环指针按 `0xB4`（180）字节前进。

这与“每行 11 组 3 整数，运行时行跨度 15 组”的静态结构相容。原生注释/空行处理与运行时行号的对应仍需要完整追踪；本轮不把兼容实现描述的行偏移规则直接提升为已独立证明的事实。

## 6. 可重复检查命令

在已获准的静态分析环境中，先用上表检查原始与解压输出哈希，再运行：

```sh
objdump -d -M intel --start-address=0x4a10a0 --stop-address=0x4a10d2 neodark-unpacked.bin
objdump -d -M intel --start-address=0x403a8f --stop-address=0x403ac1 neodark-unpacked.bin
objdump -d -M intel --start-address=0x403d40 --stop-address=0x403d72 neodark-unpacked.bin
objdump -d -M intel --start-address=0x4a0b30 --stop-address=0x4a0d52 neodark-unpacked.bin
```

这些命令只读取文件，不加载运行原程序。

## 7. 对当前 Web 原型意味着什么

已经从“只知道有行动槽”推进到可独立复核的原生资源引用、地形表寻址与特殊值分支。后续应优先沿这些地址恢复行动/移动语义，而不是继续把兼容实现的临时训练规则当成原版。

本轮 Web 的外城→对练场选用、敌我训练落位、700ms 充能、移动消耗整次行动、伤害、AI 和随时退出仍为 `UNVERIFIED`。这份原生证据不会自动改变其等级，也不代表已经拿到了原版源代码或完成了整套战斗规则。

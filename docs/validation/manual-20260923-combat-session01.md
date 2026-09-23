# 当前客户端战斗观察 — 2026-09-23 / Session 01

## 范围与结果

用户明确授权直接操作当时已经打开的 Windows《佣兵传说》窗口。本记录只覆盖该客户端会话，不将当前版本行为当作固定哈希 2.2 或历史国服事实。Windows 锁屏后由用户手动解锁并继续采集 UI 和原生截图至 step010；本轮仅浏览栏目/队伍头像并保存截图，没有施法或有意攻击。早先动作结果未知及锁屏检查点均保留在下文，不据此补猜。

## 客户端身份

| 项目 | 观察值 |
| --- | --- |
| 窗口 | `佣兵传说` / `NeoDark.exe`，使用唯一已打开窗口 |
| 安装版本标记 | `C:\Program Files (x86)\YBCS Online\current.txt` = `2.7` |
| 正在运行的文件路径 | `C:\Program Files (x86)\YBCS Online\versions\live\client\NeoDark.exe` |
| Windows 文件版本资源 | FileVersion / ProductVersion = `2, 2, 8, 6` |
| 文件大小 | `1,155,072` bytes |
| SHA-256 | `EA084E7891E3AE298F184F7AEA5CE9ABF214BB4147C28855DECF62148DBCC136` |

`current.txt` 与 PE 文件版本资源是两种不同的现场标记。本次没有确认更新器语义、资源集版本或它们之间的映射，因此不以任一值替代另一值。

## 首帧可见内容

- 首帧时用户将当前画面描述为战斗画面；续接时轮播热键提示出现“退出目前战斗”，Escape 又出现“承认战败吗？”确认框。这些是当时战斗上下文的线索；具体地图、战斗实例、可行动回合和任务阶段仍未确认。
- 窗口截图分辨率为 `1069×826`。画面可见“自动普攻：关”、角色状态栏（HP `340/340`）、户外样式的地面/小地图、重复的金色盔甲角色精灵和底部控制区。
- 首帧时静置约 5 秒，随后截图未见明显地图/队伍变化；这一观察不测量 readiness tick 或服务器更新周期。

## UI 操作尝试与中断

1. 单击窗口相对坐标 `(28, 690)`，当时依据位置猜测为攻击入口。刷新截图后未见明确场景切换或 HP 数值变化；控件语义和是否进入待选模式均未确认，不把它记作一次已执行攻击。
2. 随后单击 `(223, 581)`，原意是选取一个可见单位。Computer Use 返回动作/刷新结果未知，因此未重试。
3. 下一次只读窗口观察显示 Windows 锁屏画面（时间约 `08:06`，`2026-09-23`）。按 Computer Use 规则立即停止后续 UI 输入；此画面不能证明第二次点击是否到达游戏。

### 续接复核 — 2026-09-23

- 重新初始化 Computer Use 后重新列举应用和窗口，仍只返回一个 `佣兵传说` / `NeoDark.exe` 窗口。
- 新的只读 `get_window_state` 截图显示 Windows 锁屏壁纸，未显示可操作的游戏画面。该轮没有激活窗口、点击或发送按键；无法确认锁屏后的游戏状态。
- 按 Computer Use 规则保持停止。继续采集的前置条件是用户手动解锁桌面；解锁后必须重新列举窗口并获取新截图，不能复用本报告中的坐标或截图编号。

没有确认普攻、移动、技能、受击、敌方 AI、伤害、readiness/MP 消耗、战斗结算或返回行为。没有输入凭据，也没有执行付费、交易、删除或存档覆盖操作。

## 解锁后的续接实测

- 用户手动解锁后，重新初始化 Computer Use 并唯一定位 `NeoDark.exe` 窗口；窗口最初处于最小化状态，恢复前台后截图正常。窗口内截图为 `1069×826`。
- F4 按一次后出现右侧面板，再按一次回到原视图。面板标题视觉上为“同盟”，可见两条已填充记录以及 `#1020` 字样；小字、字段语义和它与战斗队伍的关系未确认。热键提示轮播曾显示 F4“回合情报窗”。
- 点击“自动普攻：关”将其切为“开”，约 3 秒后仍为“开”；随后点击恢复为“关”。开启前后可见 HP 均为 `340/340`，短观察未见明确伤害或单位位移；这不证明攻击没有发生，也不验证自动攻击目标规则。
- F8 操作后没有观察到明显视图变化，因此不确认该键作用。F11 客户端提示保存到 `Capture` 文件夹，并生成 `cap-000.bmp`：1600×1200、5,760,135 bytes、SHA-256 `ECB9A954CA7D84AD1517610A0AE57D7898C2EE8E8A1E3D3D9D64B6A9A8EBFDB6`。已复制到本机 Git 忽略素材目录，源文件保留在客户端目录。
- 之后对中央单位左侧空地单击窗口相对坐标 `(455, 436)`，Computer Use 返回动作/刷新结果未知。立即只读复核时屏幕显示 Windows Hello 锁屏（约 `10:58`，提示“正在寻找你…”）；无法判断该点击是否到达游戏，未重试，停止后续输入。
- 解锁后新增窗口截图、客户端原生 BMP、字节数及 SHA-256 清单位于 `game/generated/original-client-observations/session-20260923-01/`（Git 忽略目录）；本轮新增清单为 `capture-manifest-addendum-20260923.json`。素材已回传至同一私有 Drive 收件目录后，按回读结果补全链接。

## 原始素材与完整性

- 私有 Drive 素材目录：[`ybcs-current-20260923-combat-session01`](https://drive.google.com/drive/folders/1U1Gd91un_n7616uELF6p2gG9HW3cFgRW)，位于项目 `lapis-rebuild-assets/00_inbox`。
- 只读回读确认截图文件 `ybcs-current-combat-session01-step000-post-control-probe.jpg`（239,720 bytes）与 `capture-manifest.json`（1,912 bytes）均位于该私有目录。
- 截图 SHA-256：`de8717e823d61032c0fb8b2b7b9ace3c93c34dbeb9afcbf58ac8d6401b3b50b9`。
- 本机副本位于 Git 忽略目录 `game/generated/original-client-observations/session-20260923-01/`；Git 只追踪本报告、计划与脱敏证据清单。
- 初段上传了 step001–step006 六份截图与 manifest；本次续采又上传 step007–step014 八张 BMP，并在原 Drive manifest 文件上更新为 14 个样本。回读目录共 17 项（含原 step000、旧 `capture-manifest.json` 与更新后的 addendum）；新增截图和 manifest 均为 `shared=false` / `source_visibility_status=not_shared`。远端 manifest 12,880 bytes，回读内容与本地文件逐字节一致。
- 原生 F11 截图在客户端 `Capture/cap-000.bmp` 生成，复制前后 SHA-256 完全相同；客户端原件未移动或覆盖。新增文件及 Drive 回读链接：

| 文件 | Drive |
| --- | --- |
| `ybcs27-20260923-session01-step001-post-unlock-map.jpg` | [查看](https://drive.google.com/file/d/1j1EPN9SIDVm71SehyCnJMyMocpPYJ1RX/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step002-f4-panel-open.jpg` | [查看](https://drive.google.com/file/d/1oP-1AjokON2rpdnLK-Yy6eQPXR_8Gfx7/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step003-auto-attack-on.jpg` | [查看](https://drive.google.com/file/d/1pFc9pgkU9eBk9hivqEPTbr044pA-5YPZ/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step004-auto-attack-off-restored.jpg` | [查看](https://drive.google.com/file/d/1jsbGLTT6-q6ZeIPgRviDyNd0pgfG32V3/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step005-native-cap-000.bmp` | [查看](https://drive.google.com/file/d/1a-ZVixGaq4wTXL_BHi7MuiRK71ZBf7RZ/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step006-unit-info-selected.jpg` | [查看](https://drive.google.com/file/d/1s2RcpPosDI6g2CSDYlGqg0yIMI3CW6lE/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step007-battle-tab-knight-info.bmp` | [查看](https://drive.google.com/file/d/1WwpVmxRdDr8A_UATIw52J7PCpb2D_ypE/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step008-map-roster-field-view.bmp` | [查看](https://drive.google.com/file/d/1dlArxQvojdm0OVV_F8tkVMPZVgz-ySR2/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step009-skill-dark-fire-lv2.bmp` | [查看](https://drive.google.com/file/d/1jfVo3QbYbTsbmMY0--jg8WNW4pWn2ICe/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step010-wizard-status-combat-metrics.bmp` | [查看](https://drive.google.com/file/d/1jG5WNfV4_nrC61klJ2BW0NVxrLMUCjCA/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step011-help-basic-window.bmp` | [查看](https://drive.google.com/file/d/1cn6Okn3GfgX0tbK0sy-1pek5wytsUcpg/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step012-help-magic-controls.bmp` | [查看](https://drive.google.com/file/d/1eP_chPMQ04e0LGSB2VJnIp0uB1ldDLSe/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step013-help-status-controls.bmp` | [查看](https://drive.google.com/file/d/1Bp2wgQsXAylxxnF72PnkH4kI0w2M5Nux/view?usp=drivesdk) |
| `ybcs27-20260923-session01-step014-help-inventory-controls.bmp` | [查看](https://drive.google.com/file/d/1BYftE3vuf1GnIYLVV3b-A4iNqB4-jS1V/view?usp=drivesdk) |
| `capture-manifest-addendum-20260923.json` | [查看](https://drive.google.com/file/d/1xU3FMTS7B2alon_O1z7-H_1eQXuxDwGP/view?usp=drivesdk) |

### 追加观察 — 单位面板与再次锁屏

- 选择一个可见单位后，右侧出现属性面板。截图显示 HP `340/340`、MP `199/200`，STR 10、INT 55、DEX 10、WIS 11、CON 10、REG 10；未能确认单位名称、职业或这些字段在服务器侧的含义。素材 `ybcs27-20260923-session01-step006-unit-info-selected.jpg` 为 1069×826、242,957 bytes、SHA-256 `9e53a6759dc0964e5e5b8900e3223a59fb37602b6713bf16fe581f4098212287`，时间以本机文件修改时间为准。
- 按 Escape 曾出现“承认战败吗？”确认框，随后选择“不是”关闭。该次弹窗没有单独截图入档；不据此推断战斗结算或退出后的服务器状态，也不再重复按 Escape。
- 再次续接时尝试按 F11，Computer Use 返回输入/刷新结果未知。立即重新观察显示 Windows 锁屏；没有重试。客户端 `Capture` 目录只见既有 `cap-000.bmp`，其 SHA-256 仍为 `ECB9A954CA7D84AD1517610A0AE57D7898C2EE8E8A1E3D3D9D64B6A9A8EBFDB6`，修改时间仍是 `2026-09-23 10:53:44 +08:00`，所以没有观察到这次尝试生成的新文件；不能确认按键是否到达游戏。
- 单位属性截图已补入本机忽略素材目录与会话清单。在该检查点窗口仍需用户手动解锁；后续续采见下一节。

### 再次手动解锁后的续采 — 2026-09-23

- 重新初始化 `@oai/sky` 并列举应用/窗口后，唯一 `NeoDark.exe` 窗口标题为 `佣兵传说`；截图显示游戏技能页，桌面未锁。没有启动第二个客户端。
- 用户要求把锁屏等待拉长后，前一阶段已将“平衡”计划的屏幕关闭与睡眠时长设为接电/电池均 2 小时，并从设置页回读确认；屏幕保护程序仍为“无”。
- F11 保存技能页为客户端 `Capture/cap-003.bmp`；另在顶栏“龙兵”栏目保存 `cap-001.bmp`，返回地图/队伍视图并保存 `cap-002.bmp`，角色状态页保存 `cap-005.bmp`。`cap-004.bmp` 是重复的白银骑士栏目截图，本清单未另收一份。step007–step010 均为 1600×1200、5,760,149 bytes，源文件留在客户端 Capture 目录，复制到 Git 忽略素材目录后 SHA-256 一致。
- step007 顶栏“龙兵”栏目可见“白银骑士”、`4名`、体力 `200`、攻击 `5`、防御 `2`。仅是当前客户端页面字段；单位类别、目标关系和规则语义未确认。既有文件名包含 `battle-tab`，属于采集时命名，不代表已进入战斗。
- step008 为关闭战斗信息后的地图/队伍视图，右侧队伍头像可见；地图名和战斗实例 ID 未确认。
- step009 技能页可见“黑暗之火 (Lv.2)”、需要魔法 `20`、升级点数 `2`、魔法属性“辅助魔法”、效果文字“降低命中率”。没有施法。
- step010 状态页角色栏显示 `Lv.26 黑暗巫师`；HP `293/340`、MP `4/204`，基础属性力量 `10`、防御 `10`、体力 `10`、智力 `55`、智慧 `11`、魔防 `10`、升级点数 `1`。同屏攻击力显示 `60` 与 `65`、魔法攻击 `115` 与 `125`、防御力 `140`、魔法防御 `24`、命中率 `170`、回避率 `8`、PK率 `4`、魔法命中 `170`、魔法回避 `16`、指挥范围 `4`、移动距离 `4`；不推断双值字段含义。相较 step006 的 HP `340/340`、MP `199/200`，当前数值不同；原因无法确认。
- 点击“技能说明”后没有可见页面变化；一次队伍头像点击后，状态面板数值没有可见变化。没有从这两次点击推断链接或头像规则。
- 新样本 SHA-256：step007 `5ad02114bea2b0df6e06999e416cd9786c2d97cbcc0513d674ebe86f5a646be2`；step008 `c4b4a67d2f6b22a3526bf12f24c9977efaf49c11c814437010bca47ea809be6c`；step009 `6fbd2f4cb504691b2df14d430c43b3f638891caac7c8ef91e12bd9ff2afd4da0`；step010 `c9fb50bd3f2db82250a4437d47e138e83388d10e5fad7e6b03aa871378b56582`。完整文件名、时间、大小和路径以会话 manifest 为准。
- step011–step014 为帮助叠加页：基本窗口图标标注、魔法入口、状态入口/属性、物品栏和快捷使用物品窗。复查 step012 原图与同日 `cap-030.bmp` 后，帮助文字均称顶栏“魔法”或 F5 打开魔法窗；先前记为 F6 是抄录错误。“状态”或 F3 查看能力值，“物品”或 F4 查看装备。按 F4 时物品帮助/物品页保持可见，因窗口已开，不能确认热键实际开关行为。
- step013 的状态帮助页显示 HP `293/340`、MP `4/204`，力量 `13`、防御 `10`、体力 `18`、智力 `32`、智慧 `17`、魔防 `16`、升级点数 `0`；与 step010 属性不同。单位身份与变化原因未知，不将变化归因于先前一次头像点击。
- 新帮助素材 SHA-256：step011 `0e337ca481515e0eea499ef3a5d2b8bbbe26ca6440b3702a4327cbd7034fa64e`；step012 `5a5349258d826d84f5dc7556f16f6d6f9ee09860dbff432ebde49d3ca3233de0`；step013 `85f7aedc5bdf604238cab4ea5bfa5b816a952562c1c9c663144e7b52ab0595e9`；step014 `8eefe9e7eea6a3611b91f608540e99b27c77c8a6d66f7852140e3176f52bab52`。完整元数据以会话 manifest 为准。

### 18:48–18:55 当前画面与单步探针续采

- 本轮重新初始化 `@oai/sky` 并重新枚举 `list_apps()` / `list_windows()`；只返回一个 `佣兵传说` / `NeoDark.exe` 目标窗口，激活后截图显示游戏地图，桌面未锁。没有启动第二客户端。
- 客户端 F11 分别保存 `cap-010.bmp`、`cap-011.bmp`、`cap-012.bmp`。本机 Git 忽略目录保存副本，并逐文件核对客户端原件与副本 SHA-256 一致。step015–step017 均为 1600×1200、5,760,149 bytes；精确路径、时间和哈希见 `capture-manifest-continuation-20260923.json`。
- step015 是地图基准帧。之后单击窗口相对坐标 `(960,307)` 的可见蓝色单位；即时帧短暂显示视觉文字“兵士”和交互气泡。延时保存的 step016 仍可见交互气泡，但未显示属性面板、伤害、攻击动作或单位阵营信息。不能判定该目标是敌方单位，也不把点击记作 ATTACK。
- 随后单击空地 `(760,480)`；即时截图只明确看到地图上的鼠标/目标标记。队伍没有可确认的位移，界面也没有可读行动槽或角色坐标；step017 保存此画面。此探针不能证明成功 MOVE，也不据此推出目标坐标转换。
- 本轮未尝试 ATTACK、REST 或 MAGIC，未观察到 HP/MP 变化、敌方行动或结算。此前设置页已回读确认平衡计划的接电/电池屏幕关闭和睡眠时长均为 2 小时；本轮持续可见桌面，没有触发锁屏，因此没有再次改设置。
- step015：`ybcs27-20260923-session01-step015-current-map-baseline-f11.bmp`，SHA-256 `5b560f945d3c80de3df7d9f38f09c4a891e30aaa4814df8a243ae30ca5da82e7`。
- step016：`ybcs27-20260923-session01-step016-soldier-selected-feedback-f11.bmp`，SHA-256 `3bc25f25c6f471dd45b6b09d7503c8ef9770c9f6539fe0e155240291ab1bba19`。
- step017：`ybcs27-20260923-session01-step017-empty-ground-move-probe-f11.bmp`，SHA-256 `f49d9490bce6067a668b8e2d163032069c9cf3cd82b0477777cb765db45ab299`。

新增样本与续传清单已写入此前核验的私有 Drive 收件目录，回读均为 `shared=false` / `not_shared`：

| 内容 | Drive |
| --- | --- |
| step015 当前地图基准 | [查看截图](https://drive.google.com/file/d/17qvlieDmcXH3YZ5rdWGmxL0fb87DpkOQ/view?usp=drivesdk) |
| step016 兵士交互反馈 | [查看截图](https://drive.google.com/file/d/1xhwoRoVvQ-Zfl5tA4-XFUTx8aeMLVhzN/view?usp=drivesdk) |
| step017 空地移动探针 | [查看截图](https://drive.google.com/file/d/1_UtMIVqJhdJtlT98EaFzHe27485CTUbM/view?usp=drivesdk) |
| step015–step017 清单 | [回读清单](https://drive.google.com/file/d/1mtdaIrDbuzOGQbmKjqcAF15T2g3KwjRk/view?usp=drivesdk) |

## 证据边界与后续

- `VERIFIED-MANUAL-CURRENT-CLIENT`：本次可见 UI 文本/数值、文件元数据和素材哈希，限上述会话与文件。
- 未确认：地图/战斗 zone 映射、自动攻击是否造成不可见动作、按钮绑定、移动、技能、任何战斗公式和服务器结算。
- 不将当前会话提升为 2003 国服或固定 2.2 客户端证据；后续需用户手动解锁，再重新列举窗口、取得新截图并单步验证控件。
- Windows Hello 再次锁屏时不得自动化解锁；需用户手动解锁后重新枚举窗口并获取新截图，再继续单步操作。

## 后续 MVP 城镇探索

2026-09-23 同日续采已把未战斗的户外城镇实机操作、角色移动/镜头跟随、仓库管理员对话与仓库界面单独记入 [`manual-20260923-town-exploration.md`](./manual-20260923-town-exploration.md)。该记录补足正常非战斗 MVP 样本；不证明战斗动作或结算。

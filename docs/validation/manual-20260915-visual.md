# 人工验证：角色图像与移动方向 / 2026-09-15

## 用户观察

首个人工验证包在移动端浏览器可直接打开。用户立即发现两类高优先级问题：

1. 剑士与巫师部分帧出现水平切片/错位。
2. 剑士移动时朝向与运动方向相反，表现为倒着走。

## 根因与证据

### SPR 水平切片

旧解析器把每个 span 的第一个 `uint16` 当成绝对 x。真实 `B100_01.spr` / `B109_01.spr` 的多 span 行显示它实际是“相对上一 opaque run 末端的透明 skip”。例如真实 B100 walk 帧中可见：

- raw spans `[[13,1],[1,32]]`
- 绝对解释会让第二段从 x=1 开始并与第一段严重重叠；这与人工观察到的水平切片完全一致。
- 相对解释得到 x=13 的 1 像素段，随后跳过 1 像素，从 x=15 绘制 32 像素，且严格落在 frame width 内。

因此 `tools/convert/spr.py` 已改为：每行从 `cursor_x=0` 开始，`x=cursor_x+transparent_skip`，绘制后更新 `cursor_x=x+pixel_count`。新增 synthetic multi-span 回归测试。

### ANI 方向镜像

对真实 B100/B109 walk 帧逐方向检查后，raw ANI row 的视觉朝向为：

`0 S, 1 SW, 2 W, 3 NW, 4 N, 5 NE, 6 E, 7 SE`

旧 Web 映射把 east 送到 row 2、west 送到 row 6，正好水平镜像。`directionFor()` 已改为按上述 raw row 顺序选择方向，并增加 8 方向测试。

## 状态

两项修复均已进入 `codex/manual-visual-fix-impl`。本提交触发 hash-pinned 2.2 客户端 private smoke，要求重新生成角色 PNG 并通过真实资源浏览器回归后，才生成第二个人工验证包。

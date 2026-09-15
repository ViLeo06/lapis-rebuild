# Backlog

> 2026-09-15 | Web-first | Plan v2.2 | codex/m0-ani

## 当前检查点

- [x] Vite/TypeScript/Phaser 工程、锁定依赖、真实资源生成器。
- [x] 动作/方向/帧、锚点、坐标、地图检查和碰撞投影。
- [x] 临时训练技能、双木桩、结算、IndexedDB及JSON备份实现。
- [x] 私人独立HTML打包，保留第三方许可。
- [x] 地图0000与0001接入；地图0001源 MMF/SMF/IMF 与 SGR 依赖已固定 SHA-256。
- [x] MagicRes 001/002/003/035/036/037/038 诊断序列与独立源哈希基线。
- [x] 真实资源 CI `34948301070`：synthetic/private-original 均成功；真实资源 E2E 26 expected / 0 unexpected。
- [x] 已检查 diagnostic/map-0001 截图并关闭 G2-Web。
- [x] 当前 PR synthetic CI `34948363784` 全成功。

## M3 / 当前主线

- [x] 两张真实地图的手动诊断切换与存档恢复。
- [x] 背包/装备训练状态与存档恢复。
- [x] 新增 `data/npcs/m3-guide.json`：明确标记 UNVERIFIED 的数据驱动 M3 引导任务。
- [x] 新增任务状态机：0000 → 0001 → 0000 → complete，并写入 v1 兼容存档。
- [x] Web UI 增加可见 M3 引导员标识、任务状态和对话按钮。
- [x] 新增任务单元测试与 NPC→地图→任务→存档 E2E。
- [ ] 等待当前提交 synthetic CI 回归；通过后触发 private-original smoke。
- [ ] 真实30分钟连续运行，不以模拟时钟冒充；这是 G3 门禁。
- [ ] 将训练引导任务替换/补充为有来源的真实 NPC/任务数据；当前占位不能冒充原版。
- [ ] 音效、原版死亡动画与前景遮挡。

## M4 / 校准

- [ ] ANI timing、命中时间、行动机制、技能效果、路径偏好。
- [ ] MagicRes/FOCUS 放置、混合、阶段衔接与 timing 单位。
- [ ] 隔离Windows VM证据；不阻塞其他安全工程工作。

## 边界

- 公开部署、合并 main、付费、权限变化仍需确认。
- 训练战斗、M3引导任务、WASD/点击控制均保持 `UNVERIFIED`；通过测试只证明工程闭环，不证明原版语义。

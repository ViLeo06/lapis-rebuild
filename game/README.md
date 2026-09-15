# Game

Godot 4.x 工程已开始建立。当前阶段是 **G1 后的视觉诊断原型**，还不是 M3 可玩 Demo。

## 当前内容

- `project.godot`：Godot 4 项目基线。
- `main.tscn`：加载“对练场”静态地图并同时显示 B100 剑士与 B109 巫师。
- `scripts/legacy_sprite_player.gd`：根据转换后的 ANI JSON 播放 8 方向帧，并依据 SPR 原始 bounds 保持角色锚点稳定。
- `scripts/main.gd`：按原始 action slot `00/01/02/03/05` 循环做视觉检查。

当前循环速度只是**诊断用临时时间**，不代表原版客户端真实帧时长；`ANI raw_timing` 的单位必须等 M2 行为采集后才能冻结。

## 生成私有资源

原始/派生版权资源不进入 Git。先使用项目工具生成：

```bash
python tools/prepare_prototype.py \
  --char-dir <包含 B100/B109 ANI+SPR 的目录> \
  --sgres-dir <包含 sz-0000 与依赖 SGR 的目录> \
  --out game/generated
```

会生成：

```text
game/generated/
├── prototype.json
├── maps/
│   ├── map-0000.png
│   └── map-0000-collision.json
└── characters/
    ├── B100/
    └── B109/
```

`game/generated/` 已加入 `.gitignore`。

## 引擎版本

项目以 Godot 4.x 为基线；本轮准备采用官方稳定版 4.7.2 做首个 smoke test。若本地没有 Godot，可先完成转换步骤，之后在具备 Godot 环境的机器上打开本目录。

## 下一门禁

视觉诊断通过后继续：

1. 将 IMF 通行网格接入碰撞/寻路调试层；
2. 把 6 个 MVP 技能的 MagicPtn/MagicRes 视觉资源挂接到角色动作；
3. M2 在隔离 Windows VM 中确认动作语义与 timing；
4. 再把视觉诊断状态机升级为真正的移动/攻击/施法逻辑。

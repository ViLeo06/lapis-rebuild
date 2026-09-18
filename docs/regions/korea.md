# 韩国版本主档

## Neo Dark Saver

韩国原始版本名称：`Neo Dark Saver / 네오 다크세이버`。

2002 年公开测试期资料显示其定位为战术型在线 RPG / MMOSRPG，核心特征包括：

- quarter-view 2D 画面
- 角色选择后显示移动/攻击范围
- 实时积累或消耗行动资源的战斗节奏
- 10 职业体系
- 主/副指挥官与佣兵结构

证据等级：`CONFIRMED-B`

## Lapis: Neo Dark Saver V2

后继韩服 `Lapis` 由 MGame 体系继续运营，并保留大量 Neo Dark Saver 血统。

当前官网仍提供：

- 职业说明
- 技能表
- 地图
- 道具
- 战斗指南
- UI 指南
- 图片资料

重要官网入口：

- `https://lapis.mgame.com/`
- `https://lapis.mgame.com/guide/gameplay.mgame`
- `https://lapis.mgame.com/enjoy/character/`
- `https://lapis.mgame.com/enjoy/skill/`
- `https://lapis.mgame.com/enjoy/map/`
- `https://lapis.mgame.com/datacenter/`

## 当前后继版的战斗说明

官方指南明确：

- 战斗时先选择要操作的角色。
- 绿色区域表示可移动范围。
- 红色边界表示攻击范围。
- 所有行动消耗 Tick。
- 1 Tick 约等于现实 1.5 秒。
- 强力技能通常需要更多 Tick。
- 头像附近红色/蓝色槽分别表示 HP / MP。

这些属于 `INHERITED-C`，不能未经国服录像/攻略交叉验证就直接认定为 2003 国服数值。

## 后继客户端资源线索

社区资料显示后期 Lapis 安装路径常见：

```text
C:\mGame\Lapis\
```

已知音频目录线索：

```text
C:\mGame\Lapis\Sound
```

发现 Neo Dark Saver 血统文件名：

- `NDS-8033.mp3`
- `NDS-8035.mp3`
- `NDS-8076.mp3`
- 大量 `NDS-4xxx` 技能音效编号

这说明后继客户端可能仍保存可直接追溯到 NDS 时代的资源。

## 后续任务

1. 获取现行 Lapis 客户端完整文件树。
2. 对所有文件做哈希、扩展名、魔数和字符串扫描。
3. 提取 `NDS-*` 音频并建立技能/场景映射。
4. 查找是否仍存在早期 UI、Sprite、地图和旧资源残留。
5. 寻找 2002–2004 年老版本客户端，以避免后继版本污染。


## 2026-09-18 现场复核

本轮外部网络调查再次读取了韩服 MGAME Lapis 现行站点：

- 官网：`https://lapis.mgame.com/`
- 安装说明：`https://lapis.mgame.com/guide/`
- 游戏说明：`https://lapis.mgame.com/guide/gameplay.mgame`
- 任务入口：`https://lapis.mgame.com/enjoy/quest/`

本轮可确认：

- 站点仍可读取，并出现 2026-09-17 维护相关公告；
- 官方安装流程仍通过启动器/资料室路径说明；
- 页面提到的 `MStartProSetup.exe` 是启动器安装程序，**不能当作完整 Lapis 客户端本体**；
- 本轮没有取得完整韩服客户端，没有完成文件树、哈希或资源差分；
- 因此不能假设现行韩服的资源 ID、协议、任务逻辑或数值公式与目标国服旧版本一致。

当前用途继续保持 `INHERITED-C`：作为同源后继版本的资源谱系、命名和玩法语义参照。若后续取得完整客户端，再按 `docs/archive-policy.md` 先归档、哈希，再与 fixed-hash 2.2 做静态差分。

本轮完整调查见 `docs/research/external-web-research-20260918.md`；可执行接入摘要见 `docs/integration-notes/s15-s19-external-evidence-20260918.md`。

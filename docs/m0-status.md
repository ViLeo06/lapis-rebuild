# M0 收口状态

> 分支：`codex/m0-ani`  
> 更新日期：2026-09-15

## 当前目标

M0 的目标不是再次做泛化资料搜索，而是把已经验证过的客户端与资源格式成果固化为可复现、可审计、可继续开发的工程基线，然后立即进入 `.ani` 动作格式突破。

## 已确认基线

- 客户端来源：`https://oss.figupaw.com/client-updates/YBCS-Online-Setup-2.2.exe`
- 已知安装包大小：470,688,152 字节。
- 安装包结构：32 位 Windows PE / NSIS，含 `_ybcs_payload.7z`，原则上只做静态提取。
- 已知展开规模：约 2.699 GB、约 22,885 个文件。
- 客户端性质：2003 年 NeoDark 原生资源与 2026 兼容运行时的混合包。
- `Set.lib` 已定位职业、属性与技能相关数据。
- 剑士职业路线：`100/110/.../190`。
- 巫师职业路线：`109/119/.../199`。
- `.spr` 已确认可解码为帧边界 + RGB565 行游程图像数据。
- `.ani` 已确认包含固定长度的动作/帧索引结构，但动作语义映射尚未完成。

## M0 缺口

当前仓库已经建立存储策略和目录骨架，但下列交付物仍需形成正式版本：

- `docs/client-analysis.md`
- `docs/evidence-ledger.md`
- `manifests/client-2.2.sha256`
- `manifests/client-files.csv`
- `tools/extract/`
- `tools/convert/spr.py`

Google Drive 的 `10_original`、`20_extracted`、`40_previews` 当前尚未完成正式归档；`30_parsed` 已建立 sprites / animations / effects / maps / audio / tables 分类目录，但仍需填入解析产物。

## 当前阻塞

本轮运行环境无法直接解析 `oss.figupaw.com` 域名，因此没有重新取得 2.2 安装包；Drive 中 M0 原始客户端与完整解包目录也仍为空。

这意味着：

1. 可以先把工程基线、格式规范、测试框架和 `.ani` 研究工具落库；
2. 但完整 SHA-256、全量文件清单以及针对真实 `.ani` 样本的最终字段验证，必须在原始包重新归档后完成；
3. 不应伪造或根据旧片段补全哈希。

## M0 完成门槛

- [ ] 2.2 安装包进入 Drive `10_original`
- [ ] 完整 SHA-256 写入 `manifests/client-2.2.sha256`
- [ ] 静态展开进入 Drive `20_extracted`
- [ ] 全量 `client-files.csv` 生成并可重复
- [ ] `.spr` 转换器与黄金样本测试可重复
- [ ] 剑士/巫师首批预览进入 `40_previews`
- [ ] `.ani` 至少完成结构字段验证并输出机器可读索引


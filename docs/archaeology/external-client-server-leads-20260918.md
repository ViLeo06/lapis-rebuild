# 外部客户端 / 单机端 / 代码线索（2026-09-18）

> 目标：集中记录本轮围绕“是否存在另一客户端、单机端、民间服务端或相关解析代码”的可操作线索。  
> 完整研究：`docs/research/external-web-research-20260918.md`

## 1. 当前结论

截至 2026-09-18，本轮公开可访问渠道中：

- 未核实到可直接下载、解包并启动的完整《佣兵传说 / Neo Dark Saver》单机端；
- 未核实到原版服务端源码或配套数据库；
- 找到一个名为 `ybcs-offline` 的空仓库；
- 找到 figupaw 的 2.1 客户端地址线索；
- 找到相关前作的真实资源提取代码；
- 现行韩服 Lapis 可作为同源后继版本参照，但本轮未取得完整客户端。

“未找到”只描述本轮公开渠道结果，不证明封闭社群或私人存档中不存在。

## 2. ybcs-offline

仓库：

https://github.com/peaceMaker1r/ybcs-offline

核验结果：

- 描述：`ybcs单机`
- 创建：2026-08-06
- GitHub contents：空
- releases：空
- 无 README、代码、发行包可检查

状态：`LEAD_ONLY`

后续动作：只需定期检查是否新增 commit/release；当前不应围绕它设计协议或服务端架构。

## 3. figupaw 2.1 客户端线索

页面/下载线索：

- https://figupaw.com/
- https://figupaw.com/guides/getting-started
- https://figupaw.com/news/b1c2dec0cf6444d3a151b8b668005881
- https://oss.figupaw.com/client-updates/YBCS-Online-Setup-2.1.exe
- 已有 2.2：https://oss.figupaw.com/client-updates/YBCS-Online-Setup-2.2.exe

本轮边界：

- 页面正文可读取；
- 本轮未取得 2.1 完整字节；
- 未做 SHA-256；
- 未解包；
- 不能确认 2.1 直链当前仍可完整下载；
- 不能把站点上的“Official”等标签自动当成原厂授权证明。

如果取得 2.1，第一轮只做静态 hash/diff：

1. `NeoDark.exe`
2. `Set.lib`
3. `Quest.lib`
4. battle/scene 包
5. 地图与核心表文件

如果差异只在现代启动器/登录器，应立即降低优先级。

## 4. DarkSaverResourceExtractor

仓库：

https://github.com/juhens/DarkSaverResourceExtractor

已读：

https://github.com/juhens/DarkSaverResourceExtractor/blob/master/GrsExtractor/Program.cs

blob SHA：

`c57a7988a1864e8df0178814bb87c0d09024ec70`

核验到真实 C# GRS 图片资源处理代码，包括文件头、调色板、尺寸和导出逻辑。

状态：`RELATED_FORMAT_LEAD`

边界：

- 不是 Neo Dark Saver 服务端；
- 尚未证明能直接处理当前 `.SPR/.ANI/.SGR`；
- 不应仅因名称相近就复用格式假设；
- 复用代码前还需单独核对许可证。

## 5. Dark Saver Returns

线索：

- https://tagonet.tistory.com/44
- https://www.youtube.com/@darksaver2740
- https://darksaver-return.com/

本轮主域名 DNS 访问失败，没有取得安装包或源码。

状态：`LOW_PRIORITY_LEAD`

用途：前作社区/作者线索，不等同于 Neo Dark Saver 原版服务端。

## 6. 韩服 MGAME Lapis

官网：

https://lapis.mgame.com/

2026-09-18 现场资料表明官网和安装说明仍存在。本轮没有取得完整韩服客户端，也没有验证账号登录。

注意：站点提到的 `MStartProSetup.exe` 是启动器安装程序，不能直接当作完整 Lapis 客户端本体。

状态：`INHERITED-C / CLIENT_CANDIDATE`

若后续能在隔离环境取得完整客户端，优先对比：

- 文件树/命名
- NDS-* 音频
- 资源容器与表格式
- ANI/SPR/地图资源是否继承
- 新旧资源 ID 是否有连续谱系

协议、数值和服务器逻辑必须单独验证。

## 7. Drive 归档

本轮资料包已经放在：

`lapis-rebuild-assets/00_inbox/external-web-research-20260918/`

包含：

- `research-report.md`
- `lapis-web-research-2026-09-18.zip`

ZIP 内含结构化来源台账、HTTP/DNS 探测记录与 manifest。正式取得新的客户端/二进制后，仍按 `docs/archive-policy.md` 先进入 `00_inbox`，完成哈希和分类后再迁移。

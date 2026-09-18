> 归档说明（2026-09-18）
> - 本文记录的是前一轮网络调查的只读结论；调查结束后，已按用户要求归档到 Google Drive 和本 GitHub 分支。
> - Google Drive: `lapis-rebuild-assets/00_inbox/external-web-research-20260918/`
> - Drive 文件：`research-report.md`、`lapis-web-research-2026-09-18.zip`。
> - 本文中的日服/后继 Lapis/玩家攻略默认按后继资料或玩家观察使用，不自动升级为 2003 国服事实。
> - 当前 S15-S19 并行期不修改 `Plan.md`、`Backlog.md`、`docs/evidence-ledger.md`；可执行接入摘要见 `docs/integration-notes/s15-s19-external-evidence-20260918.md`。

# 《佣兵传说》重构：多语种网络资料调查与接入建议

核验日期：2026-09-18。
项目：ViLeo06/lapis-rebuild。
本次只读调查，没有修改仓库、Google Drive 文件，没有发帖、联系作者、注册账户或运行不明二进制。

## 一、结论

本轮没有验证到能够直接下载、解包并启动的《佣兵传说 / Neo Dark Saver》完整单机端、原版服务端源码或配套数据库。这个结论仅表示本轮公开可访问渠道的结果，不表示其他人或封闭社群一定没有。

找到了更有价值的补证材料：日本老玩家保存的伤害计算候选式、敌人行动观察、村庄设施说明、怪物掉落记录；中文玩家保存的日服任务条件和技能表；一个名字高度相关但目前为空的 ybcs-offline 仓库；既有客户端下载站上的 2.1 安装包地址线索；前作 Dark Saver 的资源提取代码。

建议把“寻找完整端”保留为支线，优先将已经能读到的资料转为可验证的重构输入。另一套民间服务端即使被找到，也必须区分原版恢复、作者猜测和后期魔改，不能自动视为原版全部规则。

## 二、现有项目状态：本次读取的基线

- 仓库统一基线：047c52af340076a00a6e0d347806708ad92844d1。
- 计划：Plan.md v3.1；当前主目标为 M5 Playable Recovery。
- 私有资产根目录：lapis-rebuild-assets。
- 当前并非只有一个尚未分析的安装包：已有资源提取、格式分析、战斗与任务重构、离线 HTML 和工程验收记录。但工程记录不等于用户已经可以自然玩通，本次也没有重新执行所有测试。
- 资料源安装包：YBCS-Online-Setup-2.2.exe，470688152 字节。
- 该包既有 SHA-256 记录：c42f37b06f27a6ee0b14e6fea6129cf89956a3e1c7a37c1172a28577f6cdae88。
- 既有提取清单：22885 个文件，7674 个 SPR、6948 个 ANI、1097 组 MMF/SMF/IMF 地图、92 个 SGR。
- Set.lib、Quest.lib 及战斗/地图脚本已有大量静态恢复，主要缺口是运行时关联与旧服务器最终结算。

核对入口：
- https://github.com/ViLeo06/lapis-rebuild/blob/047c52af340076a00a6e0d347806708ad92844d1/Plan.md
- https://github.com/ViLeo06/lapis-rebuild/blob/047c52af340076a00a6e0d347806708ad92844d1/docs/evidence-ledger.md
- https://github.com/ViLeo06/lapis-rebuild/blob/047c52af340076a00a6e0d347806708ad92844d1/docs/client-analysis.md

应继续保持的边界：

| 领域 | 已有基础 | 尚不能当作原版已恢复的部分 |
| --- | --- | --- |
| 战斗 | 客户端攻击请求、绝对 HP 接收和表现链 | 最终伤害、命中、闪避、暴击、属性修正与随机分布 |
| AI | AI 语法、权重选择与默认程序 | 具体怪物/战斗单位绑定到哪套 AI，服务器下发实例数据 |
| 地图 | 场景资源、对象交互、battleZoneId 消费 | 全部地图出口、任务条件、遇敌到战斗场景的映射 |
| 任务/NPC | 文本、部分对话和运行时结构 | 实体坐标、完整条件、任务分支、奖励和招募对应关系 |

## 三、最重要的新增资料：日服“司教の洞”存档

网站：https://lapis-online-memories.github.io/
旧版目录：https://lapis-online-memories.github.io/index_v1.htm
后续版目录：https://lapis-online-memories.github.io/v2/
公开网站仓库：https://github.com/lapis-online-memories/lapis-online-memories.github.io

已核验：网页正文可以读取；GitHub 仓库真实存在，相关 HTML 文件内容可以读取。这是攻略网站的源码，不是游戏服务端源码。当前项目默认分支的关键词检索未返回 lapis-online-memories，不能据此断言所有历史分支从未引用过它。

### 3.1 伤害与属性候选公式

来源：https://lapis-online-memories.github.io/keisan.htm
日期：2007-11-18。
已读取源文件：https://github.com/lapis-online-memories/lapis-online-memories.github.io/blob/master/keisan.htm
文件 blob SHA：a7d5eb8a31d1409c73954b0cbb8060cb76bfebb4。

该作者明确提醒，内容可能包含错误和误解。因此以下只能标记为“日服 2007 玩家归纳候选”，不是国服原版公式：

```text
物理伤害候选 = (攻击力 × 攻击增益倍率 - 防御力 × 防御增益倍率) × 技能倍率
暴击伤害候选 = 未暴击伤害 × 1.5
防御力候选 = 基础防御力 × (1 + CON / 100)
魔防候选 = 基础魔防 × (1 + REG / 100 + WIS / 200)
```

作者给出的例子使用攻击 650、两项 1.2 攻击增益、防御 300 与 1.2 防御增益、技能倍率 1.44，结果写为普通 829、暴击 1244。它可以成为一个外部观察样例。增益叠加、取整位置、最低伤害和职业差异仍需单独测试；不能从这个例子推导出完整的命中或随机数公式。

项目接入建议：先作为 S19/S3 候选模型进行对照，不覆盖当前已明确标注的重构平衡策略；找到匹配版本的观测样本之后再升级证据等级。

### 3.2 敌人行动观察

来源：https://lapis-online-memories.github.io/teki.htm
日期：2006-05-14。
源文件：https://github.com/lapis-online-memories/lapis-online-memories.github.io/blob/master/teki.htm
文件 blob SHA：f85fa1b925b00ffb85a21ff89f7f44d9a779585a。

作者观察到，部分无星号敌人的行动与特定星号敌人联动；领头单位开始行动或消失后，其他单位的活动限制可能解除。文章还描述了与距离、画面范围有关的表现，以及静止单位在射程内仍会攻击的情况，并指出存在例外。

项目价值：为“领队—跟随单位—激活条件”提供具体测试方向；不能把玩家观测直接等同于服务端 AI 表或 6A69 数据结构，更不能据此断言镜头必然控制服务器模拟。旧版画面外行为或重叠问题应作为考古线索，而非默认复制的玩法。

### 3.3 村庄、设施和训练场入口

来源：https://lapis-online-memories.github.io/kaosia.htm
日期：2006-10-01。
源文件：https://github.com/lapis-online-memories/lapis-online-memories.github.io/blob/master/kaosia.htm
文件 blob SHA：87380ea27e268629570e831f2975a9d6905d043c。
图示链接：https://lapis-online-memories.github.io/image-lapis/kaosia.gif

正文列出广场、仓库、酒馆、商店、宠物屋、训练场、竞技场、神殿等设施。特别值得核对的是：作者写到训练场有两个入口，分别进入不同地图。宠物屋内部还承担任务俱乐部功能。

项目价值：为 S16/S18 提供设施角色与出口关系的候选约束。图示不是机器坐标表，本轮没有据它确认国服对象 ID 或精确坐标；两个入口的描述也必须与现有客户端地图资源交叉核对。

### 3.4 掉落与装备记录

已读来源：https://lapis-online-memories.github.io/v2/drop-item-memo.html
日期：2009-02-15；页面包含评论补充。
旧版目录还列有 drop1.htm、drop2.htm 和装备列表。

该页提供怪物到掉落物的对应记录，并区分部分听说而未亲自打出的条目。可以为物品与怪物名称对齐提供候选边；不能从出现记录推断掉落概率，也不要把评论和作者实测混为一层证据。

后续可定点读取而本轮未逐项核验的页面：
- https://lapis-online-memories.github.io/v2/skill-base.html
- https://lapis-online-memories.github.io/v2/inspection.html
- https://lapis-online-memories.github.io/v2/skill-validation.html

## 四、单机端、客户端和代码线索的实际状态

### 4.1 peaceMaker1r/ybcs-offline：名字匹配，但没有内容

仓库：https://github.com/peaceMaker1r/ybcs-offline
元数据：https://api.github.com/repos/peaceMaker1r/ybcs-offline
发布列表：https://api.github.com/repos/peaceMaker1r/ybcs-offline/releases

核验结果：描述为“ybcs单机”，创建于 2026-08-06；本次 GitHub contents 接口明确返回仓库为空； releases 返回空数组。没有 README、代码或发行包可以检查。

判定：潜在作者线索，不是找到单机端。由于没有内容，连 YBCS 是否确切对应本项目这款游戏，也不能只凭缩写彻底确认。没有证据把这个作者和 figupaw 站点关联起来。

### 4.2 既有 figupaw 站点：2.1 地址值得比较，但未拿到第二套字节

首页：https://figupaw.com/
入门说明：https://figupaw.com/guides/getting-started
2.2 公告：https://figupaw.com/news/b1c2dec0cf6444d3a151b8b668005881
本轮页面出现的 2.1 下载地址：https://oss.figupaw.com/client-updates/YBCS-Online-Setup-2.1.exe
项目既有 2.2 来源：https://oss.figupaw.com/client-updates/YBCS-Online-Setup-2.2.exe

本轮 Firecrawl 可以读取站点正文。公告写 2.2，首页下载入口仍给出 2.1；入门说明要求门户账号、启动器和服务器选择，不能把它理解成离线单机版。站点使用的 Official 标签不等于本轮已核实原厂授权。

本轮未下载、散列或解包 2.1，也未确认其直链仍能完整传输。当前容器对这些域名 DNS 解析失败，失败记录见 public-http-probes.json；这不是证明远端服务器失效。

合理下一步：在可下载的隔离环境获取文件后，先比较 NeoDark.exe、Set.lib、Quest.lib、地图/战斗场景包，而不是只比较启动器版本号。若只有现代启动器发生改变，就停止把它当作服务端信息突破口。

### 4.3 韩国 MGAME Lapis：同源现存资料，不是当前已取得的另一个客户端

官方网站：https://lapis.mgame.com/?view=ok
安装说明：https://lapis.mgame.com/guide/
游戏说明：https://lapis.mgame.com/guide/gameplay.mgame
任务说明入口：https://lapis.mgame.com/enjoy/quest/

本轮现场读取主页出现 2026-09-17 维护相关公告。官方安装说明提供通过启动器/资料室安装的流程。本次没有取回完整韩服客户端，没有验证账号注册或实际登录，也没有证明现行韩服与国服旧客户端的资源 ID、协议或公式一致。

注意：MStartProSetup.exe 是站点提到的启动器安装程序，不能当作完整 Lapis 客户端本体。

项目价值：后续版本的资源结构和公开玩法说明，可用于差分与语义参照。涉及旧版本真实性时应低于匹配年代客户端证据。

### 4.4 DarkSaverResourceExtractor：真实资源解析代码，非服务端

仓库：https://github.com/juhens/DarkSaverResourceExtractor
已读代码：https://github.com/juhens/DarkSaverResourceExtractor/blob/master/GrsExtractor/Program.cs
代码 blob SHA：c57a7988a1864e8df0178814bb87c0d09024ec70。

核验到 C# GRS 图片资源处理代码，包括文件头检查、调色板、帧尺寸和图像导出。没有验证它能直接读取当前 SPR/ANI/SGR，不能把相似扩展名当作兼容证明。它针对的是前作 Dark Saver 相关资源；公开可读代码不等于已核实有允许任意复制的开源许可证。

判定：中低优先级的格式与作者线索，无法直接补出伤害公式、任务库或服务器。

### 4.5 Dark Saver Returns：有同人复活线索，但本轮主域名打不开

玩家文章：https://tagonet.tistory.com/44
频道：https://www.youtube.com/@darksaver2740
线索中的站点：https://darksaver-return.com/

检索发现相关玩家记录与视频线索；Firecrawl 对主域名返回 DNS 解析失败。未取得安装包或源码，也不能从一次域名失败判断项目彻底消失。且前作同人游戏并不等于 Neo Dark Saver 原版服务端。

## 五、繁体中文保存的日服资料：适合直接整理技能和任务条件

主帖：https://forum.gamer.com.tw/C.php?bsn=5100&snA=83
标题：【專區】日版流星物語，05月09日更新：技能介紹。
年代：2011 年帖及编辑记录；讨论的是改版后的日服。

技能页：
- https://forum.gamer.com.tw/Co.php?bsn=5100&sn=383
- https://forum.gamer.com.tw/Co.php?bsn=5100&sn=384
练级/任务条件页：
- https://forum.gamer.com.tw/Co.php?bsn=5100&sn=374

本轮读到主帖和相关技能表，包含职业、技能等级、MP、作用范围与休息时间等字段。主帖还记录了任务 3-3 与前置 3-2、“雪女之衣”等条件的关系。这些可用于建立任务依赖和技能语义候选，尤其适合剑士与巫师。

边界：攻略里的休息时间不能未经分析直接解释为秒；称号、职业译名、任务编号、数值都需与当前版本对齐。作者的强弱评价不是官方结算证据，2011 年注册教程也不是 2026 年仍可注册的证明。

## 六、已排除和未验证的结果

| 线索 | 实际核验 | 处理 |
| --- | --- | --- |
| 藏宝湾“求一个很老的游戏《佣兵传说》Lapis” | 2013 年求端讨论，不是发布帖 | 不能列为端下载 |
| 韩国讨论“Neo Dark Saver 能否单机玩” | 搜索摘要仍在，原帖已删除/404 | 只保留检索线索 |
| 佣兵传说编年史、Mercenaries Saga 等 | 同名或近名的其他游戏 | 不作为本项目源代码 |
| Shaiya/Cronous/Minecraft Lapis、Sega Dark Savior、NeoDark 编辑器主题 | 词面相近，游戏不匹配 | 排除 |
| 2003 年客户端公测下载新闻 | 历史存在证明及镜像站名，没有核实可用二进制 | 留作旧版追索 |

相关页面：
- https://www.iopq.net/thread-16891681-1-1.html
- https://m.dcinside.com/board/lapis/11643
- https://news.17173.com/content/2003-5-17/n711_627220.html
- https://news.17173.com/content/2003-5-14/n968_884331.html

2003-05-17 的 17173 新闻提到天府热线、广州骏网和游戏时代等镜像渠道，值得追查旧光盘或网页归档，但本轮没有拿到这些镜像的安装包。Ragezone、Internet Archive 相关关键词检索也没有核实到目标完整服务端；没有对付费区、登录后附件或所有历史快照进行穷尽调查。

## 七、检索路径与代表性查询

本轮同时使用 Exa、Firecrawl、网页搜索与 GitHub 原生读取。下面记录实际使用过的代表性查询，不冒充完整的逐次工具日志，不宣称穷尽全网。

| 路线 | 代表性查询 | 主要收获 |
| --- | --- | --- |
| 中文单机/服务端 | 汉娃娃 佣兵传说 Neo Dark Saver Lapis 网友制作 单机版 服务端 源码；“佣兵传说” 单机 | 排除同名游戏，识别求端帖 |
| 韩国同源版本 | “네오다크세이버” “싱글”；“라피스” “서버팩”；“라피스” “프리서버” | 旧玩家讨论、现存官网、同人前作线索 |
| 英文协议/模拟器 | “Neo Dark Saver” server emulator source code；“Neo Dark Saver” “download” | 没有核实完整服端，减少关键词误报 |
| 日本版本与存档 | “ラピスオンライン” ダウンロード クライアント wiki | 命中司教の洞，随后沿公式、AI、地图、掉落页深读 |
| 台湾别名 | “流星物語” “下載” | 日服技能表、练级与任务条件保存帖 |
| 公开代码 | GitHub 搜索 neodarksaver、dark saver、lapis mgame、YBCS、lapis-online-memories | 真实 GRS 解析代码、网站存档、空 ybcs-offline 仓库 |
| 历史安装包 | “佣兵传说” 客户端 下载 2003；既有站点安装包文件名 | 旧下载新闻、2.1 与 2.2 地址线索 |

## 八、给现有五条并行线的接入建议

| 工作线 | 可以接入的材料 | 验收边界 |
| --- | --- | --- |
| S15 视口/镜头 | 日服敌人行为页有镜头与观察结果关联 | 只作为旧版观察，不让现代镜头意外决定战斗结算 |
| S16 NPC 可见性 | 村庄设施图、名称、职业与招募文字 | 必须和本地实体/地图位置核对，不能照搬日服坐标 |
| S17 怪物可见性 | 怪物截图、技能效果与掉落名称关联 | 先验证图片/实体匹配，不把掉落记录变成概率表 |
| S18 场景切换 | 两个训练场入口、设施角色、任务前置链 | 核对出口对象、目标地图、前置条件和返回点 |
| S19 重构平衡 | 2007 年伤害与暴击候选、2011 年技能成本/休息时间 | 与当前重构策略分层；不宣称旧服公式已恢复 |

推荐先做三件事：

1. 将已核验外部事实整理为小型证据补丁，每条保留地区、年代、来源、原文定位、观察/推测标记、对应本地资源。先整理事实和候选，不全文复制别人的网站，也不动并行共享文件。
2. 对 2.1 与 2.2 做文件级差分。只有发现旧可执行文件、Set/Quest 表或场景包存在有效差异，才继续二进制对照。
3. 经授权再向可能的维护者询问无敏感信息的地图出口、NPC 坐标、怪物配置、任务条件奖励、技能数值或模拟器接口。询问对象是否持有原版资料、民间重写实现还是仅客户端，要先分清；不要索取账号、口令或玩家数据库。

建议的证据记录字段：

```text
source_id, source_url, source_date, region, game_generation,
retrieval_status, evidence_kind, claim, author_uncertainty,
local_asset_candidates, validation_test, validation_status
```

严禁用“国外同源版本如此”直接替代“当前国服客户端证实如此”。

## 九、本包内容与限制

- research-report.md：本报告与完整入口链接。
- source-ledger.json：结构化来源、核验状态、优先级与边界。
- public-http-probes.json：本地 HTTP/DNS 探测失败记录，解释为什么本轮没有新增安装包字节。
- manifest.json：上述文件的大小和 SHA-256。

这是整理后的检索台账，不是所有工具原始响应的逐字备份，不包含游戏客户端、服务端、付费资料、账号数据或完整攻略镜像。没有新文件被上传到 Drive 或写入项目仓库。
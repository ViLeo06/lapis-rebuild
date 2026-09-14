# 大文件归档与代码仓库边界

## 目的

本项目将可复现代码与大体积、可能受版权保护的历史资源分开保存：GitHub 用于协作和版本管理，Google Drive 用于私有数字考古归档。

## 存储位置

- GitHub：`ViLeo06/lapis-rebuild`
- Google Drive：[`lapis-rebuild-assets`](https://drive.google.com/drive/folders/1OCjOlmAPCt5pun7EXCRj7NnZaWp37lYo)

Drive 目录：

```text
lapis-rebuild-assets/
├── 00_inbox/       # 新取得、尚未校验和分类的文件
├── 10_original/    # 原始安装包、补丁、网页/视频原件
├── 20_extracted/   # 可复现的完整解压归档
├── 30_parsed/      # 批量解析产物
│   ├── sprites/
│   ├── animations/
│   ├── maps/
│   ├── effects/
│   ├── tables/
│   └── audio/
├── 40_previews/    # 便于人工核验的预览图、动作表和短视频
└── 90_quarantine/  # 来源或安全性待确认的样本
```

## GitHub 可以保存

- 源代码、解析器、构建脚本和自动化测试。
- Markdown 研究文档、数据格式说明和决策记录。
- CSV/JSON 清单、哈希、来源 URL、版本和证据等级。
- 不含敏感信息的小型测试夹具和精选预览图。
- Godot 工程配置和自制/已授权资源。

## Google Drive 保存

- 原始 `.exe`、补丁、ISO、内层压缩包和网站/视频原件。
- 22,885 个文件之类的大型完整解压树；优先打包为可校验归档，不逐文件上传。
- 批量转换的 PNG、音频、地图、表数据和中间文件。
- 安全性未确认或来源待考据的样本。

## 归档要求

1. 新文件先进入 `00_inbox`；未校验文件不得直接进入正式归档。
2. 记录原始文件名、来源、取得时间、地区/版本、字节数和完整 SHA-256。
3. 原始文件只读保存；解压、修复和格式转换产生新文件，不覆盖原件。
4. 完整解压结果优先使用 `.tar.zst` 或 `.7z` 保存，并同时生成文件清单。
5. 解析产物按类型与来源版本分卷，避免不同客户端版本混合。
6. GitHub 的 `manifests/assets.csv` 是跨存储索引，不写入账号凭据、Cookie、令牌或临时签名 URL。
7. 原始客户端、美术和音频默认不公开分享；版权归原权利人所有。

## 命名约定

推荐格式：

```text
<region>-<product>-<version>-<artifact>-<yyyyMMdd>.<ext>
```

示例：

```text
global-ybcs-online-2.2-installer-20260914.exe
global-ybcs-online-2.2-extracted-20260914.tar.zst
global-ybcs-online-2.2-sprites-20260914.tar.zst
```


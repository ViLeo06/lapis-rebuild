# Manifests

本目录保存 GitHub 与 Google Drive 私有归档之间的可追溯索引。

- `storage-locations.json`：稳定的归档目录标识。
- `assets.csv`：每个原始或派生文件的来源、哈希、路径与状态。

在文件进入 `10_original`、`20_extracted`、`30_parsed` 或 `40_previews` 后更新清单。`00_inbox` 中尚未校验的文件可以暂不登记为正式资产。

`sha256` 必须是完整的 64 位十六进制值；只有前后片段的旧记录不得写入该字段。


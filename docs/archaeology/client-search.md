# 客户端考古主档

## 当前状态

尚未取得经核验的 2003 国服完整安装包或 ISO。

已知 Windows 客户端主程序指纹：

```text
NeoDark.exe
```

注册表根路径：

```text
HKEY_CURRENT_USER\Software\NeoDarkSaver
```

历史官网客户端下载页：

```text
http://www.nds.com.cn/download/khd.htm
```

历史补丁页：

```text
http://www.nds.com.cn/download/patch.htm
```

## 已知资源/对话框指纹

```text
0-DLG\Login.Tdg
0-dlg\Msg2.Tdg
0-DLG\Prologue.Tdg
0-DLG\SvSelect.Tdg
0-dlg\NewChar.Tdg
0-dlg\NewChar2.Tdg
0-dlg\WaitMainMax.Tdg
0-dlg\MyInfo.Tdg
0-dlg\Option.Tdg
```

`.Tdg` 文件类型尚未确认；优先判断它是 UI 定义、图像资源、容器，还是三者混合。

## 搜索优先级

### S：2003 年 5 月公测版

优先从随刊 CD/ISO 搜索。

### S：2003 年 11 月 8 日精灵派对新版

已确认是一次大幅更新且与旧版不兼容。

### A：补丁

重点：`0717升级补丁` 以及两大版本之间的增量包。

### A：同期韩服 Neo Dark Saver 客户端

若与 2003 年 11 月国服确为近同步基线，可用于资源和二进制结构对照。

## 找到任何疑似客户端后的验证流程

1. 保留原文件，不直接运行。
2. 计算 SHA256 / SHA1 / MD5。
3. 记录文件大小、时间戳、压缩格式。
4. 解包到隔离目录。
5. 搜索 `NeoDark.exe`、`.Tdg`、`NeoDarkSaver`、`nds.com.cn`。
6. 对 PE 文件做静态依赖和字符串扫描。
7. 输出完整目录树与扩展名统计。
8. 识别图片、音频、地图、脚本、配置和网络地址。
9. 若需运行，优先在隔离 Windows VM / 沙箱中做动态分析。

## 暂未发现

- 官方源码
- 服务端源码
- 可信完整私服端
- 公开 GitHub 客户端源码
- `.Tdg` 格式公开文档

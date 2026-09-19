# M6 Dual-class Matrix Provenance

## Authority

唯一 machine-readable authority：`manifests/m6-dual-class-ten-stage-matrix.json`。本文件只解释来源与分层，不另建竞争数据表。

## Source chain

1. M6 baseline `4aea5b81fa4cca00c9a80b3ff2389eb391c09b17`。
2. fixed installer `c42f37b...cdae88`，静态提取；原二进制不执行。
3. `Set.lib` `ce1bb042...b3c82fe`。
4. S25 probe `tools/probe_m6_dual_class_matrix.py`；synthetic tests + fixed-hash CI。
5. GitHub Actions run `35476887492` 成功；source artifact `10593539733`, digest `sha256:6374e56df74bd9599f445309b76b26aaf9b6593ecf138da151a687a294e201e0`。
6. artifact `source-matrix.json` SHA-256 `3b948fccfb34f9fcfa24938ba5f9335003a50da36daca35dd93bc15b2c07d136`。
7. Visual family 再以 Drive `lapis-rebuild-assets/30_parsed/tables/client-files-verified-20260915.csv`（SHA `ccef8ede9627a27f167c63d0896c32c006b12de49af068f466199808b2f849ce`）交叉核对，目标 200/200 文件存在。

## Evidence vocabulary

- `VERIFIED`：项目动态/工程验证事实。
- `VERIFIED-STATIC-ORIGINAL`：固定哈希大陆 2.2 原客户端/资源中的直接静态事实。
- `VERIFIED-HISTORICAL`：独立历史材料，只描述其地域/年份边界。
- `RECOVERED_SECONDARY`：兼容层/恢复链支持，但不能直接提升成 2003 原服务端事实。
- `INFERRED`：静态模式很强但缺直接消费链/动态 authority。
- `SERVER-BOUNDARY`：客户端无法证明最终决定，需要旧服务器侧证据。
- `RECONSTRUCTION_POLICY`：离线重构主动制定、可替换的规则。
- `UNVERIFIED`：目前证据不足。

## Field discipline

- 原 header 是 `dex`，不是 `AGI`；S25 不做同义替换。
- `mcon/mwis/mstr/mdex/mint/mreg` 原样保存，禁止自行解释公式。
- `levelabl` `experience_value` 是静态表值，不等同于已恢复 EXP 公式。
- `next_class_raw` 是静态表值；把它当 promotion 条件属于推断/重构。
- `Magictbl EA/EB/EC` 是 authored raw effect params，不能直接组成伤害公式。
- item class flag 与 `ability.cla` 的数值对齐保持 `INFERRED`，直到找到 retail consumer。

# 图标历史记录

这里保存已经完成的图标接入与迁移证据，不作为日常来源或生成器输入。迁入时仅移动文件，原始字节和记录内容不变。

| 文件 | 原位置 | SHA-256 |
| --- | --- | --- |
| [outline-additions-oct29.json](outline-additions-oct29.json) | `packages/yakit-ui/test/fixtures/icons/reference/outline-additions-oct29.json` | `b68c65c06a8b37b6ffff18845c5ebbe3bade8c4d3b53cb70665d46a62e963446` |
| [7470671a07-package-migrated-canary.json](7470671a07-package-migrated-canary.json) | `packages/yakit-ui/src/icons/inventories/yakit-migration/7470671a07-package-migrated-canary.json` | `b1b9616449de79a4f4f788122385031b6ce772a4634daf9d2cdea355ab7da27f` |
| [capture-icon-adjustable-baseline-maintained.mjs.txt](capture-icon-adjustable-baseline-maintained.mjs.txt) | `packages/yakit-ui/scripts/capture-icon-adjustable-baseline.mjs` | `2c0dd960c30d6f1a119d4756bede975602343c1bf0b73cc2b68eae0da657e07f` |
| [normalize-icon-stroke-width-maintained.mjs.txt](normalize-icon-stroke-width-maintained.mjs.txt) | `packages/yakit-ui/scripts/normalize-icon-stroke-width.mjs` | `fd86f9c06e59f71d128708fc59f11f05efbe8d19f4a1d0ce45d7be97fb9b4cf9` |

- `outline-additions-oct29.json`：保留四个新增图标当次的 Figma 导出方式、原始 SVG、坐标和新增批次；日常修改使用 `config/icon-sources/outline.json`。
- `7470671a07-package-migrated-canary.json`：保留迁移批次、旧仓库提交号和注册表核验状态；其中的核验状态不代表视觉审核通过。

这些记录不因后续图标更新而改写；原始文件路径仅用于历史追溯。

## 已移除的来源文件怎么查

以下旧路径均相对于 `packages/yakit-ui/`。当前内容由唯一来源计算，不再保存同名 JSON；`#raw`、`#placement` 是脚本支持的数据视图，不是磁盘文件或 JSON 字段。

| 历史路径 | 当前来源 | 当前读取入口 |
| --- | --- | --- |
| `test/fixtures/icons/reference/figma-outline-raw-provenance-v1.json` | [outline.json](../../packages/yakit-ui/config/icon-sources/outline.json) | `config/icon-sources/outline.json#raw` |
| `test/fixtures/icons/reference/figma-outline-placement-provenance-v1.json` | [outline.json](../../packages/yakit-ui/config/icon-sources/outline.json) | `config/icon-sources/outline.json#placement` |
| `test/fixtures/icons/reference/figma-solid-raw-provenance-v1.json` | [solid.json](../../packages/yakit-ui/config/icon-sources/solid.json) | `config/icon-sources/solid.json#raw` |
| `test/fixtures/icons/reference/figma-solid-placement-provenance-v1.json` | [solid.json](../../packages/yakit-ui/config/icon-sources/solid.json) | `config/icon-sources/solid.json#placement` |

[Bug 几何审查记录](../../packages/yakit-ui/test/fixtures/icons/adjustable-stroke/bug-geometry-review.json) 中的 `sourceNode.provenanceFile` 保留历史路径。现在应在 `outline.json` 中按 `fileKey = QWct5XE0Bg0bNDQ93eYgEw`、`records[].nodeId = 1:3136` 查找，原始设计 SVG 位于该记录的 `raw.svg`。此次迁移核对时，其 SHA-256 为 `dfbbeeab2616a24b43adf7df5d1ea77f6feac09b5995d32583693e55208f617a`，与审查记录一致。后续同步若改变原稿，应重新核对审查适用性，不能改历史哈希让检查通过。

## 当前一致性与历史完整性分别校验

[before.json](../../packages/yakit-ui/test/fixtures/icons/stroke-width-1/before.json) 中的 `provenanceHashes` 和旧路径保持原样：

- 四份已移除的来源文件：日常测试检查当前来源视图与当前 manifest 的哈希是否一致；这不能证明历史文件字节未变。
- 其他仍保留的历史文件：测试继续逐个读取文件，并与 `before.json` 中冻结的原始哈希比较。
- 要复核四份旧文件的历史字节，使用 `before.json` 的 `baselineCommit`：`2ae1c3c9a41746ec57b820d226a7f91153d90a9d`。本次已从该提交取出四份文件，逐一确认与冻结哈希一致。这属于迁移核验，日常测试不依赖完整 Git 历史。

例如，在仓库根目录只读查看旧 Outline 原稿文件的哈希：

```sh
git show 2ae1c3c9a41746ec57b820d226a7f91153d90a9d:packages/yakit-ui/test/fixtures/icons/reference/figma-outline-raw-provenance-v1.json | shasum -a 256
```

应得到 `d977a63d4ec9f06a7fca9fee388a1cc5eaffabb683a7cfb9ca7e401808790f4d`。浅克隆若缺少该提交，需要先取得对应历史，不能用当前视图冒充历史文件。

## 两个采集脚本版本的区别

- 真正用于历史基线采集的原版保留在 [historical-capture.mjs.txt](../../packages/yakit-ui/test/fixtures/icons/adjustable-stroke/historical-capture.mjs.txt)，SHA-256 为 `44f6c06e3289fdae24cb478800a443df2aad30e98cc2d3e1acaf08081ab57743`，与历史 manifest 的 `captureScript.sha256` 一致。manifest 中的脚本旧路径保持原样，通过此处追溯到原版。
- 本目录的 `capture-icon-adjustable-baseline-maintained.mjs.txt` 是后续维护版，预期 Outline 数量从 350 改为 359、Solid 从 255 改为 256，并有代码清理。它不能代表原采集脚本，两个版本均保留，不互相覆盖。

后续维护版已从可执行脚本目录退役，原始字节未改。两份 `.txt` 都仅作历史证据；旧代码会写入固定的历史基线目录，且依赖当时的数量、浏览器和工作区记录，不能拿来重建或覆盖已有基线。将来如需新采集工具，应另设输出目录和新的审查流程。

## 已退役的描边迁移工具

`normalize-icon-stroke-width-maintained.mjs.txt` 保存退役时工作区的脚本原文，字节未改。它是后续维护版，不代表最初执行迁移时的脚本版本；旧相对路径和写入逻辑仅供追溯，不应直接恢复执行。

描边迁移已经完成，原可执行文件及其专属的采集、迁移规划、历史输入准入和应用写入测试已移除。日常使用 `check-icon-stroke-width.mjs --check` 检查当前图标；`icon-stroke-width.test.ts` 继续校验当前图标与历史原稿、审核记录、来源哈希和 Oldicon 公开名称的对应关系。原始 SVG、`before.json`、图片和审核记录均保留。

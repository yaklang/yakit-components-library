# 源码归属与历史资料

公共图标由本包独立拥有，UI 只保留兼容转发入口。UI 内部的特殊 SVG 和组件截图仍由 UI 管理。

| 内容 | 当前包内位置 | 迁移前位置 |
| --- | --- | --- |
| 公共组件与 SVG | `src/` | `packages/yakit-ui/src/icons/` |
| 五类公共来源 | `config/icon-sources/` | UI 的同名目录，不含 `private.json` |
| 生成与审计工具 | `scripts/`、`config/` | UI 的对应工具 |
| 公共图标测试与基线 | `test/` | UI 的对应图标测试目录 |
| 历史审查及归档工具 | `docs/icon-history/` | 仓库级 `docs/icon-history/` |

完整原路径、目标路径和迁移前哈希见 [迁移清单](source-relocation.json)。其中 `immutable` 标记迁移时的素材或证据；日常 SVG 和来源仍可正常更新，`verify:history` 只持续冻结历史基线、截图和归档资料。`scripts/*.json` 中的来源清单和几何配置属于维护数据，可以更新；迁移清单里的原始哈希仍保留，用于追溯迁移时的内容。

```sh
pnpm --filter @yakit-libs/yakit-ui-icons run verify:history
pnpm icons:verify-isolation
```

历史图片和记录的字节未改。测试通过读取映射解析历史 `src/icons/` 路径，不重写记录里的提交号、审核人和哈希。归档工具保持 `.txt`，不能用来覆盖基线。历史资料不包含在 npm 发布产物中。

## 已移除的来源文件怎么查

旧 raw/placement 文件的当前内容由 [Outline 来源](../config/icon-sources/outline.json) 和 [Solid 来源](../config/icon-sources/solid.json) 计算，脚本继续支持 `#raw`、`#placement` 和 `#manifest` 视图。

历史原稿的哈希与当前来源一致性是两种检查。需要复核旧文件时，按照 [冻结快照](../test/fixtures/icons/stroke-width-1/before.json) 的 `baselineCommit` 和原路径读取 Git 历史；不能用当前生成视图冒充历史字节。[Bug 几何审查](../test/fixtures/icons/adjustable-stroke/bug-geometry-review.json) 也保持原内容。

## 两个采集脚本版本的区别

[原始采集脚本](../test/fixtures/icons/adjustable-stroke/historical-capture.mjs.txt) 与 [后续维护版本](icon-history/capture-icon-adjustable-baseline-maintained.mjs.txt) 各自保留，不能互换。

[原历史说明](icon-history/README.md) 作为冻结资料保留，里面的旧目录和旧链接按迁移清单解释；当前维护应使用本页链接。

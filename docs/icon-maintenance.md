# 图标怎么添加和更新

公共图标源码、来源和专属测试由 `packages/yakit-ui-icons` 独立维护。UI 通过 `@yakit-libs/yakit-ui-icons` 的公开入口使用图标；仓库内依赖为 `workspace:^`，打包时转换成正常版本范围。不要跨目录导入图标包的 `src` 或原始 SVG。

UI 组件私有 SVG 和 `packages/yakit-ui/config/icon-sources/private.json` 仍归 UI。根目录的 `icons:update` 先检查私有资源登记，再更新公共图标；图标包自己的 `icons:update` 不依赖 UI。`pnpm icons:verify-isolation` 会在没有 UI 源码的临时目录验证公共图标生成、审计、工作流、类型、构建和产物。

Storybook 继续由 UI 统一展示。UI 的 `storybook`、`start:dev`、`dev` 命令先构建图标包，再启动图标构建监听；直接运行集成测试前先构建图标包。历史资料的位置与内容校验见 [源码归属与历史资料](../packages/yakit-ui-icons/docs/source-layout.md)。

可以把 **Figma 图标节点链接或 nodeId** 发给 Agent，支持一次提供多个，也可以混合提供。nodeId 支持 `47351:7055` 和 `47351-7055` 两种写法。

> 使用 `.agents/skills/sync-icon-sources/SKILL.md`，把节点 `47351:7055` 同步到图标库。

Agent 先检查这些节点在项目里是否已经存在，再按用户意图使用 figma-developer-mcp 获取信息和 SVG，运行项目脚本。只说“更新来源记录”时，仅保存来源；说“同步到图标库”时才生成 SVG、导出、清单和相关配置。

## 先查是否已有，再决定做什么

以下是 Agent 接收链接或 nodeId 时的处理要求：

1. **确定 Figma 文件和节点。** 链接中直接提取 fileKey 和 nodeId；只给 nodeId 时，先从项目来源记录或当前对话中确定所属 Figma 文件。nodeId 只在同一个 Figma 文件内唯一，不能单凭数字认定是同一个图标。无法唯一确定文件时，弹框请用户补充文件链接或 fileKey。调用导入脚本前，由 Agent 将 fileKey 和 nodeId 组合成完整链接；脚本的 `url` 输入格式保持不变。
2. **检查所有分类。** 在 `packages/yakit-ui-icons/config/icon-sources/` 的所有分类中查找，并检查 `packages/yakit-ui/config/icon-sources/private.json` 的内部图标记录，结合已有 SVG、导出和历史来源确认对应关系，不能只检查 Outline 或只按 SVG 文件名判断。列出命中的分类、公开导出名（如有）和本地文件路径；只命中历史记录或来源与文件不一致时，明确说明，不能直接当作全新图标新增。
3. **已存在但用户没说要做什么时，先弹框询问。** 例如用户只发了链接或 nodeId，没有提出具体问题，也没有说明更新范围，Agent 应在弹框中说明“项目里已有这个图标”，让用户选择“查看现有图标与来源”“只更新来源记录”或“同步更新图标库”。用户回答前，只做只读检查，不覆盖来源、SVG 或导出。多个节点可以合并询问，并分别标明哪些已存在、哪些未找到。
4. **用户已经说清楚，就按要求处理。** 用户只问“这个图标存在吗”，就回答检查结果；用户已明确要求更新来源或同步图标库，就在该范围内继续，不因节点已存在而重复询问。没有找到的节点按新增流程处理，但用户只发节点、没有表达新增或同步意图时，也先确认要做什么。

以上询问发生在写入前，由 Agent 发起；`pnpm icons:update` 是生成命令，本身不会弹框判断用户意图。已有图标更新时仍保留公开导出名、分类和兼容路径。

## 文件名和代码里的名字

例如节点 `47351:7055` 对应 `47351-7055.svg`，代码导出 `ArrowUpFromDotOutlined`。已有图标保留导出名，即使 Figma 中改了名称也不自动改业务 API。新增导出名来自节点英文名称，按分类加 `Outlined`、`Solid` 或 `Colorful`；分类或英文含义不明确时 Agent 会询问。

现有 Colorful 文件名和 Oldicon 深层导入路径保持兼容。新 Figma SVG 使用 nodeId 文件名。重复文件名或导出名会报错，不覆盖其他图标。

## 平时用的命令

```sh
pnpm icons:update                  # 更新所有分类和公共生成文件
pnpm icons:update --family outline # 单个分类：outline/solid/colorful/oldicon/loading
pnpm icons:update --check           # 离线只读检查，CI 使用
pnpm icons:test                     # 在临时目录验证导入、生成、失败回滚等行为
```

脚本先验证来源、准备全部结果，再写入；写入失败会撤回本次已经写入的文件。检查模式不访问 Figma，也不重写文件。重复运行没有差异。删除来源记录不会自动删除公开导出，而是报错，要求另做明确的兼容性迁移。

普通新增不用再手填图标总数、哈希或另建带日期的新增记录。生成文件仍可能有多个，这是构建、校验各自需要的结果；只维护来源，交给脚本更新这些结果。

## 哪些是来源，哪些是结果

- `packages/yakit-ui-icons/config/icon-sources/`：唯一日常维护入口，按五个分类保存。Outline/Solid 每个节点一条记录，合并原始 SVG、摆放证据、导出对应关系；Colorful 保留分组和多色规则；Oldicon 按共享素材合并来源与别名；Loading 保存手写组件入口。UI 包的 `config/icon-sources/private.json` 登记组件内部 SVG，只校验完整性，不导出。
- Outline、Solid、Colorful 三份旧清单、Outline/Solid 四份 raw/placement 文件，以及 Oldicon inventory 已移除。需要这些数据的脚本和测试，通过 `icon-source-documents.mjs` 从唯一来源即时计算，不再保存另一份 JSON。
- 各分类导出、名称目录和线宽配置仍是构建需要的生成文件，用 `icons:update` 更新。
- 历史图片、prechange baseline、figma-basic 旧清单、已有带日期的设计更新、人工审查记录：独立对照证据，普通更新不会重写。原始 Figma SVG 不等于主题化后的生产 SVG。

来源中的 `metadata` 保存原有分类与规则，`raw` 保存设计原稿；哈希和数量由生成器计算。历史记录中的 `reviewedBy` 等保留历史含义，生成器不会替 Agent 填审核人。

已有复杂蒙版或几何修正保留现状；从 MCP 重新获取后如不能通过原始设计与生产 SVG 的对照，生成会报出节点/文件，需要有依据的人工处理，不能通过改基线消除错误。

## Oldicon、Loading 和内部图标

Oldicon 的素材按内容哈希命名，这是已发布兼容路径，不能统一改成 Figma nodeId。添加真实素材时，将归一化的 SVG 放入 assets（文件名为实际内容 SHA-256），在 `oldicon.json` 对应 artwork 中加入真实来源和导出名；共享素材可增加别名。脚本在内存中计算 inventory，只写入入口和每个深层组件，不需要外部 Yakit checkout。

Loading 等手写组件的动画和 props 仍需要编写代码；在 `loading.json` 登记文件、导出名和类型名后运行生成器。脚本不会把有逻辑的组件变成静态 SVG。组件内部 SVG 登记到 `private.json` 后只检查文件覆盖。

## 校验与提交

先运行 `pnpm icons:update --check` 和相关测试，再构建需要验证的包：

```sh
pnpm --filter @yakit-libs/yakit-ui-icons run build
pnpm --filter @yakit-libs/yakit-ui run test:ci
pnpm --filter @yakit-libs/yakit-ui run build:package
pnpm --filter @yakit-libs/yakit-ui-icons run build
```

最后可以要求 Agent 使用 `.agents/skills/commit-msg/SKILL.md` 生成信息或提交。图标同步不自动提交、推送或发布；changeset、版本号和 UI 延期发布源码哈希仍在准备发布时单独处理。

来源迁移已完成，一次性的 `migrate-icon-sources.mjs` 和从外部 Yakit 仓库导入素材的 `scripts/icon-migration/generate-oldicon.mjs` 已移除。已有来源记录、原始设计证据、图标素材和公开导出保留，日常统一使用 `icons:import` 与 `icons:update`。

审计脚本中的 `config/icon-sources/outline.json#manifest`、`#raw`、`#placement` 表示从同一来源计算的不同数据视图，不是磁盘上的新文件。显式传入独立 JSON 审查样本的用法仍受支持。

历史快照、图片和审查记录继续保留；历史快照里的旧路径保持原样，测试将其中四份当前 Figma 来源映射到新来源视图，其他历史文件仍逐个校验原始哈希。baseline 更新脚本仅在显式指定 `--output` 时导出审查结果，不再默认写回旧清单。名称目录和各分类导出统一由根目录的 `pnpm icons:update` 更新；按分类更新使用 `--family` 参数。旧的名称目录更新脚本和 Colorful 临时清单合并脚本已删除；仍需保留的 Colorful 去重函数已迁入 `colorful-icon-contracts.mjs`，不负责写入或删除文件。


## 日常命令与历史工具的边界

- 日常更新入口统一在仓库根目录：`pnpm icons:update` 更新全部分类，`pnpm icons:update --family solid` 更新 Solid，`pnpm icons:update --family colorful` 更新 Colorful。旧的 `update:icons:solid`、`update:icons:names`、`update:icons:colorful`、`update:icons:colorful-entries` 已删除，不再保留重复别名。
- `audit:icons:stroke` 使用 `scripts/check-icon-stroke-width.mjs --check`，只读检查来源登记和描边，拒绝 `--write`、`--capture`。旧的 `normalize-icon-stroke-width.mjs` 已原样归档到 `packages/yakit-ui-icons/docs/icon-history/normalize-icon-stroke-width-maintained.mjs.txt`，不再提供可执行入口。迁移专属测试已移除，当前描边、兼容性及历史证据校验继续保留。
- `colorful-entry-generator.mjs` 保留共享渲染函数和只读检查，不再接受 `--write`；日常写入统一走 `icons:update`。
- 两份没有直接代码引用但包含独有证据的旧记录已原样移至 [图标历史记录](../packages/yakit-ui-icons/docs/icon-history/README.md)。该目录记录原路径与内容哈希，既不参与日常生成，也不随当前图标修改。
- 已删除来源文件的旧路径、Bug 审查节点和历史哈希的查询方法见 [来源追溯说明](../packages/yakit-ui-icons/docs/source-layout.md#已移除的来源文件怎么查)。当前来源与当前 manifest 一致，不等于历史文件字节未变；历史字节通过冻结的提交号及哈希单独核验。
- `capture-icon-adjustable-baseline.mjs` 的后续维护版已原样归档为历史目录中的 `.mjs.txt`；真正用于历史基线采集的原版仍保留在 `adjustable-stroke/historical-capture.mjs.txt`。两个版本不可互换，也不参与日常命令，详见 [版本区别](../packages/yakit-ui-icons/docs/source-layout.md#两个采集脚本版本的区别)。

## Solid 描边规则

Outline 继续使用统一的 1.5 描边规则；Solid 保留 Figma 原稿的描边，不统一改写或限制为 1.5。Solid 审计仍严格比较原稿与生产 SVG 的路径、描边和颜色语义，修改生产描边而不更新来源会失败。例如 ImportSolid 使用 3px 描边配合遮罩实现 1.5px 外侧白边，必须完整保留。此规则不追溯批量替换其他 Solid 原稿；按指定节点同步。

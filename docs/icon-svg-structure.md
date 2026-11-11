# Outline / Solid SVG 结构核对

## 2026-11-11 指定六图标刷新

重新获取 Bug、Add Payload、Paper Airplane、Import、Paintbrush、Pill 六个节点。Bug、Add Payload、Import、Pill 的原稿有变化并已同步；Paper Airplane、Paintbrush 与已登记原稿逐字节一致。Bug 和 Add Payload 现在均为固定填充轮廓；Import 移除蒙版，Pill 用同一主色和 0.5 透明度表示两部分。主色继续映射为 currentColor，实际描边仍遵守各分类规则。

此前排除的 Bug、Add Payload、Pill 已纳入当前原稿核验，结构测试不再跳过两个 Outline。Bug、Add Payload 同步前的源码另存为历史审核候选，保留原有审核哈希与图像；当前来源的几何审核标记已解除。以下内容保留为此前同步记录。

## 2026-11-10 同步结果

在此前结构核对后，用户明确要求以最新远端代码替换本地修正，继续遵守本地主题颜色和线宽规则。本轮重新导出远端全部目标，更新剩余 33 个图标（Outline 32、Solid 1）。先前保留的结构差异中，仅明确排除的 BugOutlined、AddPayloadOutlined 继续保留；PillSolid 也按要求排除。下文初次核对的 13 项保留清单是历史记录，已被本节结果取代。

10 个纯填充 Outline 登记为固定填充，不能通过 strokeWidth 改变粗细；StarOff、RocketLaunchOff 恢复原稿白色覆盖线，深色／透明背景的效果随原稿变化。详情见 [线宽能力说明](../packages/yakit-ui-icons/docs/icon-stroke-capabilities.md)。

本轮不修改历史图片或审核基线；12 份被替代的审核候选源码保留原始字节，用原有 SHA 校验。当前图标以实际新原稿核验，历史审核不再冒充当前审核。

最终重新比较 625 个未排除的图标（Outline 370、Solid 255），在主题主色、Outline 线宽及 fragment ID 归一化后，标签、嵌套、路径及其他属性差异为 0。33 个更新节点重复导入均 unchanged，生成检查无漂移。核心专项测试 409 项、当前来源及历史证据测试 40 项、浏览器组件测试 83 项、工作流测试 26 项、Storybook 集成测试 14 项通过，构建、公开类型检查和全分类审计通过。原有两项冻结 Chrome 可执行文件哈希校验仍受环境差异限制，未修改基线。

## 初次核对记录

2026-11-10 通过 figma-developer-mcp 读取项目来源文件中的 Outline / Solid 分组，并下载全部 **626 个已登记图标**的 SVG（Outline 370、Solid 256）。本次范围为现有公开图标，不新增远端分组中的其他节点。

## 同步结果

| 分类 | 结构不同 | 已同步 | 保留独立绘制修正 |
| --- | ---: | ---: | ---: |
| Outline | 141 | 128 | 13 |
| Solid | 113 | 113 | 0 |

其余 372 个图标的元素类型、顺序和嵌套结构与本次远端导出相同。本次不声称这些图标的所有属性都已重新同步。

`BookOpenTextOutlined`（`39320:7452`）由两层空 `<g>` 包裹一个 `<path>` 改为 SVG 根元素直接包含一个 `<path>`。其他同步包括移除旧分组、跟随 Figma 合并路径，以及恢复导出的 `<rect>` 等真实元素。原始 SVG 保存在来源记录中，生产 SVG 仍遵守 Outline 1.5 描边、Solid 原始描边和既有主题颜色规则。

本次同步也包含远端现有几何变化：`SirenOutlined`（`41277:17407`）的灯体上移，内部竖线移除。对全部 241 个更新图标以同一 Chromium、4 倍尺寸进行更新前后透明像素对比，223 个完全相同；除 Siren 外的差异主要来自路径合并及路径序列化后的栅格化，已检查最大差异项的前后图像。

## 保留的 13 个结构差异

这些 Outline 图标包含已有独立审核的可调描边重建或擦除处理。本次没有用扁平填充轮廓覆盖真实描边，也没有删除用于透明背景的语义蒙版。

处理依据为项目 [sync-icon-sources 技能](../.agents/skills/sync-icon-sources/SKILL.md)：“Outline 原图必须保留真实 stroke；下载得到纯填充轮廓时停止该节点，不猜测中心线”，以及“复杂蒙版、擦除语义等无法自动归一化时保留原始证据并报告”。因此这些项作为明确差异保留，不标记为已同步。

| 公开导出名 | Figma nodeId | 保留原因 |
| --- | --- | --- |
| CurrencyDollarOutlined | 1:2107 | 已审核描边重建 |
| ClipboardCheckOutlined | 1:2273 | 已审核描边重建 |
| BugOutlined | 1:3136 | Bug 可调描边修正 |
| SupportOutlined | 1:2407 | 已审核描边重建 |
| PresentationChartLineOutlined | 1:2519 | 已审核描边重建 |
| StatusOfflineOutlined | 1:2523 | 已审核描边重建 |
| RocketOffOutlined | 14203:193637 | 已审核几何与裁剪修正 |
| RocketLaunchOffOutlined | 14203:193724 | 已审核几何与擦除蒙版 |
| AddPayloadOutlined | 17117:250680 | 已审核描边重建 |
| SpeechToTextOutlined | 39330:10456 | 已审核描边重建 |
| SpeechToText2Outlined | 39338:10493 | 已审核描边重建 |
| DataComparisonOutlined | 45035:1908 | 已审核几何、裁剪及透明度 |
| StarOffOutlined | 38678:28634 | 透明背景所需的 luminance 擦除蒙版 |

Figma 文件为 `QWct5XE0Bg0bNDQ93eYgEw`；节点链接可由来源记录的 fileKey 和 nodeId 组合。上述图标的原有来源、生产文件与历史视觉基线均保留。

## 后续维护与防回归

- 明确同步旧图标时，导入输入可设置 `syncProduction: true`。即使原稿字节未变，也会为尚未登记生成策略的旧图标建立生产生成关系；重复导入不产生修改。涉及上述独立修正时不能直接使用该选项覆盖。
- 导入会将旧 Outline 蒙版的颜色例外记录迁移到实际生成的 fragment ID；不会新增颜色授权。已有 `defaultColor` 继续由组件提供，SVG 使用 `currentColor`，保证 Ear 等图标支持颜色覆盖。
- `icon-source-structure.test.ts` 检查全部 Outline / Solid 的元素顺序和嵌套，只有上述 13 个明确例外。单纯的几何 canonicalization 会忽略空 `<g>`，不能替代结构检查。
- 工作流测试覆盖多余分组、缺失路径、原稿未变时显式同步、只读检查、修复和重复执行。历史基线文件不更新；已重新导入图标的当前形态与当前原稿核对，历史证据继续单独校验。

两项冻结浏览器校验要求 Chrome 可执行文件 SHA-256 为 `755178ee89130a6f1c94cc4ecb2289fe74240db3e7efe9ec69a6cfcd4b93a6ee`，本机当前为 `96832d133a25d835dfae36b6312de100e4d4cbe2f5e4eb0d2eac170da54672ad`。这两项环境校验未通过，本次没有改写冻结记录。

其余相关测试 342 项通过；工作流测试 24 项、Storybook 集成测试 14 项通过。离线生成检查、全分类审计、图标包构建和公开类型检查通过。再次导入本次 241 个节点均为 unchanged，生成检查无漂移。

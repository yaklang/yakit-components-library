---
"@yakit-libs/yakit-ui-icons": patch
---

- 同步 Outline、Solid 和 Colorful 图标的 Figma 原稿，修正图形、填充、透明度和内部引用，保留原稿中的渐变与内嵌图片。
- 新增 `MenuExpandOutlined` 和 `MenuCollapseOutlined`，分别用于菜单展开和折叠。已有组件导出名、公开导入路径和 Oldicon 深层路径保持不变。
- 部分 Outline 恢复为原稿的固定填充轮廓，包括 `BugOutlined`、`AddPayloadOutlined`、`CurrencyDollarOutlined`、`TagOutlined`、`QrcodeOutlined`、`ClipboardCheckOutlined`、`SupportOutlined`、`PresentationChartLineOutlined`、`StatusOfflineOutlined`、`RocketOffOutlined`、`SpeechToTextOutlined` 和 `SpeechToText2Outlined`。这些图标不再通过重建描边实现线宽调整。
- 更新 Solid 图形：`ImportSolid` 按原稿移除黑白蒙版，`PillSolid` 使用主色填充和 50% 透明度。完善 Colorful 主题颜色映射，Memfit 和 IRify 标志中的文字可随对应主题变量变化，并保留原始颜色作为回退值。

升级时请注意：固定填充图标的 `svgProps.strokeWidth` 和 `svgProps.style.strokeWidth` 不会改变填充轮廓的粗细，传入 `0` 也不会隐藏填充；需要隐藏整个图标时，应控制组件是否渲染或使用 CSS。`RocketLaunchOffOutlined` 和 `DataComparisonOutlined` 中只有真实描边部分响应线宽参数。`StarOffOutlined`、`RocketLaunchOffOutlined` 保留原稿的白色覆盖线，在深色或透明背景上也会显示白色，建议检查相关页面的展示效果。其他 Outline 的真实描边仍默认使用 1.5；Solid、Colorful 和 Oldicon 保留素材原有线宽。

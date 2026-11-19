# @yakit-libs/yakit-ui-icons

## 0.3.3

### Patch Changes

- 7b3c5ae: 修复 `BugOutlined` 的 `svgProps.strokeWidth` 不生效的问题。后续从 Figma 同步该图标时也会保留可调描边。
- 7f68007: 让图标根节点的 `style.color` 直接覆盖后代 SVG 上的竞争颜色规则，无需调用方额外传入 `svgProps`。

## 0.3.2

### Patch Changes

- 03d4e88: - 同步 Outline、Solid 和 Colorful 图标的 Figma 原稿，修正图形、填充、透明度和内部引用，保留原稿中的渐变。
  - 按最新设计移除 `UserAvatarColorful` 和 `OfficialAvatarColorful` 的内嵌头像图片；普通用户头像改为浅色圆底，官方头像保留身份徽章。组件名称、尺寸和导入方式不变。
  - 新增 `MenuExpandOutlined` 和 `MenuCollapseOutlined`，分别用于菜单展开和折叠。已有组件导出名、公开导入路径和 Oldicon 深层路径保持不变。
  - 部分 Outline 恢复为原稿的固定填充轮廓，包括 `BugOutlined`、`AddPayloadOutlined`、`CurrencyDollarOutlined`、`TagOutlined`、`QrcodeOutlined`、`ClipboardCheckOutlined`、`SupportOutlined`、`PresentationChartLineOutlined`、`StatusOfflineOutlined`、`RocketOffOutlined`、`SpeechToTextOutlined` 和 `SpeechToText2Outlined`。这些图标不再通过重建描边实现线宽调整。
  - 更新 Solid 图形：`ImportSolid` 按原稿移除黑白蒙版，`PillSolid` 使用主色填充和 50% 透明度。完善 Colorful 主题颜色映射，Memfit 和 IRify 标志中的文字可随对应主题变量变化，并保留原始颜色作为回退值。

  升级时请注意：固定填充图标的 `svgProps.strokeWidth` 和 `svgProps.style.strokeWidth` 不会改变填充轮廓的粗细，传入 `0` 也不会隐藏填充；需要隐藏整个图标时，应控制组件是否渲染或使用 CSS。`RocketLaunchOffOutlined` 和 `DataComparisonOutlined` 中只有真实描边部分响应线宽参数。`StarOffOutlined`、`RocketLaunchOffOutlined` 保留原稿的白色覆盖线，在深色或透明背景上也会显示白色，建议检查相关页面的展示效果。其他 Outline 的真实描边仍默认使用 1.5；Solid、Colorful 和 Oldicon 保留素材原有线宽。

## 0.3.1

### Patch Changes

- 5a0d0d0: - Add 10 Outline icons: `ArrowUpFromDotOutlined`, `ArrowsUpDownOutlined`, `ArrowsTransferUpOutlined`, `ArrowsTransferDownOutlined`, `SwitchCameraOutlined`, `CircleArrowUpOutlined`, `HistoryOutlined`, `AtOutlined`, `HandDepositOutlined` and `TimerOffOutlined`.
  - Add the gradient `AIColorful` icon and six file icons: `AddFileTypeColorful`, `UnknownFileType2Colorful`, `PowerPointFileType2Colorful`, `ExcelFileType2Colorful`, `PdfFileType2Colorful` and `WordFileType2Colorful`. Existing monochrome AI and file icons remain available.
  - Update `ParkLeftSolid`, `ParkRightSolid`, `ParkBelowSolid`, `ParkAboveSolid` and `ImportSolid` to match their Figma designs while preserving their export names and dimensions.
  - Change the secondary artwork in `DataComparisonOutlined` to 50% opacity instead of a calculated lighter color. Its appearance now depends on the background, especially in dark themes.
  - Use Figma-bound theme color variables, with original color fallbacks, for `AiPrimaryMenuColorful`, `PluginStorePrimaryMenuColorful`, `ToolLibrarySecondaryMenuColorful`, `KnowledgeBaseSecondaryMenuColorful`, `SkillLibrarySecondaryMenuColorful` and `MemoryLibrarySecondaryMenuColorful`. Their artwork and dimensions are unchanged; their colors follow the active theme. Their registry `paintMode` changes from `literal` to `mixed`.
  - Limit uniform stroke-width normalization to Outline icons. Solid, Colorful and Oldicon retain their original stroke widths; `svgProps.strokeWidth` remains a native root SVG attribute for these families and does not override fixed widths on inner shapes. Outline and Loading retain their adjustable stroke-width behavior.
  - Add `colorful-icon` to `ColorfulIconCategory`. In the registry, `CommandOutlined` now has the display name `Outline/Command` and source status `current`; `LandPlotOutlined` changes its display name from `Icon/LandPlot` to `Outline/LandPlot`. Consumers with exhaustive category maps or lookups by display name should update them; existing `exportName` identifiers remain unchanged.
  - Make the public icon package independent of UI source while preserving existing public imports, component props, Oldicon deep paths, browser CSS loading and CSS-free Node SSR.
- 5882896: Add React 19 support to the icon package while retaining React 18 compatibility.

  The React peer range now accepts `^18.2.0 || ^19.0.0`.

## 0.2.9

### Patch Changes

- Set built-in icon stroke widths to `1.5`, including Outline, Solid, Colorful, Oldicon and Loading, while preserving presentation overrides.
- Correct legacy `OutlineViewGridIcon` to match the four hollow rounded cells in Figma `Outline/view-grid`.
- Include `ArrowUpToLineOutlined` from main with the uniform `1.5` stroke width.

## 0.2.8

### Patch Changes

- Correct `FloatingSolid`, `ParkLeftSolid`, `ParkRightSolid`, and `ParkBelowSolid` to match the current Figma geometry, inset spacing, and 60% fill opacity.
- Add `ParkAboveSolid` with matching color and size behavior across the root and Solid exports.

## 0.2.7

### Patch Changes

- Add `IntentionOutlined`, `GanttChartOutlined` and `SquareGanttChartOutlined`, including adjustable stroke widths and public exports.
- **Breaking API migration:** rename 32 Outline/Solid exports to the English names in Figma. Previous exports are removed; update imports and JSX using the [migration table](https://github.com/yaklang/yakit-components-library/blob/main/docs/pending-releases/english-icon-names.md).
- Allow distinct icon nodes to share a Figma display name while retaining unique public exports and source identities.

## 0.2.6

### Patch Changes

- Update `SparklesOutlined` and `LightBulbOutlined` to the latest Figma designs.
- Add `HourglassOutlined`, `GitMergeOutlined`, `LoaderPinwheelOutlined`, `FolderArchiveOutlined`, `FileArchiveOutlined` and `Sparkles2Outlined`, with adjustable stroke widths and public exports.

## 0.2.5

### Patch Changes

- Normalize the visual weight of colorful Outline icons while preserving their fills, accents and public names.
- Unify avatar badge outlines and restore the intended badge details at native icon sizes.

## 0.2.4

### Patch Changes

- Unify built-in icon stroke widths to one SVG user unit while preserving public exports and color behavior.
- Support adjustable stroke widths for Outline icons and Loading, and rebuild filled contours in BugOutlined, QrcodeOutlined and other affected icons to correct heavy lines.

## 0.2.3

### Patch Changes

- 4b9c383: 将 oldicon 兼容入口拆分为可摇树的独立图标 ESM，并公开带类型与浏览器样式条件的 `oldicon/<IconName>` named-export 子路径；保留原有 `oldicon` 聚合入口。

## 0.2.2

### Patch Changes

- e1d43f4: Add the isolated `oldicon` compatibility entry for legacy Yakit SVG implementations that cannot be replaced safely by the curated icon families.
- e1d43f4: Publish the icon package independently, document and verify its stable public auto-import paths, preserve single-icon tree shaking across Vite and esbuild consumers, and add exact-tarball size evidence.

## 0.2.1

### Patch Changes

- cc577a0: Add the Figma-audited colorful icon catalog, grouped Storybook documentation, public colorful icon subpath exports, and Ant Design-compatible icon wrapper behavior for both packages.

## 0.2.0

### Minor Changes

- a4e8bae: Correct `NotebookOutlined` to the current Figma source and add the `Notebook2Outlined`, `RotateCcwOutlined`, `FeatherOutlined`, `HardDriveDownloadOutlined`, `RotateCcwSquareOutlined`, `BookMarkedOutlined`, `BookMarked2Outlined`, and `TimerOutlined` exports.
- e74cb65: Breaking: rename every solid icon component from the `Filled` suffix to the `Solid` suffix. Consumers should replace imports such as `HomeFilled` with `HomeSolid`.

  The Storybook icon galleries are also consolidated under the single `Icon` group.

### Patch Changes

- a4e8bae: Use the `@yakit-libs/color@1.4.1` runtime neutral title token as the shared Outline and Solid icon default while preserving prop, style, inheritance, and scoped CSS-variable color overrides.
- a4e8bae: Normalize every explicit Outline and Solid icon stroke width to `1.5` and enforce the policy in icon audits and visual regression gates.

## 0.1.3

### Patch Changes

- 6eb88c1: Add the `@yakit-libs` npm keyword so both packages appear in the organization ecosystem search.

## 0.1.2

### Patch Changes

- c4138a7: Publish the component and React-only icon packages under the `@yakit-libs`
  organization scope.

## 0.1.1

### Patch Changes

- Add lightweight icon subpath exports and publish the React-only `@yakit-libs/yakit-ui-icons` package for consumers that do not install the component runtime.

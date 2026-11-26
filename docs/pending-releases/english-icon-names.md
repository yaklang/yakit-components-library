# Solid / Outline 英文图标名称迁移

依据设计师更新后的 Figma 名称，迁移 32 个原中文命名图标（outline 19 个、solid 13 个）。SVG 内容、源节点与导出数量不变。

这是公共 API 命名变更：旧导出不再保留，使用方应按下表更新 import 与 JSX。适用于 `@yakit-libs/yakit-ui` 与 `@yakit-libs/yakit-ui-icons` 及相应图标子入口。发布时需按破坏性变更处理。

`Variable2Outlined` 与 `VariableOutlined` 的 Figma 名称均为 `Outline/variable`，用英文导出名区分；registry 的唯一标识使用 exportName/sourceNodeId，不应使用展示名称 figmaName。

源 SVG 文件继续使用 node ID 以保留审计关联；其他原本英文图标的重名消歧导出不属于本次迁移。

| 旧导出                         | 新导出                     |
| ------------------------------ | -------------------------- |
| `FigmaIcon22915169930Outlined` | `AbandonOutlined`          |
| `FigmaIcon185545419Outlined`   | `LargeWindowOutlined`      |
| `FigmaIcon28011794Outlined`    | `LogOutOutlined`           |
| `FigmaIcon35020585Outlined`    | `ScreenshotOutlined`       |
| `ArrowsOutlined`               | `ArrowsCollapseOutlined`   |
| `FigmaIcon6708131177Outlined`  | `RemoteOutlined`           |
| `FigmaIcon2017756Outlined`     | `ExportOutlined`           |
| `FigmaIcon6480193584Outlined`  | `ImportOutlined`           |
| `FigmaIcon2338925Outlined`     | `Filter2Outlined`          |
| `FigmaIcon34227111185Outlined` | `Compilation2Outlined`     |
| `FigmaIcon348196674Outlined`   | `FlowOutlined`             |
| `FigmaIcon34227111184Outlined` | `CompilationOutlined`      |
| `FigmaIcon4866167279Outlined`  | `EngineOutlined`           |
| `FigmaIcon5237120699Outlined`  | `LoadingOutlined`          |
| `FigmaIcon11100165929Outlined` | `LineBreakOutlined`        |
| `FigmaIcon13208172881Outlined` | `StorageOutlined`          |
| `FigmaIcon22849134660Outlined` | `SplitScreenOutlined`      |
| `FigmaIcon22971301511Outlined` | `Variable2Outlined`        |
| `FigmaIcon450351908Outlined`   | `DataComparisonOutlined`   |
| `FigmaIcon2281144183Solid`     | `DragSortSolid`            |
| `FigmaIcon16035380989Solid`    | `ImportSolid`              |
| `FigmaIcon6500198204Solid`     | `ExportSolid`              |
| `FigmaIcon23101329992Solid`    | `AbandonSolid`             |
| `FigmaIcon224969180Solid`      | `PortSolid`                |
| `FigmaIcon16256302540Solid`    | `StorageSolid`             |
| `MinusFigma185545375Solid`     | `MinusEnlargeWindowSolid`  |
| `MinusFigma185545374Solid`     | `MinusShrinkWindowSolid`   |
| `SwitchSolid`                  | `SwitchConfigurationSolid` |
| `FigmaIcon4936115787Solid`     | `FloatingSolid`            |
| `FigmaIcon4936115790Solid`     | `ParkLeftSolid`            |
| `FigmaIcon4936115789Solid`     | `ParkRightSolid`           |
| `FigmaIcon4936115788Solid`     | `ParkBelowSolid`           |

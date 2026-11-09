---
"@yakit-libs/yakit-ui-icons": patch
---

- Add 10 Outline icons: `ArrowUpFromDotOutlined`, `ArrowsUpDownOutlined`, `ArrowsTransferUpOutlined`, `ArrowsTransferDownOutlined`, `SwitchCameraOutlined`, `CircleArrowUpOutlined`, `HistoryOutlined`, `AtOutlined`, `HandDepositOutlined` and `TimerOffOutlined`.
- Add the gradient `AIColorful` icon and six file icons: `AddFileTypeColorful`, `UnknownFileType2Colorful`, `PowerPointFileType2Colorful`, `ExcelFileType2Colorful`, `PdfFileType2Colorful` and `WordFileType2Colorful`. Existing monochrome AI and file icons remain available.
- Update `ParkLeftSolid`, `ParkRightSolid`, `ParkBelowSolid`, `ParkAboveSolid` and `ImportSolid` to match their Figma designs while preserving their export names and dimensions.
- Change the secondary artwork in `DataComparisonOutlined` to 50% opacity instead of a calculated lighter color. Its appearance now depends on the background, especially in dark themes.
- Use Figma-bound theme color variables, with original color fallbacks, for `AiPrimaryMenuColorful`, `PluginStorePrimaryMenuColorful`, `ToolLibrarySecondaryMenuColorful`, `KnowledgeBaseSecondaryMenuColorful`, `SkillLibrarySecondaryMenuColorful` and `MemoryLibrarySecondaryMenuColorful`. Their artwork and dimensions are unchanged; their colors follow the active theme. Their registry `paintMode` changes from `literal` to `mixed`.
- Limit uniform stroke-width normalization to Outline icons. Solid, Colorful and Oldicon retain their original stroke widths; `svgProps.strokeWidth` remains a native root SVG attribute for these families and does not override fixed widths on inner shapes. Outline and Loading retain their adjustable stroke-width behavior.
- Add `colorful-icon` to `ColorfulIconCategory`. In the registry, `CommandOutlined` now has the display name `Outline/Command` and source status `current`; `LandPlotOutlined` changes its display name from `Icon/LandPlot` to `Outline/LandPlot`. Consumers with exhaustive category maps or lookups by display name should update them; existing `exportName` identifiers remain unchanged.
- Make the public icon package independent of UI source while preserving existing public imports, component props, Oldicon deep paths, browser CSS loading and CSS-free Node SSR.

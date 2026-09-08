# @yakit-libs/yakit-ui-icons

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

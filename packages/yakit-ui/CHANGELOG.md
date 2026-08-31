# @yakit-libs/yakit-ui

## 0.2.2

### Patch Changes

- e1d43f4: Document the independent icon package as the canonical auto-import source while retaining the component package's icon paths as compatibility entries.
- 36a3fdd: Replace the existing component implementations and styling runtime with Yakit-owned React context, native DOM controls, static CSS, and CSS custom properties. Consumers no longer need `antd` or `@ant-design/cssinjs`.

  This release intentionally narrows public types that previously inherited the full Ant Design API:
  - `Input`, `Input.TextArea`, `Input.Password`, `Input.OTP`, `Input.Search`, and `InputNumber` now expose only the documented Yakit behavior and native attributes represented by their owned types. Remove unsupported Ant Design-only passthrough props.
  - `Input.OTP` keeps boolean password masking; Ant Design's custom string-mask extension is not part of the owned native contract.
  - `Input.Search.enterButton` accepts text, `true`, or one actionable React element. Arrays, fragments, and non-action content are unsupported and fall back to the default search action.
  - Replace `ConfigProvider`'s Ant Design `theme.algorithm` with `theme.mode: 'light' | 'dark'`. Ant Design `prefixCls` and other unowned provider props are removed; Yakit's `yakit-*` class names remain fixed.
  - Use the exported Yakit-owned `InputRef`, `TextAreaRef`, `OTPRef`, and `InputNumberRef` contracts instead of Ant Design ref types.
  - Keep `Input`'s existing six compound members: `TextArea`, `Search`, `Password`, `OTP`, `SearchTrigger`, and `Select`.

  Install with `@yakit-libs/yakit-ui`, `react`, and `react-dom`; remove direct consumer dependencies that existed only to satisfy this package's former Ant Design peer contract.

## 0.2.1

### Minor Changes

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

## 0.1.0

### Minor Changes

- 32a9429: Publish the first public release of the component library with its version-matched offline Storybook, launcher, and MIT license.

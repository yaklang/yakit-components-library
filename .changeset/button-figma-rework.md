---
"@yakit-libs/yakit-ui": minor
---

按 Figma 设计稿重构 `Button`，对齐 YakitButton 语义与 antd 行为。

- 破坏性：`color` 重命名为 `colors`，取值改为 `primary | success | danger | infoBlue`，移除 `warning`；`error` 重命名为 `danger`；`type="text1"` 重命名为 `type="text"`；移除 `circle` 形状。
- 新增：`Button.Group` 分段按钮组；`href`/`target`/`rel` 渲染为锚点；`block`、`isHover`、`isActive`、`radius`；`loading={{ delay, icon }}` 延迟加载；语义化 `classNames`/`styles` 的 `icon` 插槽；`forwardRef`。
- 行为：移除 `usePressed` hook，改用 CSS `:active`；disabled/loading 时关闭波纹；`<a>` 分支过滤 button-only 原生属性；delay 期间不禁用、可点击，与 antd 一致；Button 不设置 `aria-busy`（与 antd 一致）。
- 不支持：`autoInsertSpace` 未实现，设计稿默认两个汉字之间不加间距。
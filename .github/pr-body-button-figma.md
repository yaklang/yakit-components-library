## 摘要

按 Figma 设计稿重构 `Button` 组件，对齐 `YakitButton` 语义，并沿 antd 的行为边界收紧公共 API。

## 主要变更

### 破坏性 API 调整

| 旧 | 新 | 说明 |
|---|---|---|
| `color` | `colors` | 取值改为 `primary \| success \| danger \| infoBlue`，移除 `warning` |
| `error` | `danger` | 仅在未传 `colors` 时生效 |
| `type="text1"` | `type="text"` | 设计稿无 `text1` |
| `shape="circle"` | 移除 | 用 icon-only + `aria-label` 或 `radius` 替代 |
| `autoInsertSpace` | 不支持 | 设计稿默认两个汉字之间不加间距 |

### 新增能力

- `Button.Group`：分段按钮组，只负责拼接，不记录选中态
- `href` / `target` / `rel`：渲染为 `<a>`，disabled/loading 时移除链接
- `block`、`isHover`、`isActive`、`radius`
- `loading={{ delay, icon }}`：延迟显示 loading 图标，期间不禁用、可点击
- 语义化 `classNames={{ icon }}` / `styles={{ icon }}`
- `forwardRef`：根元素根据 `href` 为 `HTMLAnchorElement` 或 `HTMLButtonElement`

### 实现与行为

- 删除 `usePressed` hook，按下态改用 CSS `:active`
- `<a>` 分支剔除 button-only 原生属性（`formAction`、`name`、`value`、`popoverTarget` 等）
- 禁用 / loading 时关闭波纹动画
- 与 antd 一致：`loading={{ delay }}` 只延迟图标显示，delay 期间按钮可点击；Button 不设置 `aria-busy`

### 文档与测试

- 更新 Storybook 文档与示例，包括 API 表格、Loading 链接、按钮组等 story
- 新增 `button-behavior.test.tsx` 覆盖 ref 转发、href 禁用、loading delay、内部状态保护、wave 行为
- 新增 `button-markup.test.tsx` SSR 标记测试
- 更新 `native-foundation.test.tsx` 中 loading 相关断言

## 验证

- `tsc -b` ✅
- 本分支涉及文件的 eslint / prettier ✅
- 浏览器测试 190/190 ✅
- SSR fixtures 16/16 ✅

## 变更集

已添加 `.changeset/button-figma-rework.md`（minor）。
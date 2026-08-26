# @yakit-libs/yakit-ui

Yakit 的 React 组件库。npm 包同时包含与组件版本一致的静态 Storybook，可在本地离线浏览。

## 安装

```bash
pnpm add @yakit-libs/yakit-ui react react-dom
```

仅使用图标时，推荐安装不带组件 peer dependencies 的独立包：

```bash
pnpm add @yakit-libs/yakit-ui-icons react
```

```tsx
import { HomeOutlined } from '@yakit-libs/yakit-ui-icons';
```

`@yakit-libs/yakit-ui/icons` 作为完整组件消费者的兼容入口保留；它仍属于
`@yakit-libs/yakit-ui` 包，安装时需要满足上面的 React peer dependencies。

图标默认渲染为 `span.anticon.yakit-icon > svg`。`className`、`style`、事件、ARIA 属性和 `ref<HTMLSpanElement>` 作用于外层 `span`，`size` 与受限的 `svgProps` 作用于内层 SVG；浏览器入口自动关联静态兼容样式，Node SSR 入口保持无 CSS。无法识别 package `browser` condition 的自定义构建环境可显式导入 `@yakit-libs/yakit-ui/icons/icon.css`。

多色、品牌、头像和状态类图标可从 `@yakit-libs/yakit-ui/icons/colorful` 导入。它们保留 Figma 定义的固定色、渐变和局部主题色；`color` 只会影响使用 `currentColor` 的图层。

带渐变、遮罩或裁剪的图标通过 React `useId()` 隔离 SVG fragment ID。一个页面存在多个独立 React root 时，每个 root 必须使用不同的 `identifierPrefix`；同一组 SSR 与 hydration 必须使用完全相同的 prefix。跨 root 重用 prefix 可能产生 DOM ID 冲突，`useId()` 本身不提供该跨 root 保证。

图标默认渲染为 `span.anticon.yakit-icon > svg`。`className`、`style`、事件、ARIA 属性和 `ref<HTMLSpanElement>` 作用于外层 `span`，`size` 与受限的 `svgProps` 作用于内层 SVG；浏览器入口自动关联静态兼容样式，Node SSR 入口保持无 CSS。无法识别 package `browser` condition 的自定义构建环境可显式导入 `@yakit-libs/yakit-ui/icons/icon.css`。

多色、品牌、头像和状态类图标可从 `@yakit-libs/yakit-ui/icons/colorful` 导入。它们保留 Figma 定义的固定色、渐变和局部主题色；`color` 只会影响使用 `currentColor` 的图层。

带渐变、遮罩或裁剪的图标通过 React `useId()` 隔离 SVG fragment ID。一个页面存在多个独立 React root 时，每个 root 必须使用不同的 `identifierPrefix`；同一组 SSR 与 hydration 必须使用完全相同的 prefix。跨 root 重用 prefix 可能产生 DOM ID 冲突，`useId()` 本身不提供该跨 root 保证。

## 使用组件和样式

```tsx
import { Button } from '@yakit-libs/yakit-ui';
import '@yakit-libs/yakit-ui/style.css';

export function Example() {
  return <Button>Run</Button>;
}
```

`style.css` 包含由 `@yakit-libs/color@1.4.1` 生成的 Main 主题 light/dark 变量；将根元素的 `data-theme` 设置为 `dark` 即可切换暗色变量。

## 浏览当前版本的 Storybook

```bash
pnpm exec yakit-ui-storybook
```

服务默认仅监听 `127.0.0.1:6006`。可通过参数调整：

```bash
pnpm exec yakit-ui-storybook --port 6100 --host 127.0.0.1 --open
```

使用 `--help` 查看所有参数。该命令只读取 npm 包内置的 `storybook-static`，不需要重新构建项目。

## 仓库开发

```bash
pnpm --filter @yakit-libs/yakit-ui build:package
pnpm --filter @yakit-libs/yakit-ui verify:package
pnpm --filter @yakit-libs/yakit-ui pack --dry-run
```

`prepack` 只验证已有产物，不会隐式重建。正式发布由仓库发布流水线处理。

## 许可证

本项目基于 [MIT License](./LICENSE) 发布。

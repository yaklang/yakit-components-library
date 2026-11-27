# @yakit-libs/yakit-ui

Yakit 的 React 组件库。离线 Storybook 随组件库的 GitHub Release 提供。

## 安装

```bash
pnpm add @yakit-libs/yakit-ui react react-dom
```

UI 组件使用的公共图标来自独立图标包 `@yakit-libs/yakit-ui-icons`。如果业务代码也需要使用这些图标，运行 `pnpm add @yakit-libs/yakit-ui-icons` 安装，然后从图标包按需导入。

图标的使用示例、样式和 API 见[独立图标包文档](https://github.com/yaklang/yakit-components-library/tree/main/packages/yakit-ui-icons#readme)。

## 使用组件和样式

```tsx
import { Button } from '@yakit-libs/yakit-ui'
import '@yakit-libs/yakit-ui/style.css'

export function Example() {
  return <Button>Run</Button>
}
```

`style.css` 包含由 `@yakit-libs/color@1.4.1` 生成的 Main 主题 light/dark 变量；将根元素的 `data-theme` 设置为 `dark` 即可切换暗色变量。

## 离线 Storybook

在对应的 [GitHub Release](https://github.com/yaklang/yakit-components-library/releases) 下载 `storybook-ui-<UI版本>-icons-<图标版本>.zip`，解压后运行：

```bash
node serve.mjs --open
```

默认地址是 `http://127.0.0.1:6006/`。运行 `node serve.mjs --help` 查看端口等选项。双包同批发布时，图标 Release 链接到 UI Release 的同一附件。

## 仓库开发

```bash
pnpm --filter @yakit-libs/yakit-ui build:package
pnpm --filter @yakit-libs/yakit-ui verify:package
pnpm --filter @yakit-libs/yakit-ui pack --dry-run
```

`prepack` 只验证已有产物，不会隐式重建。正式发布由仓库发布流水线处理。

## 许可证

本项目基于 [MIT License](./LICENSE) 发布。

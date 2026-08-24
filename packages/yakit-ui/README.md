# yakit-ui

Yakit 的 React 组件库。npm 包同时包含与组件版本一致的静态 Storybook，可在本地离线浏览。

## 安装

```bash
pnpm add yakit-ui antd react react-dom @ant-design/cssinjs
```

仅使用图标时，推荐安装不带组件 peer dependencies 的独立包：

```bash
pnpm add yakit-ui-icons react
```

```tsx
import { HomeOutlined } from 'yakit-ui-icons';
```

`yakit-ui/icons` 作为现有完整组件消费者的兼容入口保留；它仍属于 `yakit-ui` 包，安装时需要满足上面的完整组件 peer dependencies。

## 使用组件和样式

```tsx
import { Button } from 'yakit-ui';
import 'yakit-ui/style.css';

export function Example() {
  return <Button>Run</Button>;
}
```

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
pnpm --filter yakit-ui build:package
pnpm --filter yakit-ui verify:package
pnpm --filter yakit-ui pack --dry-run
```

`prepack` 只验证已有产物，不会隐式重建。正式发布由仓库发布流水线处理。

## 许可证

本项目基于 [MIT License](./LICENSE) 发布。

# @yakit-libs/yakit-ui-icons

Yakit UI 的 React-only 图标包。它不依赖 Ant Design、`@ant-design/cssinjs`、Emotion 或 ReactDOM。

## 安装

```bash
pnpm add @yakit-libs/yakit-ui-icons react
```

## 使用

```tsx
import { HomeSolid, HomeOutlined } from "@yakit-libs/yakit-ui-icons";

export const HomeEntry = () => (
  <button type="button">
    <HomeOutlined aria-hidden size={16} />
    <HomeSolid aria-label="首页" size={16} />
  </button>
);
```

也可以按图标家族导入：

```tsx
import { HomeOutlined } from "@yakit-libs/yakit-ui-icons/outline";
import { HomeSolid } from "@yakit-libs/yakit-ui-icons/solid";
```

完整注册表是显式的重入口，仅在图标浏览器等需要枚举所有图标的场景使用：

```tsx
import { iconRegistry } from "@yakit-libs/yakit-ui-icons/registry";
```

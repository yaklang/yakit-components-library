# @yakit-libs/yakit-ui-icons

Yakit UI 的 React 图标包。它不依赖 Ant Design、`@ant-design/cssinjs`、Emotion 或 ReactDOM，颜色 token 由运行时依赖 `@yakit-libs/color` 提供。

## 安装

```bash
pnpm add @yakit-libs/yakit-ui-icons @yakit-libs/color@1.4.1 react
```

`@yakit-libs/color@1.4.1` 通过 JavaScript 生成颜色变量，不再提供 `dist/index.css`。在应用的浏览器入口初始化主题：

```tsx
import { applyThemeColors, getColors } from "@yakit-libs/color/preview";

const theme = "light";
applyThemeColors(theme, getColors(theme));
```

这段初始化只能在浏览器生命周期执行；SSR 或静态主题可以在构建阶段使用 `@yakit-libs/color/css` 或 `yakit-color-css` 生成主题 CSS。图标包本身不会隐式操作 `document`，因此 Node SSR 与按图标摇树仍然可用。未初始化颜色变量时，默认色会回退到 Figma 的 `#353639`。

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

Outline 与 Solid 的主色默认使用 `var(--Colors-Use-Neutral-Text-1-Title, #353639)`。消费者仍可以通过 `color`、`style.color`、`color="inherit"` 或局部覆盖 CSS 变量改变颜色：

```tsx
<HomeOutlined color="#2f87ff" />
<HomeSolid style={{ color: "#10b981" }} />
<span
  style={{
    "--Colors-Use-Neutral-Text-1-Title": "#7b51f7",
  } as React.CSSProperties}
>
  <HomeOutlined />
</span>
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

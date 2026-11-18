# @yakit-libs/yakit-ui-icons

Yakit UI 的 React 图标包。它不依赖组件库或 CSS-in-JS 运行时，颜色 token 由运行时依赖 `@yakit-libs/color` 提供。

## 安装

在已有 React 的项目中安装图标包：

```bash
pnpm add @yakit-libs/yakit-ui-icons
```

本包支持 React `^18.2.0 || ^19.0.0`，应用需提供兼容版本的 React。
`@yakit-libs/color@1.4.1` 已声明为本包的运行时依赖，安装图标包时包管理器会自动安装它；仅使用图标组件时，无需额外执行 color 的安装命令。

### 初始化主题

安装 color 依赖不会自动向页面注入主题变量。如果应用已有对应的颜色变量，可以直接复用；否则需要初始化主题或加载预先生成的主题 CSS。

如果应用代码需要直接导入 `@yakit-libs/color/preview` 或 `@yakit-libs/color/css`，应把 color 声明为应用的直接依赖，避免依赖 pnpm 等包管理器对间接依赖的可见性：

```bash
pnpm add @yakit-libs/color@1.4.1
```

`@yakit-libs/color@1.4.1` 通过 JavaScript 生成颜色变量，不再提供 `dist/index.css`。在应用的浏览器入口初始化主题：

```tsx
import { applyThemeColors, getColors } from "@yakit-libs/color/preview";

const theme = "light";
applyThemeColors(theme, getColors(theme));
```

这段初始化只能在浏览器生命周期执行；SSR 或静态主题可以在构建阶段使用 `@yakit-libs/color/css` 或 `yakit-color-css` 生成主题 CSS。图标包本身不会隐式操作 `document`，因此 Node SSR 与按图标摇树仍然可用。未提供颜色变量时，图标使用各自声明的备用颜色；大多数 Outline 和 Solid 图标的默认主色回退为 `#353639`，多色图标保留各处的备用颜色。

## 使用

`@yakit-libs/yakit-ui-icons` 是 Yakit 图标的规范导入包。即使项目同时安装了
`@yakit-libs/yakit-ui`，新增代码也应优先使用本包，而不是兼容入口
`@yakit-libs/yakit-ui/icons*`。

本包与 `@yakit-libs/yakit-ui` 独立遵循 SemVer，版本号不要求相同；任一包单独发布不会强制另一个包升版。

```tsx
import { HomeSolid, HomeOutlined } from "@yakit-libs/yakit-ui-icons";

export const HomeEntry = () => (
  <button type="button">
    <HomeOutlined aria-hidden size={16} />
    <HomeSolid aria-label="首页" size={16} />
  </button>
);
```

所有默认图标都会渲染为与 Yakit 原 Ant Design 4.8 自定义图标兼容的结构：

```html
<span role="img" class="anticon yakit-icon consumer-class">
  <svg aria-hidden="true" focusable="false">...</svg>
</span>
```

`className`、`style`、事件、ARIA 属性和 `ref<HTMLSpanElement>` 属于外层 `span`；`size` 设置内层 SVG 的宽高。确需修改 SVG 表现属性时使用 `svgProps`，该入口不会接受内层事件、ARIA、焦点、ref 或内容注入。`color="currentColor"` 不产生内联颜色，可继续继承现有 Yakit/Ant 样式。

仅 Outline 在生成和审计时统一采用 `stroke-width="1.5"`（SVG 用户单位）。Solid、Colorful、Oldicon 保留素材线宽；Loading 的默认值由组件自身定义。宽度随图标尺寸与 `viewBox` 缩放，纯填充图形不增加描边。可调 Outline 和 Loading 的覆盖方式见下文。

### 调整描边宽度

具有实际描边的 Outline 图标（例如 `HomeOutlined`）和 `Loading` 支持通过 `svgProps` 调整线宽，默认值为 `1.5`：

```tsx
<HomeOutlined svgProps={{ strokeWidth: 2 }} />
<HomeOutlined svgProps={{ style: { strokeWidth: 1.5 } }} />
<Loading svgProps={{ strokeWidth: 0 }} />
```

优先级是 `svgProps.style.strokeWidth` → `svgProps.strokeWidth` → 图标原始默认值。`0` 会隐藏描边，混合图标中的填充细节仍然保留。支持合法 SVG 长度/百分比字符串；同元素 CSS 规则遵循正常层叠顺序。外层 `style` 仍属于 `span`，不提供顶层 `strokeWidth` 属性。

按最新 Figma 原稿同步后，`BugOutlined`、`AddPayloadOutlined`、`CurrencyDollarOutlined`、`TagOutlined`、`QrcodeOutlined`、`ClipboardCheckOutlined`、`SupportOutlined`、`PresentationChartLineOutlined`、`StatusOfflineOutlined`、`RocketOffOutlined`、`SpeechToTextOutlined`、`SpeechToText2Outlined` 使用固定填充轮廓，`strokeWidth` 不改变其粗细，也不会为它们补造描边。其他图标中，`svgProps.strokeWidth={0}` 只隐藏实际描边，填充部分仍然可见。范围与兼容性说明见[仓库中的线宽能力说明](https://github.com/yaklang/yakit-components-library/blob/main/packages/yakit-ui-icons/docs/icon-stroke-capabilities.md)。

`StarOffOutlined`、`RocketLaunchOffOutlined` 保留远端原稿的白色覆盖线，其在透明或深色背景上的效果与透明擦除蒙版不同。

Solid、Colorful、Oldicon 的 `svgProps.strokeWidth` 保持根 SVG 的原生属性透传，不会统一覆盖内部形状已声明的固定线宽。`BugOutlined` 与 `AddPayloadOutlined` 按最新原稿保留固定填充。

浏览器条件入口会自动关联静态 `icon.css`，根入口和 `/outline`、`/solid`、`/colorful` 多次导入时由打包器合并为一份样式；Node SSR 使用无 CSS 的通用入口，不会访问 DOM 或尝试加载 CSS 模块。无法识别 package `browser` condition 的自定义构建环境可显式导入 `@yakit-libs/yakit-ui-icons/icon.css`。

多色、品牌、头像和状态类图标同样从根入口导出。它们会保留 Figma 定义的固定色、渐变与局部主题色；注册表中的 `paintMode` 可用于区分 `literal`、`mixed` 和 `currentColor` 行为。

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
import * as ColorfulIcons from "@yakit-libs/yakit-ui-icons/colorful";
```

### 遗留图标兼容入口

仍在 Yakit 中使用、但无法用现有正式图标安全替换的旧 SVG 通过独立的 `oldicon`
兼容入口提供：

```tsx
import { PopoverArrowIcon } from "@yakit-libs/yakit-ui-icons/oldicon";
```

`/oldicon` 仍是兼容现有 Yakit 消费代码的 named-export 入口，但内部已经按图标拆成独立
ESM factory；静态导入一个图标时，打包器无需保留其他 oldicon。需要显式固定到单图标
公开路径（例如懒加载模块或手写依赖边界）时，也可以使用同名的 named export：

```tsx
import { PopoverArrowIcon } from "@yakit-libs/yakit-ui-icons/oldicon/PopoverArrowIcon";
```

单图标路径不提供 default export，也不允许通过 `/dist`、`/src` 或 SVG hash 深层导入。
浏览器条件入口会与其他图标入口一样关联 `icon.css`；Node/SSR 的 import 条件保持 CSS-free。
`TaskWaitIcon` 是产品侧 DOM 动画而不是 SVG，不属于此兼容图标集合。

`oldicon` 保留旧实现的路径几何、颜色、`viewBox` 和固有尺寸，仅用于迁移既有消费者。
Oldicon 以 `src/oldicon/assets/` 为准，保留现有文件名、线宽、公开导出和深层路径。素材、单图标组件和入口手工维护，不登记来源，也不参加生成流程。
它不是第四个正式图标家族，不会进入根入口或 `iconRegistry`；新功能应优先选择
`/outline`、`/solid` 或 `/colorful`。同名但图形不同的旧实现会使用来源限定的导出名，
迁移时应按生成清单中的源文件映射选择，不能仅凭名称互换。

完整注册表是显式的重入口，仅在图标浏览器等需要枚举所有图标的场景使用：

```tsx
import { iconRegistry } from "@yakit-libs/yakit-ui-icons/registry";
```

### 编辑器自动导入

TypeScript/VS Code 可能为同一个图标发现多个公开候选；候选顺序由编辑器决定，npm 包不能从包元数据层面
强制排序。应选择 `@yakit-libs/yakit-ui-icons`、上文列出的家族入口或
`@yakit-libs/yakit-ui-icons/oldicon/<IconName>`，并拒绝包含 `/dist/`、`/src/` 的深层导入。

如果自动导入没有扫描 `package.json` 依赖，可以在 VS Code 工作区设置中显式开启：

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

这些是消费者编辑器偏好，不会随 npm 包安装自动生效。仓库使用真实 tsserver 协议覆盖 TypeScript
5.8.3/5.9.2、TS/TSX、`Bundler`/`NodeNext` 以及单包/双包安装组合；可运行：

```bash
pnpm run test:auto-import
```

#### English note

Use `@yakit-libs/yakit-ui-icons` as the canonical package for new icon imports. The
`@yakit-libs/yakit-ui/icons*` paths are compatibility-only. Both packages follow SemVer
independently, so their versions do not need to match. Auto-import ordering is editor-controlled;
the package exposes public module specifiers but does not install or enforce editor-private
configuration.

带渐变、遮罩或裁剪的图标通过 React `useId()` 隔离 SVG fragment ID。一个页面存在多个独立 React root 时，每个 root 必须使用不同的 `identifierPrefix`；同一组 SSR 与 hydration 必须使用完全相同的 prefix。跨 root 重用 prefix 可能产生 DOM ID 冲突，`useId()` 本身不提供该跨 root 保证。

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

`@yakit-libs/yakit-ui-icons` 是图标的规范导入包。`@yakit-libs/yakit-ui/icons`、
`@yakit-libs/yakit-ui/icons/outline`、`@yakit-libs/yakit-ui/icons/solid`、
`@yakit-libs/yakit-ui/icons/colorful` 和 `@yakit-libs/yakit-ui/icons/registry` 仅作为完整组件消费者的
兼容入口保留；它们仍属于 `@yakit-libs/yakit-ui` 包，安装时需要满足上面的 React peer dependencies。
新增代码请直接从独立图标包导入。

两个 npm 包独立遵循 SemVer，版本号不要求相同，也不会仅因其中一个包发布就强制另一个包升版。
兼容入口随 `@yakit-libs/yakit-ui` 自身版本发布，不代表独立图标包的版本。

### 编辑器自动导入

同时安装两个包时，TypeScript 可能发现多个公开入口。包元数据能够声明可用入口，但不能强制 VS Code
把某个候选排在首位；请将 `@yakit-libs/yakit-ui-icons` 视为规范结果，不要接受包含 `/dist/` 或 `/src/`
的深层路径。按家族和注册表手写导入时分别使用 `@yakit-libs/yakit-ui-icons/outline`、
`@yakit-libs/yakit-ui-icons/solid`、`@yakit-libs/yakit-ui-icons/colorful` 和
`@yakit-libs/yakit-ui-icons/registry`。

如果 VS Code 未扫描 `package.json` 中的依赖，可以在工作区设置中显式开启扫描；这是消费者编辑器设置，
组件包无法替消费者强制开启：

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

#### English note

Use `@yakit-libs/yakit-ui-icons` as the canonical source for new icon imports. The
`@yakit-libs/yakit-ui/icons*` paths are compatibility entries. The two npm packages follow SemVer
independently and do not need matching versions. VS Code preferences are consumer settings; this
package cannot enforce candidate ordering or install editor-private configuration.

图标默认渲染为 `span.anticon.yakit-icon > svg`。`className`、`style`、事件、ARIA 属性和 `ref<HTMLSpanElement>` 作用于外层 `span`，`size` 与受限的 `svgProps` 作用于内层 SVG；浏览器入口自动关联静态兼容样式，Node SSR 入口保持无 CSS。无法识别 package `browser` condition 的自定义构建环境可显式导入 `@yakit-libs/yakit-ui/icons/icon.css`。

### 调整描边宽度

350 个 Outline 图标（包括 `BugOutlined`、`QrcodeOutlined`）和 `Loading` 支持通过 `svgProps` 调整实际线宽，默认值仍为 `1`：

```tsx
<BugOutlined svgProps={{ strokeWidth: 2 }} />
<HomeOutlined svgProps={{ style: { strokeWidth: 1.5 } }} />
<Loading svgProps={{ strokeWidth: 0 }} />
```

优先级是 `svgProps.style.strokeWidth` → `svgProps.strokeWidth` → 图标原始默认值。`0` 会隐藏描边，混合图标中的填充细节仍然保留。支持合法 SVG 长度/百分比字符串；同元素 CSS 规则遵循正常层叠顺序。外层 `style` 仍属于 `span`，不提供顶层 `strokeWidth` 属性。

原先展开为填充的二维码、标签、剪贴板、信号、火箭及语音图标已恢复为真实描边，默认线宽为 `1`。`TagOutlined` 的实心圆、火箭舷窗和其他独立填充细节保持实心，不随 `strokeWidth` 改变。`svgProps.strokeWidth={0}` 只隐藏线条。几何迁移的范围与兼容性说明见[线宽能力说明](https://github.com/yaklang/yakit-components-library/blob/main/packages/yakit-ui-icons/docs/icon-stroke-capabilities.md)。

Solid、Colorful、Oldicon 保持根 SVG 的原生属性透传；没有统一覆盖其内部固定宽度。`BugOutlined` 已从填充轮廓重建为真实描边，默认视觉改为与其他描边 Outline 一致的宽度 `1`。

图标的内置描边统一为 `stroke-width="1"`，包括 Outline、Solid、Colorful、Loading 和独立图标包的 Oldicon。`1` 是 SVG 用户单位，会随 `size` / `viewBox` 缩放；纯填充图形不新增描边。Solid、Colorful、Oldicon 的根 SVG 属性保持原生继承行为。

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

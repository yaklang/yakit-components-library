# 图标描边与视觉粗细

Outline 中实际存在的描边默认使用 1.5 SVG 单位，支持 `svgProps.strokeWidth` 和 `svgProps.style.strokeWidth`。style 优先于属性，未传值时使用默认值；0 隐藏实际描边。24×24 的 Outline 在 size=24 时，1.5 单位对应 1.5 CSS 像素；其他尺寸按比例缩放。Loading 继续由组件定义默认描边。

```tsx
<HomeOutlined />
<HomeOutlined svgProps={{ strokeWidth: 2 }} />
<HomeOutlined svgProps={{ strokeWidth: 2, style: { strokeWidth: 1 } }} />
```

## 最新 Figma 原稿同步

用户要求以远端代码为准后，以下 10 个 Outline 保留原稿的填充轮廓，登记为 `fixed-fill`。它们没有实际描边，`strokeWidth` 无法改变其粗细，传入 0 也不会隐藏填充。

| 固定填充图标 |
| --- |
| CurrencyDollarOutlined |
| TagOutlined |
| QrcodeOutlined |
| ClipboardCheckOutlined |
| SupportOutlined |
| PresentationChartLineOutlined |
| StatusOfflineOutlined |
| RocketOffOutlined |
| SpeechToTextOutlined |
| SpeechToText2Outlined |

`RocketLaunchOffOutlined`、`DataComparisonOutlined` 包含填充与描边，只有描边部分受线宽参数影响。`StarOffOutlined`、`RocketLaunchOffOutlined` 使用远端的白色覆盖线，在深色或透明背景上会保留该白色，不再替换为本地透明擦除蒙版。

本轮明确排除的 `BugOutlined`、`AddPayloadOutlined` 保留原有真实描边重建。`PillSolid` 保留原有多色处理。公开名称和导入路径不变。

## 颜色与分类规则

前景主色映射为 `currentColor`，已有默认颜色由组件提供。独立填充、蒙版与裁剪中有语义的颜色保留；透明度遵循原稿。Solid、Colorful、Oldicon 保留素材原有描边宽度，不套用 Outline 的 1.5 规则。它们的 `svgProps.strokeWidth` 是根 SVG 原生属性透传，不统一覆盖内部已声明的宽度。

## 校验和历史证据

当前图标对照当前 Figma 原始 SVG 检查标签、路径、颜色语义和线宽契约。旧描边重建的审核、图片和度量仍是历史证据，不能作为新原稿的当前审核结论。

被本轮同步替代的 12 个历史审核候选源码保存在图标包 `test/fixtures/icons/reference/visual-weight-v2/source-before-native-sync/`；这些是同步前的原始字节，并已按原有审核哈希核验，没有重新生成或重拍历史基线。历史几何测试使用这些候选，当前图标由原稿一致性、固定填充及运行时测试覆盖。

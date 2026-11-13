# 图标描边与视觉粗细

Outline 中实际存在的描边默认使用 1.5 SVG 单位，支持 `svgProps.strokeWidth` 和 `svgProps.style.strokeWidth`。style 优先于属性，未传值时使用默认值；0 隐藏实际描边。24×24 的 Outline 在 size=24 时，1.5 单位对应 1.5 CSS 像素；其他尺寸按比例缩放。Loading 继续由组件定义默认描边。

```tsx
<HomeOutlined />
<HomeOutlined svgProps={{ strokeWidth: 2 }} />
<HomeOutlined svgProps={{ strokeWidth: 2, style: { strokeWidth: 1 } }} />
```

## 最新 Figma 原稿同步

用户要求以远端代码为准后，以下 12 个 Outline 保留原稿的填充轮廓，登记为 `fixed-fill`。它们没有实际描边，`strokeWidth` 无法改变其粗细，传入 0 也不会隐藏填充。

| 固定填充图标                  |
| ----------------------------- |
| BugOutlined                   |
| AddPayloadOutlined            |
| CurrencyDollarOutlined        |
| TagOutlined                   |
| QrcodeOutlined                |
| ClipboardCheckOutlined        |
| SupportOutlined               |
| PresentationChartLineOutlined |
| StatusOfflineOutlined         |
| RocketOffOutlined             |
| SpeechToTextOutlined          |
| SpeechToText2Outlined         |

`RocketLaunchOffOutlined`、`DataComparisonOutlined` 包含填充与描边，只有描边部分受线宽参数影响。`StarOffOutlined`、`RocketLaunchOffOutlined` 使用远端的白色覆盖线，在深色或透明背景上会保留该白色，不再替换为本地透明擦除蒙版。

2026-11-11 重新获取指定的六个节点后，`BugOutlined`、`AddPayloadOutlined` 同步为原稿填充路径；`ImportSolid` 不再使用黑白蒙版，`PillSolid` 改为主色填充配合 0.5 透明度。PaperAirplaneSolid、PaintbrushSolid 原稿未变，仍保留裁剪定义。公开名称和导入路径不变。

## 颜色与分类规则

前景主色映射为 `currentColor`，已有默认颜色由组件提供。独立填充、蒙版与裁剪中有语义的颜色保留；透明度遵循原稿。Solid、Colorful、Oldicon 保留素材原有描边宽度，不套用 Outline 的 1.5 规则。它们的 `svgProps.strokeWidth` 是根 SVG 原生属性透传，不统一覆盖内部已声明的宽度。

## 校验和历史证据

当前图标对照当前 Figma 原始 SVG 检查标签、路径、颜色语义和线宽契约。旧描边重建的审核、图片和度量仍是历史证据，不能作为新原稿的当前审核结论。

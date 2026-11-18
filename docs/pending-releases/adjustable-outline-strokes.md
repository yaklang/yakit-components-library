---
'@yakit-libs/yakit-ui': patch
---

为具备可调整描边能力的 Outline 图标和 Loading 提供 `svgProps.strokeWidth` 与 `svgProps.style.strokeWidth` 参数，支持将实际描边宽度设为 0。Outline 的默认真实描边为 1.5，能力由当前原稿及生成结果确定；纯填充图标不补造描边，也不承诺通过描边参数改变填充轮廓的粗细。Storybook 展示当前图标及参数效果。

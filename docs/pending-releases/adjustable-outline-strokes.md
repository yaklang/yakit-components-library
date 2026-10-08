---
'@yakit-libs/yakit-ui': patch
---

修复 BugOutlined 的填充式轮廓，改为默认宽度 1.5 的真实描边。350 个 Outline 图标和 Loading 支持通过 svgProps.strokeWidth 或 svgProps.style.strokeWidth 调整实际路径宽度（包括 0）；修复 Qrcode、RocketOff、SpeechToText 等 13 项遗留粗线轮廓，保留独立实心细节及其他图标家族的原有语义，并增加 Storybook 修复前后对照。

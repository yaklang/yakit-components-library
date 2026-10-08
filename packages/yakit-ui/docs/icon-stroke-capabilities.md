# 图标描边与视觉粗细

350 个 Outline 图标与 Loading 的默认描边为 1.5 SVG 单位，支持 `svgProps.strokeWidth` 和 `svgProps.style.strokeWidth`。style 优先于属性，未传值时使用默认值；0 会隐藏描边。24×24 的 Outline 在 size=24 时，1.5 单位对应 1.5 CSS 像素；其他尺寸按比例缩放。

```tsx
<QrcodeOutlined />
<QrcodeOutlined svgProps={{ strokeWidth: 1.5 }} />
<QrcodeOutlined svgProps={{ strokeWidth: 2, style: { strokeWidth: 1 } }} />
```

## 本次默认视觉修复

以前部分 Outline 的线条被展开成填充轮廓；它们没有真正的 stroke，调整 stroke-width 无法改变粗细。这不代表它们是必须固定的实心图形。以下13项恢复了真实中心线，默认视觉与Home/Bug 的 1.5 单位描边对齐：

| 图标                               | 修复范围                     |
| ---------------------------------- | ---------------------------- |
| QrcodeOutlined                     | 定位框、折线、短线圆端       |
| CurrencyDollarOutlined             | 圆框与货币符号               |
| TagOutlined                        | 标签外轮廓；独立圆点保持实心 |
| ClipboardCheckOutlined             | 夹板与勾线                   |
| SupportOutlined                    | 圆环及连接线                 |
| PresentationChartLineOutlined      | 展示框、图表与支架           |
| StatusOfflineOutlined              | 信号弧、中心符号与斜线       |
| RocketOffOutlined                  | 火箭轮廓与斜线；舷窗保持实心 |
| AddPayloadOutlined                 | 文件轮廓与加号               |
| SpeechToTextOutlined               | 信号线与字母线条             |
| SpeechToText2Outlined              | 麦克风、文本框与符号线条     |
| RocketLaunchOffOutlined            | 原先填充的火箭与助推器轮廓   |
| DataComparisonOutlined（数据对比） | 右侧浅色外框，保留双色       |

Qrcode 等原宽为2的纯展开描边图标可使用宽度2近似恢复旧线重；RocketOff原结构宽约1.8，RocketLaunchOff和数据对比原有混合宽度，单一参数不承诺精确恢复所有旧像素。旧Figma源和修复前图形保留为历史证据，默认外观的有意改变有逐图复核目标。

## 线条与填充的边界

问号、聊天省略点、服务器状态点、Tag圆点、火箭舷窗以及MCP/AI的独立字形仍保持填充语义。它们不应被变成空心，也不受线宽参数统一缩放。width=0时这类细节仍可能可见。遮挡使用透明mask/clip，不通过背景色涂白伪造孔洞。

Solid 255项、Colorful 296项与oldicon 380个导出保持各自风格和原生属性语义，没有套用Outline中心线迁移。oldicon中的Outline命名不能自动推出它支持同一套描边契约。

## 可见验证与防回归

Storybook的「线条粗细对照」展示13项修复前/当前图形，提供16/24/32px、浅深背景和0..3线宽；Home/Bug及填充细节作为参照。全量Outline目录继续保留。

新增图标必须分别审查线条、独立填充、字形与遮挡；不能只检查stroke-width 是否为 1.5。逐图证据保存在 `test/fixtures/icons/reference/visual-weight-v2/`：旧源、几何测量、独立复核和精确新视觉目标绑定到源码SHA。未批准图标仍走不可变旧基线，不通过整库重拍消除差异。

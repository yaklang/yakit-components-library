import type { Meta, StoryObj } from '@storybook/react'
import { CollapseText, ConfigProvider } from '@yakit-libs/yakit-ui'
import type { CSSProperties } from 'react'

const colStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  maxWidth: 480,
}

const labelStyle: CSSProperties = {
  color: '#888',
  fontSize: 12,
  marginBottom: 8,
}

const LONG_TEXT =
  '这段说明足够长，在默认 3 行、行高 16px、字号 12px 时会被折叠。展开后可以看到完整内容，再点一次即可收起。适合插件描述、漏洞详情和较长的纯文本备注。折叠阈值按「行数 × 行高」计算，容器变窄导致换行增加时，也会重新判断是否显示展开按钮。下面再补充几句，确保在常见预览宽度下一定会超出三行：可以用来展示扫描结果摘要、规则命中说明，或把一整段操作指引先收起来，避免详情面板被长文本撑得过高。如果仍觉得短，还可以继续往下看，直到展开按钮出现。'

const MULTILINE_TEXT = [
  '第一行：任务名称 PluginAudit',
  '第二行：目标主机 192.168.1.23',
  '第三行：扫描端口 80,443,8080,8443',
  '第四行：命中规则 sql-injection,xss-reflected',
  '第五行：建议先核对请求包再出报告',
].join('\n')

const COMPONENT_DOCS = [
  '可展开、收起的纯文本段落。内容超出折叠行数时才出现操作按钮；高度按「行数 × 行高」计算，并用真实内容高度判断是否溢出。',
  '',
  '## 何时使用',
  '',
  '- 描述、备注、日志摘要等纯文本可能很长，默认只展示前几行。',
  '- 从 yakit 的 `YakitCollapseText` 迁移时，行数、行高、字号和根节点类名都可以直接对接。',
  '',
  '行为对齐 yakit `YakitCollapseText`：默认 3 行、行高 16px、字号 12px，内容使用 `pre-wrap` 保留换行。文案默认是「展开 / 收起」，可通过 ConfigProvider 的 `locale.CollapseText` 覆盖。',
  '',
  '## 要点',
  '',
  '- 只适合纯文字。`content` 是字符串，换行会被保留。',
  '- 是否显示按钮按真实 `scrollHeight` 与折叠最大高度比较，不依赖写死的字符数。容器宽度变化时会重新测量。',
  '- 展开后仍然按折叠高度判断溢出，避免展开后把按钮误藏起来。内容变短不再溢出时，按钮会消失并回到收起态。',
  '- 操作按钮是原生 `button`，带 `aria-expanded` 和 `aria-controls`。`title` 为完整内容，便于折叠时查看全文。',
  '- `wrapperClassName` 是兼容 yakit 的根节点类名，与 `className` / `rootClassName` 一并加在根节点上。',
  '- `rows`、`lineHeight`、`fontSize` 若传入 0 或负数，会回退到默认值。',
  '',
  '## 代码演示',
  '',
  '下方按「总览（Controls）→ 短文本 → 自定义行数 → 字号与行高 → 多行文本 → 文案语言」组织示例。',
  '',
  '## API',
  '',
  '### CollapseText',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| content | 内容，只适合纯文字 | `string` | - |',
  '| rows | 折叠时展示的行数 | `number` | `3` |',
  '| lineHeight | 内容单行行高，单位 px | `number` | `16` |',
  '| fontSize | 文字大小，单位 px | `number` | `12` |',
  '| wrapperClassName | 兼容 yakit 的根节点类名，与 className / rootClassName 一并加在根节点上 | `string` | - |',
  '| className / rootClassName | 加在根节点上 | `string` | - |',
  '| style | 根节点样式 | `CSSProperties` | - |',
  '',
  'Ref 转发到根 `div`。公开名称是 `CollapseText`，不是 yakit 里的 `YakitCollapseText`，与 Button、Tag、Spin 的导出方式一致。',
  '',
  '展开 / 收起文案通过 ConfigProvider `locale.CollapseText.expand` / `collapse` 配置，默认「展开」「收起」。',
  '',
  '### 标记类（公共 API）',
  '',
  '以下类名属于公共契约，供消费方覆盖样式或测试定位：`yakit-collapse-text`、`yakit-collapse-text-content`、`yakit-collapse-text-action`。',
].join('\n')

const meta: Meta<typeof CollapseText> = {
  title: 'YakitUi/通用/CollapseText',
  component: CollapseText,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: COMPONENT_DOCS,
      },
    },
  },
  argTypes: {
    content: {
      description: '内容。只适合纯文字。',
      control: 'text',
    },
    rows: {
      description: '折叠时展示的行数。',
      table: { defaultValue: { summary: '3' } },
      control: { type: 'number', min: 1 },
    },
    lineHeight: {
      description: '内容单行行高，单位 px。',
      table: { defaultValue: { summary: '16' } },
      control: { type: 'number', min: 1 },
    },
    fontSize: {
      description: '文字大小，单位 px。',
      table: { defaultValue: { summary: '12' } },
      control: { type: 'number', min: 1 },
    },
    wrapperClassName: {
      description: '兼容 yakit 的根节点类名，与 className / rootClassName 一并加在根节点上。',
      control: 'text',
    },
    className: {
      description: '自定义类名，加在根节点上。',
      control: 'text',
    },
  },
} satisfies Meta<typeof CollapseText>

export default meta
type Story = StoryObj<typeof meta>

/** 总览：绑定 Controls 的可调示例 */
export const Default: Story = {
  name: '总览',
  parameters: {
    docs: {
      description: {
        story: '默认折叠为 3 行。可在下方 Controls 里改行数、行高、字号和文案。',
      },
    },
  },
  args: {
    content: LONG_TEXT,
    rows: 3,
    lineHeight: 16,
    fontSize: 12,
  },
  render: (args) => (
    <div style={{ maxWidth: 480 }}>
      <CollapseText content={LONG_TEXT} {...args} />
    </div>
  ),
}

/** 短文本 */
export const ShortText: Story = {
  name: '短文本',
  parameters: {
    docs: {
      description: {
        story: '内容不超过折叠行数时，不显示展开按钮。',
      },
    },
  },
  args: {
    content: '端口开放，服务类型为 nginx。',
  },
}

/** 自定义行数 */
export const CustomRows: Story = {
  name: '自定义行数',
  parameters: {
    docs: {
      description: {
        story: '把 `rows` 设为 1 或 5，折叠阈值会跟着变。',
      },
    },
  },
  render: () => (
    <div style={colStyle}>
      <div>
        <div style={labelStyle}>rows = 1</div>
        <CollapseText content={LONG_TEXT} rows={1} />
      </div>
      <div>
        <div style={labelStyle}>rows = 5</div>
        <CollapseText content={LONG_TEXT} rows={5} />
      </div>
    </div>
  ),
}

/** 字号与行高 */
export const Typography: Story = {
  name: '字号与行高',
  parameters: {
    docs: {
      description: {
        story: '折叠高度按「行数 × 行高」计算。加大字号或行高后，同样的行数会占更高的空间。',
      },
    },
  },
  args: {
    content: LONG_TEXT,
    rows: 3,
    fontSize: 14,
    lineHeight: 22,
  },
  render: (args) => (
    <div style={{ maxWidth: 480 }}>
      <CollapseText content={LONG_TEXT} {...args} />
    </div>
  ),
}

/** 多行文本 */
export const Multiline: Story = {
  name: '多行文本',
  parameters: {
    docs: {
      description: {
        story: '内容使用 `pre-wrap`，会保留换行。下面这段默认只能看到前 3 行。',
      },
    },
  },
  args: {
    content: MULTILINE_TEXT,
    rows: 3,
  },
}

/** 文案语言 */
export const Locale: Story = {
  name: '文案语言',
  parameters: {
    docs: {
      description: {
        story: '通过 ConfigProvider 的 `locale.CollapseText` 把按钮改成 Expand / Collapse。',
      },
    },
  },
  render: () => (
    <ConfigProvider
      locale={{
        locale: 'en-US',
        CollapseText: { expand: 'Expand', collapse: 'Collapse' },
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <CollapseText content={LONG_TEXT} />
      </div>
    </ConfigProvider>
  ),
}

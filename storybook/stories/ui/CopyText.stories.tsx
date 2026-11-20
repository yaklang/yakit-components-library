import type { Meta, StoryObj } from '@storybook/react'
import { ConfigProvider, CopyText, type CopyTextProps } from '@yakit-libs/yakit-ui'
import { useState, type CSSProperties } from 'react'

const colStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 16,
  maxWidth: 560,
}

const rowStyle: CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 16,
}

const labelStyle: CSSProperties = {
  color: '#888',
  fontSize: 12,
  minWidth: 88,
}

const COMPONENT_DOCS = [
  '在展示文字旁提供一键复制。复制控件复用已有的 `TagCopy`，成功或失败都只做图标反馈；业务提示请用 `onAfterCopy`。',
  '',
  '## 何时使用',
  '',
  '- 表格、描述列表或说明文案里，需要把展示文本（或另一段实际命令）写入剪贴板。',
  '- 从 yakit 的 `YakitCopyText` 迁移时，把原来的展示/复制分离、图标色和根节点样式接到这里。',
  '',
  '行为对齐 yakit `YakitCopyText`：`showText` 负责展示，`copyText` 为空时回退为 `showText`，图标默认主色。复制能力本身走本库 `TagCopy`，不引入 antd Typography，也不弹出全局「复制成功」提示。',
  '',
  '## 要点',
  '',
  '- `copyText` 不传或传空字符串时，复制的是 `showText`。',
  '- `onAfterCopy` 在写入完成（成功或失败）后触发，第二个参数带 `{ text, ok }`。yakit 是点击时立即触发且不返回结果。',
  '- 组件不内置 toast；需要提示时在 `onAfterCopy` 里自行处理。',
  '- `iconColor` 可传任意 CSS 颜色；不传时与独立 `TagCopy` 一样使用主色。',
  '- `wrapStyle` 是兼容 yakit 的根节点样式，与 `style` 合并，`style` 优先。`className` / `rootClassName` 都加在根节点上。',
  '- `disabled` 会禁用复制按钮，也可由 ConfigProvider 的 `componentDisabled` 继承。',
  '- `size` 对齐 `TagCopy` 的 `small` / `medium` / `large`。不传时图标为 16px，与 yakit YakitCopyText 一致。',
  '',
  '## 代码演示',
  '',
  '下方按「总览（Controls）→ 展示与复制分离 → 图标颜色 → 禁用 → 尺寸 → 长文本 → 复制结果」组织示例。',
  '',
  '## API',
  '',
  '### CopyText',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| showText | 展示的文字 | `string` | - |',
  '| copyText | 写入剪贴板的文字。不传或为空时回退为 `showText` | `string` | `showText` |',
  '| onAfterCopy | 复制尝试结束后的回调。`info.ok` 表示是否写入成功 | `(e, info: { text: string; ok: boolean }) => void` | - |',
  '| iconColor | 复制图标颜色，可传任意 CSS 色值 | `string` | 主色 |',
  '| wrapStyle | 兼容 yakit 的根节点样式，与 `style` 合并，`style` 优先 | `CSSProperties` | - |',
  '| disabled | 禁用复制。也可由 ConfigProvider `componentDisabled` 继承 | `boolean` | `false` |',
  '| size | 复制图标尺寸，对齐 TagCopy | `small` \\| `medium` \\| `large` | 16px（对齐 yakit） |',
  '| className / rootClassName | 加在根节点上 | `string` | - |',
  '| style | 根节点样式 | `CSSProperties` | - |',
  '',
  'Ref 转发到根 `div`。公开名称是 `CopyText`，不是 yakit 里的 `YakitCopyText`，与 Button、Tag、Spin 的导出方式一致。',
  '',
  '### 标记类（公共 API）',
  '',
  '以下类名属于公共契约，供消费方覆盖样式或测试定位：`yakit-copy-text`、`yakit-copy-text-content`。复制按钮仍使用 `TagCopy` 的 `yakit-tag-copy`。',
].join('\n')

const meta: Meta<typeof CopyText> = {
  title: 'YakitUi/通用/CopyText',
  component: CopyText,
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
    showText: {
      description: '展示的文字',
      control: 'text',
    },
    copyText: {
      description: '写入剪贴板的文字。不传或为空时回退为 showText。',
      control: 'text',
    },
    iconColor: {
      description: '复制图标颜色，可传任意 CSS 色值。不传时使用主色。',
      control: 'color',
    },
    disabled: {
      description: '禁用复制。也可由 ConfigProvider componentDisabled 继承。',
      control: { type: 'boolean' },
    },
    size: {
      description: '复制图标尺寸，对齐 TagCopy。不传时为 16px，与 yakit YakitCopyText 一致。',
      table: { defaultValue: { summary: '16px（对齐 yakit）' } },
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    className: {
      description: '自定义类名，加在根节点上。',
      control: 'text',
    },
  },
} satisfies Meta<typeof CopyText>

export default meta
type Story = StoryObj<typeof meta>

/** 总览：绑定 Controls 的可调示例 */
export const Default: Story = {
  name: '总览',
  parameters: {
    docs: {
      description: {
        story: '最常见的用法：展示文本与复制内容相同。可在下方 Controls 里改文案、图标色和尺寸。',
      },
    },
  },
  args: {
    showText: '127.0.0.1:8080',
  },
}

/** 展示与复制分离 */
export const DistinctCopyText: Story = {
  name: '展示与复制分离',
  parameters: {
    docs: {
      description: {
        story: '界面上显示简化文案，真正写入剪贴板的是完整命令。这是 yakit 里 `copyText` 与 `showText` 分离的用法。',
      },
    },
  },
  render: (args) => (
    <CopyText {...args} showText="yak bridge --secret [your-pass]" copyText="yak bridge --secret demo-pass" />
  ),
}

/** 图标颜色 */
export const IconColor: Story = {
  name: '图标颜色',
  parameters: {
    docs: {
      description: {
        story: '不传 `iconColor` 时使用主色；也可以传入任意 CSS 颜色。',
      },
    },
  },
  render: () => (
    <div style={colStyle}>
      <div style={rowStyle}>
        <span style={labelStyle}>默认主色</span>
        <CopyText showText="payload-id-001" />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>自定义色</span>
        <CopyText showText="payload-id-002" iconColor="#d48806" />
      </div>
    </div>
  ),
}

/** 禁用 */
export const Disabled: Story = {
  name: '禁用',
  parameters: {
    docs: {
      description: {
        story: '传入 `disabled`，或由 ConfigProvider 的 `componentDisabled` 继承，复制按钮不可用。',
      },
    },
  },
  render: () => (
    <div style={colStyle}>
      <div style={rowStyle}>
        <span style={labelStyle}>disabled</span>
        <CopyText showText="disabled-item" disabled />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>全局禁用</span>
        <ConfigProvider componentDisabled>
          <CopyText showText="provider-disabled" />
        </ConfigProvider>
      </div>
    </div>
  ),
}

/** 尺寸 */
export const Sizes: Story = {
  name: '尺寸',
  parameters: {
    docs: {
      description: {
        story: '复制图标尺寸可对齐 TagCopy 的 small / medium / large。不传 size 时是 16px，与 yakit 一致。',
      },
    },
  },
  render: () => (
    <div style={colStyle}>
      <div style={rowStyle}>
        <span style={labelStyle}>默认</span>
        <CopyText showText="default-size" />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>small</span>
        <CopyText showText="small-size" size="small" />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>medium</span>
        <CopyText showText="medium-size" size="medium" />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>large</span>
        <CopyText showText="large-size" size="large" />
      </div>
    </div>
  ),
}

/** 长文本 */
export const LongText: Story = {
  name: '长文本',
  parameters: {
    docs: {
      description: {
        story: '展示文本可以很长；复制按钮始终跟在文字后面，根节点是行内弹性布局。',
      },
    },
  },
  args: {
    showText: 'https://127.0.0.1:8083/static/console?token=demo-token-abcdefghijklmnopqrstuvwxyz#/projects',
  },
}

const CopyFeedbackDemo = (props: Partial<CopyTextProps>) => {
  const [message, setMessage] = useState('点击复制图标，这里会显示最近一次结果。')
  return (
    <div style={colStyle}>
      <CopyText
        {...props}
        showText={props.showText ?? 'copied-payload'}
        onAfterCopy={(_e, info) => {
          setMessage(info.ok ? `已复制：${info.text}` : '复制失败，请检查浏览器剪贴板权限。')
        }}
      />
      <div style={{ color: 'var(--Colors-Use-Neutral-Text-3-Secondary)', fontSize: 12 }}>{message}</div>
    </div>
  )
}

/** 复制结果 */
export const CopyFeedback: Story = {
  name: '复制结果',
  parameters: {
    docs: {
      description: {
        story:
          '组件本身不弹全局提示。需要成功/失败反馈时，在 `onAfterCopy` 里根据 `info.ok` 自行展示。下面的示例把最近一次结果写在组件下方。若浏览器拦截剪贴板，会走到失败分支。',
      },
    },
  },
  render: (args) => <CopyFeedbackDemo {...args} />,
}

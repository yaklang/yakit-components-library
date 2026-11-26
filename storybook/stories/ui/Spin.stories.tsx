import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '@yakit-libs/yakit-ui'
import { Spin } from '@yakit-libs/yakit-ui'
import type { SpinProps } from '@yakit-libs/yakit-ui'
import { LoadingOutlined } from '@yakit-libs/yakit-ui-icons'
import { useRef, type CSSProperties, type ReactNode } from 'react'

const panelStyle: CSSProperties = {
  minHeight: 180,
  padding: 16,
  border: '1px solid var(--Colors-Use-Neutral-Border)',
  borderRadius: 8,
  background: 'var(--Colors-Use-Basic-Background)',
}

const Panel = ({ children }: { children?: ReactNode }) => <div style={panelStyle}>{children}</div>

const COMPONENT_DOCS = [
  '用于反馈加载状态的指示器。可以单独放在行内，也可以包住一块内容，或把遮罩挂到指定容器上。',
  '',
  '## 何时使用',
  '',
  '- 页面、面板、表格等区域正在加载，需要挡住内容或先占一块位置。',
  '- 行内等待，比如按钮或文字旁边一个小转圈。',
  '- 需要把遮罩挂到指定容器，而不把内容包进 Spin。',
  '',
  '行为对齐 antd `Spin` 的常见用法，但只保留本库需要的 API：尺寸为 `small`、`medium`、`large`，提示只用 `tip`，没有 `description`、`percent`、`fullscreen`、`wrapperClassName` 和 `Spin.setDefaultIndicator`。',
  '',
  '## 要点',
  '',
  '- 没有子节点、也没有 `tip` 时，是行内转圈（`inline-flex`），可以放在按钮或文字旁边。',
  '- 传入子节点后进入嵌套布局，`spinning` 为 true 时在内容上方盖一层半透明遮罩和指示器。`null`、`false`、空字符串、空数组和空片段视为没有内容，不会走遮罩布局。',
  '- 没有子节点但有 `tip` 时，仍显示提示，并留出至少 32px 高的占位，让转圈撑满所在容器，适合整页或整块区域的加载。',
  '- `getContainer` 会把遮罩和指示器挂到目标容器内并铺满；不传时仍就地包住子节点。目标是 `document.body` 或 `document.documentElement` 时覆盖视口，用来替代 antd 的 `fullscreen`。解析不到目标时不渲染指示器和遮罩，只渲染子节点（若有）。',
  '- 自定义 `indicator` 不会自动旋转，请自己打开图标的 `spin`，例如 `<LoadingOutlined spin />` 或 `<Loading spin />`。对本库图标，未显式传入时会补上 `color="currentColor"` 和随 Spin `size` 变化的 `size`（14 / 20 / 32）；被 `React.memo` 再包一层后 `isYakitIcon` 会丢失，此时不会自动注入。',
  '- 传 `null` 或空片段可以藏掉默认圆点，只保留遮罩和提示。',
  '- `className` 和 `rootClassName` 都加在根节点上。从 antd 迁移时，把原来的 `wrapperClassName` 改到这里。',
  '- 传入函数形式的 `getContainer` 时必须是纯函数，同一轮渲染里多次调用应返回同一个节点；返回值来回变化可能触发 `Too many re-renders`。服务端和 hydration 首帧不会解析容器，hydration 完成后再挂上遮罩；客户端直接渲染时，已知节点或选择器在首帧就能拿到 ref。',
  '',
  '## 代码演示',
  '',
  '下方按「总览（Controls）→ 包住内容 → 仅提示 → 尺寸 → 行内 → 面板遮罩 → 指定容器 → 自定义指示器 → 隐藏指示器 → 整页加载」组织示例。',
  '',
  '## API',
  '',
  '### Spin',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| spinning | 是否处于加载中 | `boolean` | `true` |',
  '| size | 尺寸。没有 antd 的 `default` / `middle` | `small` \\| `medium` \\| `large` | `medium` |',
  '| tip | 加载提示。没有子节点时仍会显示，并留出至少 32px 高的占位 | `ReactNode` | - |',
  '| delay | 延迟显示加载，避免状态闪烁，单位毫秒 | `number` | `0` |',
  '| indicator | 自定义指示器。不传时使用默认圆点；`null` 或空片段可藏掉圆点并保留遮罩。旋转由指示器自己负责，例如 `<LoadingOutlined spin />`。对本库图标，未显式传入时会补上颜色和随 `size` 变化的尺寸；被 `React.memo` 再包一层后不会自动注入 | `ReactElement` \\| `null` | 默认圆点 |',
  '| getContainer | 把遮罩和指示器挂到指定容器，而不是包住子节点。可传节点、返回节点的函数或选择器。目标是 `body` 或 `documentElement` 时覆盖视口。解析不到时只渲染子节点。函数必须是纯函数，同一轮渲染里应返回同一个节点 | `HTMLElement` \\| `() => HTMLElement \\| null \\| undefined` \\| `string` | - |',
  '| className / rootClassName | 加在根节点上。从 antd 迁移时，把原来的 `wrapperClassName` 改到这里 | `string` | - |',
  '| style | 根节点样式 | `CSSProperties` | - |',
  '| children | 被遮罩包裹的内容。`null`、`false`、空字符串、空数组和空片段视为没有内容，不会走遮罩布局 | `ReactNode` | - |',
  '',
  'Ref 转发到根 `div`。使用 `getContainer` 时，指向 portal 到目标容器里的遮罩；解析不到目标时不会挂载，ref 为 `null`。',
  '',
  '没有 `fullscreen`、`percent`、`description`、`wrapperClassName` 和 `Spin.setDefaultIndicator`。需要盖住视口时，把 `getContainer` 设为 `document.body` 或 `"body"`；提示请用 `tip`。',
  '',
  '### 标记类（公共 API）',
  '',
  '以下类名属于公共契约，供消费方覆盖样式或测试定位：`yakit-spin`、`yakit-spin-small`、`yakit-spin-medium`、`yakit-spin-large`、`yakit-spin-spinning`、`yakit-spin-nested`、`yakit-spin-portal`、`yakit-spin-viewport`、`yakit-spin-custom`、`yakit-spin-tip`、`yakit-spin-container`。',
].join('\n')

const meta: Meta<typeof Spin> = {
  title: 'YakitUi/反馈/Spin',
  component: Spin,
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
    spinning: {
      description: '是否处于加载中',
      table: { defaultValue: { summary: 'true' } },
      control: { type: 'boolean' },
    },
    size: {
      description: '尺寸。不传时为 medium。没有 antd 的 default / middle。',
      table: { defaultValue: { summary: 'medium' } },
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    tip: {
      description: '加载提示。没有子节点时仍会显示，并留出至少 32px 高的占位。',
      control: 'text',
    },
    delay: {
      description: '延迟显示加载，避免状态闪烁，单位毫秒',
      table: { defaultValue: { summary: '0' } },
      control: { type: 'number' },
    },
    className: {
      description:
        '自定义类名，加在根节点上。从 antd 迁移时，把原来的 wrapperClassName 改到 className 或 rootClassName。',
      control: 'text',
    },
    indicator: {
      description:
        '自定义指示器。不传时使用默认圆点。传 null 或空片段可以藏掉默认圆点。片段里如果有真实节点，会当作自定义指示器渲染。旋转由指示器自己负责，例如 indicator={<LoadingOutlined spin />}。对本库图标，未显式传入时会补上颜色和随 Spin 尺寸变化的 size；其他自定义组件不会被注入这两个属性。如果图标被 React.memo 等再包一层，isYakitIcon 标记会丢失，此时不会自动注入。',
      control: false,
    },
    getContainer: {
      description:
        '把遮罩和指示器挂到指定容器上，而不是包住子节点。可以传节点、返回节点的函数，或选择器。目标是 body 或 documentElement 时覆盖视口。不传时保持原来的就地遮罩。解析不到目标时不渲染指示器和遮罩，只渲染子节点。传入函数时必须是纯函数，同一轮渲染里应返回同一个节点。服务端和 hydration 首帧不会解析容器，hydration 完成后再挂上遮罩；客户端直接渲染时，已知节点或选择器在首帧就能拿到 ref。',
      control: false,
    },
  },
} satisfies Meta<typeof Spin>

export default meta
type Story = StoryObj<typeof meta>

/** 总览：绑定 Controls 的可调示例 */
export const Default: Story = {
  name: '总览',
  parameters: {
    docs: {
      description: {
        story: '单独的加载指示器；下方 Controls 可改尺寸、提示和加载状态。',
      },
    },
  },
  args: {
    spinning: true,
  },
}

/** 包住内容 */
export const Wrapper: Story = {
  name: '包住内容',
  parameters: {
    docs: {
      description: {
        story: '把内容作为子节点传入时，加载中会在内容上方盖一层遮罩和转圈。',
      },
    },
  },
  args: {
    spinning: true,
  },
  render: (args: SpinProps) => (
    <Spin {...args}>
      <Panel>
        <p>面板内容。打开 spinning 时会盖一层转圈。</p>
        <p>常见用法是包住整页、弹窗或表格的第一页。</p>
      </Panel>
    </Spin>
  ),
}

/** 仅提示 */
export const TipWithoutChildren: Story = {
  name: '仅提示',
  parameters: {
    docs: {
      description: {
        story: '没有子节点但有 `tip` 时，仍显示提示，并留出至少 32px 高的占位，让转圈撑满所在容器。',
      },
    },
  },
  args: {
    spinning: true,
    tip: '加载中...',
  },
  render: (args: SpinProps) => (
    <div style={{ height: 120 }}>
      <Spin {...args} />
    </div>
  ),
}

/** 尺寸 */
export const Sizes: Story = {
  name: '尺寸',
  parameters: {
    docs: {
      description: {
        story: '`small`、`medium`、`large`。不传时为 `medium`。没有 antd 的 `default` / `middle`。',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      <Spin size="small" />
      <Spin />
      <Spin size="large" />
    </div>
  ),
}

/** 行内 */
export const InlineSmall: Story = {
  name: '行内',
  parameters: {
    docs: {
      description: {
        story: '没有子节点、也没有 `tip` 时是行内转圈，可以放在按钮或文字旁边。',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Button type="primary">发送</Button>
      <Spin size="small" />
      <span>正在发送</span>
    </div>
  ),
}

/** 面板遮罩 */
export const PanelOverlay: Story = {
  name: '面板遮罩',
  parameters: {
    docs: {
      description: {
        story: '包住面板或表格时，可同时显示 `tip`。',
      },
    },
  },
  args: {
    spinning: true,
    tip: '加载中...',
  },
  render: (args: SpinProps) => (
    <Spin {...args}>
      <Panel>
        <p>表格第一行</p>
        <p>表格第二行</p>
        <p>表格第三行</p>
      </Panel>
    </Spin>
  ),
}

/** 指定容器 */
export const ContainerMask: Story = {
  name: '指定容器',
  parameters: {
    docs: {
      description: {
        story:
          '传入 `getContainer` 后，遮罩和指示器会挂到目标容器内并铺满，不必把内容包进 Spin。函数如果依赖 ref，要等节点挂上后才能解析。',
      },
    },
  },
  args: {
    spinning: true,
    tip: '加载中...',
  },
  render: (args: SpinProps) => {
    const Demo = () => {
      const ref = useRef<HTMLDivElement>(null)

      return (
        <>
          <div ref={ref} style={panelStyle}>
            <p>表格第一行</p>
            <p>表格第二行</p>
            <p>表格第三行</p>
          </div>
          <Spin {...args} getContainer={() => ref.current} />
        </>
      )
    }

    return <Demo />
  },
}

/** 自定义指示器 */
export const CustomIndicator: Story = {
  name: '自定义指示器',
  parameters: {
    docs: {
      description: {
        story:
          '旋转由指示器自己负责。使用本库图标时请加上 `spin`，例如 `<LoadingOutlined spin />`。未显式传入时会为这些图标补上颜色和尺寸。',
      },
    },
  },
  args: {
    spinning: true,
  },
  render: (args: SpinProps) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
      <Spin {...args} indicator={<LoadingOutlined spin />} size="small" />
      <Spin {...args} indicator={<LoadingOutlined spin />} />
      <Spin {...args} indicator={<LoadingOutlined spin />} size="large" />
      <Spin {...args} indicator={<LoadingOutlined spin />} tip="加载中...">
        <Panel>自定义指示器和 antd 一样，传 LoadingOutlined 并打开 spin。</Panel>
      </Spin>
    </div>
  ),
}

/** 隐藏指示器 */
export const HiddenIndicator: Story = {
  name: '隐藏指示器',
  parameters: {
    docs: {
      description: {
        story: '传 `null` 或空片段可以藏掉默认圆点，只保留遮罩和提示。不传 `indicator` 时仍使用默认圆点。',
      },
    },
  },
  args: {
    spinning: true,
    tip: '处理中...',
  },
  render: (args: SpinProps) => (
    <Spin {...args} indicator={<></>}>
      <Panel>传空片段或 null 都可以藏掉默认圆点，只保留遮罩和提示。不传 indicator 时仍使用默认圆点。</Panel>
    </Spin>
  ),
}

/** 整页加载 */
export const PageLoading: Story = {
  name: '整页加载',
  parameters: {
    docs: {
      description: {
        story: '没有子节点、带 `tip` 的大尺寸占位，适合整页或整块区域的加载。',
      },
    },
  },
  args: {
    spinning: true,
    size: 'large',
    tip: '加载中',
  },
  render: (args: SpinProps) => (
    <div style={{ height: 200 }}>
      <Spin {...args} />
    </div>
  ),
}

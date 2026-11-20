import type { Meta, StoryObj } from '@storybook/react'
import { Card, type CardProps } from '@yakit-libs/yakit-ui'
import type { CSSProperties } from 'react'

const meta: Meta<typeof Card> = {
  title: 'YakitUi/通用/Card',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      description: '标题',
      control: 'text',
    },
    extra: {
      description: '头部右侧额外内容',
      control: false,
    },
    bordered: {
      description: '是否有边框',
      control: { type: 'boolean' },
      table: { defaultValue: { summary: 'true' } },
    },
    size: {
      description: '尺寸',
      control: { type: 'select' },
      options: ['default', 'small'],
      table: { defaultValue: { summary: 'default' } },
    },
    hoverable: {
      description: '悬停阴影',
      control: { type: 'boolean' },
    },
    loading: {
      description: 'loading 遮罩（覆盖整卡）',
      control: { type: 'boolean' },
    },
    variant: {
      description: '边框变体',
      control: { type: 'select' },
      options: ['outlined', 'borderless'],
    },
    children: {
      description: '卡片内容',
      control: 'text',
    },
    headClassName: {
      description: '头部 className',
      control: false,
    },
    bodyClassName: {
      description: '内容区 className',
      control: false,
    },
    className: {
      description: '根元素 className',
      control: false,
    },
    rootClassName: {
      description: '根元素额外 className',
      control: false,
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

const cardShell: CSSProperties = {
  width: 360,
  height: 200,
  background: 'var(--Colors-Use-Basic-Background, #fff)',
}

export const Default: Story = {
  args: {
    title: '卡片标题',
    children: '卡片内容区域',
    bordered: true,
  },
  render: (args: CardProps) => (
    <div style={cardShell}>
      <Card {...args} />
    </div>
  ),
}

export const WithExtra: Story = {
  args: {
    title: '任务列表',
    children: '带 extra 操作区的卡片',
    bordered: true,
  },
  render: (args: CardProps) => (
    <div style={cardShell}>
      <Card
        {...args}
        extra={
          <span
            style={{
              color: 'var(--Colors-Use-Main-Primary, #f28b44)',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            更多
          </span>
        }
      />
    </div>
  ),
}

export const Borderless: Story = {
  args: {
    title: '无边框',
    bordered: false,
    children: 'bordered=false 时隐藏外层边框',
  },
  render: (args: CardProps) => (
    <div style={{ ...cardShell, border: '1px dashed #ddd' }}>
      <Card {...args} />
    </div>
  ),
}

export const SmallSize: Story = {
  args: {
    title: '小号卡片',
    size: 'small',
    children: 'size=small 时 header / body 更紧凑',
  },
  render: (args: CardProps) => (
    <div style={cardShell}>
      <Card {...args} />
    </div>
  ),
}

export const Hoverable: Story = {
  args: {
    title: '可悬停',
    hoverable: true,
    children: 'hoverable + onClick',
  },
  render: (args: CardProps) => (
    <div style={cardShell}>
      <Card {...args} onClick={() => undefined} />
    </div>
  ),
}

export const Loading: Story = {
  args: {
    title: '加载中',
    loading: true,
    children: 'loading 遮罩覆盖整卡（含 header）',
  },
  render: (args: CardProps) => (
    <div style={cardShell}>
      <Card {...args} />
    </div>
  ),
}

export const BodyOnly: Story = {
  args: {
    children: '仅内容区（无 title / extra 时不渲染头部）',
  },
  render: (args: CardProps) => (
    <div style={cardShell}>
      <Card {...args} />
    </div>
  ),
}

export const CustomStyles: Story = {
  args: {
    title: '自定义样式',
    size: 'small',
    loading: true,
    children: '可通过 headStyle / bodyStyle / styles 覆盖；对齐主项目 YakitCard / antd Card API',
  },
  render: (args: CardProps) => (
    <div style={cardShell}>
      <Card
        {...args}
        headStyle={{ background: 'var(--Colors-Use-Neutral-Bg, #f8f9fb)' }}
        styles={{ body: { padding: 16, gap: 8 } }}
      />
    </div>
  ),
}

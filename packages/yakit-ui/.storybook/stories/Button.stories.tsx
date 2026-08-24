import type { Meta, StoryObj } from '@storybook/react';

import Button from '../../src/components/Button';
import type { ButtonProps } from '../../src/components/Button/type';

const PlusIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const storyLayout = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  flexWrap: 'wrap' as const,
};

const meta: Meta<typeof Button> = {
  title: 'YakitUi/通用/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      description: '按钮类型',
      table: { defaultValue: { summary: 'primary' } },
      control: { type: 'select' },
      options: [
        'primary',
        'secondary1',
        'secondary2',
        'outline1',
        'outline2',
        'text1',
        'text2',
        'link1',
        'link2',
      ],
    },
    color: {
      description: '按钮主题颜色',
      table: { defaultValue: { summary: 'primary' } },
      control: { type: 'select' },
      options: ['primary', 'success', 'warning', 'error'],
    },
    size: {
      description: '按钮尺寸',
      table: { defaultValue: { summary: 'medium' } },
      control: { type: 'select' },
      options: ['small', 'medium', 'large', 'huge'],
    },
    shape: {
      description: '按钮形状',
      table: { defaultValue: { summary: 'default' } },
      control: { type: 'select' },
      options: ['default', 'round', 'circle'],
    },
    error: {
      description: '使用设计稿中的错误状态颜色（优先于 color）',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    animation: {
      description: '点击时的波纹动画效果',
      table: { defaultValue: { summary: 'wave' } },
      control: { type: 'select' },
      options: ['wave', false],
    },
    icon: {
      description: '按钮图标（ReactNode）',
      control: false,
    },
    iconPosition: {
      description: '图标位置',
      table: { defaultValue: { summary: 'start' } },
      control: { type: 'select' },
      options: ['start', 'end'],
    },
    children: {
      description: '按钮内容',
      control: 'text',
    },
    disabled: {
      description: '是否禁用按钮',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    loading: {
      description: '是否开启加载',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    className: {
      description: '自定义类名',
      control: 'text',
    },
    onClick: {
      description: '点击按钮时触发的回调',
      action: 'clicked',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础用法
export const Default: Story = {
  args: {
    children: 'Button',
    type: 'primary',
    size: 'medium',
    shape: 'default',
    animation: 'wave',
    color: 'primary',
    disabled: false,
    loading: false,
    iconPosition: 'start',
  },
};

// 尺寸示例
export const Sizes: Story = {
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      <Button {...args} size="small">
        Small
      </Button>
      <Button {...args} size="medium">
        Medium
      </Button>
      <Button {...args} size="large">
        Large
      </Button>
      <Button {...args} size="huge">
        Huge
      </Button>
    </div>
  ),
};

// 形状示例
export const Shapes: Story = {
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      <Button {...args} shape="default">
        Default
      </Button>
      <Button {...args} shape="round">
        全圆角
      </Button>
      <Button {...args} shape="circle">
        O
      </Button>
    </div>
  ),
};

// 图标示例
export const WithIcon: Story = {
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      <Button {...args} icon={<PlusIcon />} aria-label="添加" />
      <Button {...args} icon={<PlusIcon />}>
        添加
      </Button>
      <Button {...args} icon={<PlusIcon />} iconPosition="end">
        添加
      </Button>
    </div>
  ),
};

// 类型示例
export const Types: Story = {
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      {(
        [
          'primary',
          'secondary1',
          'secondary2',
          'outline1',
          'outline2',
          'text1',
          'text2',
          'link1',
          'link2',
        ] as ButtonProps['type'][]
      ).map((t) => (
        <Button {...args} type={t} key={t}>
          {t}
        </Button>
      ))}
    </div>
  ),
};

// 颜色由 @yakit-libs/color 的语义色变量提供，并可随工具栏主题切换。
export const Colors: Story = {
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      {(['primary', 'success', 'warning', 'error'] as const).map((color) => (
        <Button {...args} key={color} color={color}>
          {color}
        </Button>
      ))}
    </div>
  ),
};

// 设计稿中的 Error=Yes 变体
export const ErrorVariants: Story = {
  render: (args: ButtonProps) => (
    <div style={storyLayout}>
      {(
        ['primary', 'secondary1', 'secondary2', 'outline1', 'outline2', 'text1', 'link1'] as const
      ).map((type) => (
        <Button {...args} key={type} type={type} error>
          {type}
        </Button>
      ))}
    </div>
  ),
};

export const Loading: Story = {
  args: {
    children: '加载中',
    loading: true,
  },
};

// 禁用状态
export const Disabled: Story = {
  args: {
    type: 'primary',
    children: 'Disabled Button',
    disabled: true,
  },
};

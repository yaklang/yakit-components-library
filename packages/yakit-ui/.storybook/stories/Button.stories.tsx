import type { Meta, StoryObj } from '@storybook/react';

import Button from '../../src/components/Button';
import type { ButtonProps } from '../../src/components/Button/type';

const meta: Meta<typeof Button> = {
  title: 'YakitUi/通用/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      description: '按钮类型（决定按钮的视觉样式）',
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
      options: ['default', 'circle'],
    },
    animation: {
      description: '点击时的波纹动画效果',
      table: { defaultValue: { summary: 'wave' } },
      control: { type: 'select' },
      options: ['wave', false],
    },
    disabled: {
      description: '是否禁用按钮',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    children: {
      description: '按钮内容',
      control: 'text',
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
  },
};

// 尺寸示例
export const Sizes: Story = {
  render: (args: ButtonProps) => (
    <div style={{ display: 'flex', gap: '1rem' }}>
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
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Button {...args} shape="default">
        Default
      </Button>
      <Button {...args} shape="circle">
        O
      </Button>
    </div>
  ),
};

// 类型示例
export const Types: Story = {
  render: (args: ButtonProps) => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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

// 禁用状态
export const Disabled: Story = {
  args: {
    type: 'primary',
    children: 'Disabled Button',
    disabled: true,
  },
};

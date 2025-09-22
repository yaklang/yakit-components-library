import type { Meta, StoryObj } from '@storybook/react';

import Button from '../../src/components/Button';
import type { ButtonProps } from '../../src/components/Button/type';

const meta: Meta<typeof Button> = {
  title: 'Example/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: [
        'primary',
        'secondary1',
        'secondary2',
        'outline1',
        'outline2',
        'text1',
        'text2',
        'link',
      ],
    },
    state: {
      control: { type: 'select' },
      options: ['default', 'hover', 'pressed', 'animation', 'disable'],
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large', 'huge'],
    },
    shape: {
      control: { type: 'select' },
      options: ['default', 'circle'],
    },
    animation: {
      control: { type: 'select' },
      options: ['wave', false],
    },
    disabled: { control: { type: 'boolean' } },
    onClick: { action: 'clicked' },
    children: { control: 'text' },
    className: { control: 'text' },
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
    state: 'default',
    animation: 'wave',
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
          'link',
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

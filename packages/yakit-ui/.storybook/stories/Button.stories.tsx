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
      control: 'select',
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
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'huge'],
    },
    shape: {
      control: 'select',
      options: ['default', 'circle'],
    },
    state: {
      control: 'select',
      options: ['default', 'hover', 'pressed', 'animation', 'disable'],
    },
    disabled: {
      control: 'boolean',
    },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础用法
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

// 尺寸
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

// 形状
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

// 禁用状态
export const Disabled: Story = {
  args: {
    type: 'primary',
    children: 'Disabled Button',
    disabled: true,
  },
};

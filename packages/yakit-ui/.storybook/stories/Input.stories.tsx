import type { Meta, StoryObj } from '@storybook/react';

import Input from '../../src/components/Input';
import type { InputProps } from '../../src/components/Input';

const storyLayout = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
  width: '400px',
};

const meta: Meta<typeof Input> = {
  title: 'YakitUi/通用/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { placeholder: '请输入...', size: 'large', style: { width: '400px' } },
  argTypes: {
    size: {
      control: 'select',
      options: ['small', 'medium', 'large'],
      table: { defaultValue: { summary: 'large' } },
    },
    error: { control: 'boolean', table: { defaultValue: { summary: 'false' } } },
    prefix: { control: false },
    suffix: { control: false },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args: InputProps) => (
    <div style={storyLayout}>
      <Input {...args} size="small" placeholder="Small" />
      <Input {...args} size="medium" placeholder="Medium" />
      <Input {...args} size="large" placeholder="Large" />
    </div>
  ),
};

export const Error: Story = {
  args: { error: true, value: '这里是内容', readOnly: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

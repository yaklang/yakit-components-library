import type { Meta, StoryObj } from '@storybook/react';

import InputNumber from '../../src/components/InputNumber';
import type { InputNumberProps } from '../../src/components/InputNumber';

const layout = { display: 'flex', flexDirection: 'column' as const, gap: '16px' };

const meta: Meta<typeof InputNumber> = {
  title: 'YakitUi/通用/InputNumber',
  component: InputNumber,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { defaultValue: 0, min: 0 },
  argTypes: {
    size: { control: 'select', options: ['small', 'medium', 'large', 'huge'] },
    controls: { control: 'select', options: ['vertical', 'horizontal', false] },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
} satisfies Meta<typeof InputNumber>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args: InputNumberProps) => (
    <div style={layout}>
      <InputNumber {...args} size="small" />
      <InputNumber {...args} size="medium" />
      <InputNumber {...args} size="large" />
      <InputNumber {...args} size="huge" />
    </div>
  ),
};

export const HorizontalControls: Story = {
  args: { controls: 'horizontal', defaultValue: 10 },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 10 },
};

export const Focus: Story = {
  args: { autoFocus: true },
};

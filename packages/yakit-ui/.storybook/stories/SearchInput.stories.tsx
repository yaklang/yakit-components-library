import type { Meta, StoryObj } from '@storybook/react';

import SearchInput from '../../src/components/SearchInput';
import type { SearchInputProps } from '../../src/components/SearchInput';

const layout = { display: 'flex', flexDirection: 'column' as const, gap: '16px', width: '304px' };

const meta: Meta<typeof SearchInput> = {
  title: 'YakitUi/通用/SearchInput',
  component: SearchInput,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { placeholder: '请输入关键词搜索' },
  argTypes: {
    size: { control: 'select', options: ['small', 'medium', 'large', 'huge'] },
    variant: { control: 'select', options: ['box', 'main-bg', 'dropdown', 'icon-only'] },
    iconPosition: { control: 'select', options: ['front', 'back', 'both', 'only'] },
    icon: { control: false },
    suffix: { control: false },
    onSearch: { action: 'search' },
  },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: (args: SearchInputProps) => (
    <div style={layout}>
      <SearchInput {...args} size="small" />
      <SearchInput {...args} size="medium" />
      <SearchInput {...args} size="large" />
      <SearchInput {...args} size="huge" />
    </div>
  ),
};

export const MainBackground: Story = {
  args: { variant: 'main-bg' },
};

export const Dropdown: Story = {
  args: { dropdownLabel: '关键词', variant: 'dropdown' },
};

export const IconOnly: Story = {
  args: { variant: 'icon-only' },
};

export const Disabled: Story = {
  args: { disabled: true },
};

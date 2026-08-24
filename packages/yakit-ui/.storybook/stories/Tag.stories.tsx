import type { Meta, StoryObj } from '@storybook/react';

import Tag from '../../src/components/Tag';
import type { TagProps } from '../../src/components/Tag';

const meta: Meta<typeof Tag> = {
  title: 'YakitUi/通用/Tag',
  component: Tag,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: '标签尺寸',
      table: { defaultValue: { summary: 'middle' } },
      control: { type: 'select' },
      options: ['small', 'middle', 'large'],
    },
    color: {
      description: '标签颜色',
      table: { defaultValue: { summary: 'default' } },
      control: { type: 'select' },
      options: [
        'default',
        'primary',
        'success',
        'warning',
        'error',
        'purple',
        'magenta',
        'blue',
        'lake-blue',
        'cyan',
        'orange',
        'neutral',
        'yellow',
      ],
    },
    bordered: {
      description: '是否带边框',
      control: { type: 'boolean' },
      table: { defaultValue: { summary: 'true' } },
    },
    icon: {
      description: '标签图标（ReactNode）',
      control: false,
    },
    children: {
      description: '标签内容',
      control: 'text',
    },
    onClose: { action: 'closed' },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

// --------------------
// 默认
export const Default: Story = {
  args: { children: 'Tag' },
};

// 尺寸示例
export const Sizes: Story = {
  render: (args: TagProps) => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Tag {...args} size="small">
        Small
      </Tag>
      <Tag {...args} size="middle">
        Middle
      </Tag>
      <Tag {...args} size="large">
        Large
      </Tag>
    </div>
  ),
};

// 颜色示例
export const Colors: Story = {
  render: (args: TagProps) => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {[
        'default',
        'primary',
        'success',
        'warning',
        'error',
        'purple',
        'magenta',
        'blue',
        'lake-blue',
        'cyan',
        'orange',
        'neutral',
        'yellow',
      ].map((color) => (
        <Tag key={color} {...args} color={color as TagProps['color']}>
          {color}
        </Tag>
      ))}
    </div>
  ),
};

// 带边框示例
export const Bordered: Story = {
  render: (args: TagProps) => (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <Tag {...args} bordered>
        Bordered
      </Tag>
      <Tag {...args} bordered={false}>
        No Border
      </Tag>
    </div>
  ),
};

import type { Meta, StoryObj } from '@storybook/react';

import Menu from '../../src/components/Menu';
import type { MenuItemProps } from '../../src/components/Menu';

const PuzzleIcon = ({ size = 32 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" fill="none">
    <rect x="4" y="4" width="11" height="11" rx="2" fill="#C0C6D1" />
    <rect x="17" y="4" width="11" height="11" rx="2" fill="#868C97" />
    <rect x="4" y="17" width="11" height="11" rx="2" fill="#868C97" />
    <rect x="17" y="17" width="11" height="11" rx="2" fill="#C0C6D1" />
  </svg>
);

const GridIcon = () => (
  <svg aria-hidden="true" width="44" height="44" viewBox="0 0 44 44" fill="none">
    {Array.from({ length: 9 }).map((_, i) => {
      const x = 8 + (i % 3) * 10;
      const y = 8 + Math.floor(i / 3) * 10;
      return (
        <rect
          key={i}
          x={x}
          y={y}
          width="8"
          height="8"
          rx="1.5"
          fill={i === 4 ? '#F28C45' : '#C0C6D1'}
        />
      );
    })}
  </svg>
);

const storyRow = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: '16px',
  flexWrap: 'wrap' as const,
};

const meta: Meta<typeof Menu.Item> = {
  title: 'YakitUi/导航/Menu',
  component: Menu.Item,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: '菜单项尺寸',
      control: { type: 'select' },
      options: ['large', 'medium'],
      table: { defaultValue: { summary: 'large' } },
    },
    vertical: {
      description: '是否纵向（图标在上）',
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    select: {
      description: '是否展示下拉箭头（可配合 menu/dropdown/overlay）',
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    active: {
      description: '选中态',
      control: 'boolean',
    },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Menu.Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: <GridIcon />,
    label: '插件批量执行',
    size: 'large',
    vertical: true,
  },
};

export const BasicVariants: Story = {
  name: 'Basic 变体（对照 Figma）',
  render: () => (
    <div style={storyRow}>
      <Menu.Item icon={<GridIcon />} label="插件批量执行" size="large" vertical />
      <Menu.Item icon={<PuzzleIcon />} label="插件通用图标" size="medium" vertical select />
      <Menu.Item icon={<PuzzleIcon />} label="插件通用图标" size="medium" vertical />
      <Menu.Item icon={<PuzzleIcon />} label="插件通用图标" size="medium" vertical={false} />
      <Menu.Item icon={<PuzzleIcon />} label="插件通用图标" size="medium" vertical={false} select />
      <Menu.Item icon={<PuzzleIcon />} size="medium" vertical={false} aria-label="插件" />
      <Menu.Item icon={<PuzzleIcon />} size="medium" vertical={false} select aria-label="插件" />
    </div>
  ),
};

const Item = (props: MenuItemProps) => <Menu.Item {...props} />;

export const Toolbar: Story = {
  name: 'Menu 工具栏示例（含 Fuzzer 共享标题）',
  render: () => (
    <Menu style={{ width: 960, padding: 8, background: '#f8f9fa' }}>
      <Menu.Group>
        <Item icon={<GridIcon />} label="MITM" size="large" itemKey="mitm" />
      </Menu.Group>
      <Menu.Group>
        <Menu.SubGroup label="Fuzzer">
          <Item
            icon={<PuzzleIcon />}
            size="medium"
            vertical={false}
            aria-label="Web"
            itemKey="fuzzer-web"
          />
          <Item
            icon={<PuzzleIcon />}
            size="medium"
            vertical={false}
            aria-label="WS"
            itemKey="fuzzer-ws"
          />
        </Menu.SubGroup>
      </Menu.Group>
      <Menu.Group>
        <Item icon={<PuzzleIcon />} label="Codec" size="medium" vertical={false} />
        <Item icon={<PuzzleIcon />} label="数据对比" size="medium" vertical={false} />
      </Menu.Group>
      <Menu.Group divided={false}>
        <Item icon={<PuzzleIcon />} label="AI Agent" size="large" active itemKey="ai" />
      </Menu.Group>
    </Menu>
  ),
};

export const SelectWithDropdown: Story = {
  name: 'Select + Dropdown 面板',
  render: () => (
    <Menu.Item
      icon={<PuzzleIcon />}
      label="插件"
      size="medium"
      select
      menu={{
        items: [
          { key: 'a', label: '选项 A' },
          { key: 'b', label: '选项 B' },
        ],
      }}
    />
  ),
};

export const ActiveAndDisabled: Story = {
  render: (args) => (
    <div style={storyRow}>
      <Menu.Item {...args} icon={<PuzzleIcon />} label="默认" />
      <Menu.Item {...args} icon={<PuzzleIcon />} label="选中" active />
      <Menu.Item {...args} icon={<PuzzleIcon />} label="禁用" disabled />
    </div>
  ),
  args: { size: 'medium', vertical: true },
};

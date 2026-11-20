import type { Meta, StoryObj } from '@storybook/react'
import { Button, Dropdown, type DropdownProps, YakitDropdownMenu } from '@yakit-libs/yakit-ui'
import { useState } from 'react'

const basicItems: NonNullable<NonNullable<DropdownProps['menu']>['items']> = [
  { key: '1', label: 'Select list item' },
  { key: '2', label: 'Select list item' },
  { key: '3', label: 'Select list item', extra: '⇧⌘C' },
  { key: '4', label: 'Select list item' },
  { type: 'divider' },
  { key: '5', label: 'Danger item', danger: true },
]

const meta: Meta<typeof Dropdown> = {
  title: 'YakitUi/通用/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    placement: {
      description: '弹出位置，对齐 antd Dropdown placement',
      table: { defaultValue: { summary: 'bottomLeft' } },
      control: { type: 'select' },
      options: [
        'bottomLeft',
        'bottom',
        'bottomRight',
        'topLeft',
        'top',
        'topRight',
        'left',
        'leftTop',
        'leftBottom',
        'right',
        'rightTop',
        'rightBottom',
      ],
    },
    trigger: {
      description: '触发方式',
      control: { type: 'object' },
    },
    disabled: {
      description: '禁用',
      control: { type: 'boolean' },
    },
    arrow: {
      description: '是否显示箭头',
      control: { type: 'boolean' },
    },
    open: {
      description: '受控展开（Docs 勿用 Controls 强行赋值）',
      control: false,
    },
    onOpenChange: { action: 'openChange' },
  },
} satisfies Meta<typeof Dropdown>

export default meta
type Story = StoryObj<typeof meta>

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  flexWrap: 'wrap' as const,
}

export const Default: Story = {
  args: {
    trigger: ['click'],
    menu: {
      items: basicItems,
      selectable: true,
      defaultSelectedKeys: ['3'],
      type: 'primary',
      size: 'medium',
      width: 216,
    },
    children: <Button type="outline1">Dropdown</Button>,
  },
}

export const HoverTrigger: Story = {
  args: {
    trigger: ['hover'],
    menu: {
      items: basicItems,
      selectable: true,
      defaultSelectedKeys: ['3'],
      width: 216,
    },
    children: <Button type="outline1">Hover me</Button>,
  },
}

export const Placements: Story = {
  render: () => (
    <div style={{ ...row, padding: 80 }}>
      {(['bottomLeft', 'bottom', 'topLeft', 'rightTop'] as const).map((placement) => (
        <Dropdown
          key={placement}
          trigger={['click']}
          placement={placement}
          arrow
          menu={{ items: basicItems, width: 180 }}
        >
          <Button type="outline1">{placement}</Button>
        </Dropdown>
      ))}
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Dropdown
        trigger={['click']}
        menu={{ items: basicItems, size: 'medium', selectable: true, defaultSelectedKeys: ['3'] }}
      >
        <Button type="outline1">medium / md</Button>
      </Dropdown>
      <Dropdown
        trigger={['click']}
        menu={{ items: basicItems, size: 'large', selectable: true, defaultSelectedKeys: ['3'] }}
      >
        <Button type="outline1">large / lg</Button>
      </Dropdown>
    </div>
  ),
}

export const MenuTypes: Story = {
  render: () => (
    <div style={row}>
      <Dropdown
        trigger={['click']}
        menu={{
          type: 'primary',
          selectable: true,
          defaultSelectedKeys: ['3'],
          items: basicItems,
          width: 216,
        }}
      >
        <Button type="primary">primary 选中</Button>
      </Dropdown>
      <Dropdown
        trigger={['click']}
        menu={{
          type: 'grey',
          selectable: true,
          defaultSelectedKeys: ['3'],
          items: basicItems,
          width: 216,
        }}
      >
        <Button type="outline1">grey 选中</Button>
      </Dropdown>
    </div>
  ),
}

export const WithIconAndDescription: Story = {
  render: () => (
    <Dropdown
      trigger={['click']}
      menu={{
        width: 248,
        selectable: true,
        items: [
          {
            key: '1',
            label: 'Select list item',
            description: 'Sub text description',
            icon: <span>★</span>,
          },
          {
            key: '2',
            label: 'Select list item',
            description: 'Sub text description',
            icon: <span>★</span>,
            extra: '⌘K',
          },
          { type: 'divider' },
          {
            key: '3',
            label: 'Disabled',
            disabled: true,
            icon: <span>★</span>,
          },
        ],
      }}
    >
      <Button type="outline1">Icon + SubText</Button>
    </Dropdown>
  ),
}

export const SubMenu: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        width: 'min(920px, 90vw)',
        gap: 24,
        padding: '40px 8px',
      }}
    >
      <Dropdown
        trigger={['click']}
        menu={{
          width: 200,
          items: [
            { key: '1', label: 'Item 1' },
            {
              key: '2',
              label: 'Has children',
              children: [
                { key: '2-1', label: 'Child 1' },
                { key: '2-2', label: 'Child 2', danger: true },
                { key: '2-3', label: 'Child 3' },
              ],
            },
            { key: '3', label: 'Item 3' },
          ],
        }}
      >
        <Button type="outline1">SubMenu（左侧，向右展开）</Button>
      </Dropdown>
      <Dropdown
        trigger={['click']}
        placement="bottomRight"
        menu={{
          width: 200,
          items: [
            { key: '1', label: 'Item 1' },
            {
              key: '2',
              label: '贴边应向左翻',
              children: [
                { key: '2-1', label: 'Child 1' },
                { key: '2-2', label: 'Child 2', danger: true },
                { key: '2-3', label: 'Child 3' },
              ],
            },
            { key: '3', label: 'Item 3' },
          ],
        }}
      >
        <Button type="outline1">SubMenu（靠右，贴边翻转）</Button>
      </Dropdown>
    </div>
  ),
}

export const Controlled: Story = {
  render: function ControlledRender() {
    const [open, setOpen] = useState(false)
    return (
      <div style={row}>
        {/* 组件层已延后 outside-close，外部 toggle 无需 stopPropagation */}
        <Button type="secondary1" onClick={() => setOpen((v) => !v)}>
          toggle ({open ? 'open' : 'close'})
        </Button>
        <Dropdown
          open={open}
          trigger={['click']}
          onOpenChange={(next) => setOpen(next)}
          menu={{ items: basicItems, width: 200 }}
        >
          <Button type="outline1">Controlled</Button>
        </Dropdown>
      </div>
    )
  },
}

export const PopupRender: Story = {
  render: () => (
    <Dropdown
      trigger={['click']}
      menu={{ items: basicItems }}
      popupRender={(origin) => (
        <div style={{ padding: 8 }}>
          <div style={{ marginBottom: 8, fontSize: 12, color: '#85898e' }}>Custom header</div>
          {origin}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button type="text" size="small">
              Clear
            </Button>
            <Button type="primary" size="small">
              Confirm
            </Button>
          </div>
        </div>
      )}
    >
      <Button type="outline1">popupRender</Button>
    </Dropdown>
  ),
}

export const YakitDropdownMenuStory: Story = {
  name: 'YakitDropdownMenu',
  render: () => (
    <YakitDropdownMenu
      dropdown={{ trigger: ['click'], placement: 'bottomLeft' }}
      menu={{
        items: basicItems,
        selectable: true,
        defaultSelectedKeys: ['3'],
        type: 'primary',
        width: 216,
      }}
    >
      <Button type="outline1">YakitDropdownMenu</Button>
    </YakitDropdownMenu>
  ),
}

export const DropdownButtonStory: Story = {
  name: 'Dropdown.Button',
  render: () => (
    <Dropdown.Button type="primary" trigger={['click']} menu={{ items: basicItems, width: 180 }}>
      Actions
    </Dropdown.Button>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    trigger: ['click'],
    menu: { items: basicItems },
    children: (
      <Button type="outline1" disabled>
        Disabled
      </Button>
    ),
  },
}

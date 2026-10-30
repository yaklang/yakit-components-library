import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import Switch from '../../src/components/Switch';

const meta: Meta<typeof Switch> = {
  title: 'YakitUi/通用/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: '尺寸：small→sm-12，middle/medium→md-16，large→lg-20，maxLarge→主项目扩展',
      table: { defaultValue: { summary: 'middle' } },
      control: { type: 'select' },
      options: ['small', 'middle', 'medium', 'large', 'maxLarge', 'default'],
    },
    checked: {
      description: '是否选中（受控）',
      control: { type: 'boolean' },
    },
    defaultChecked: {
      description: '默认是否选中',
      control: { type: 'boolean' },
    },
    disabled: {
      description: '是否禁用',
      control: { type: 'boolean' },
    },
    loading: {
      description: '加载中',
      control: { type: 'boolean' },
    },
    showInnerText: {
      description: '显示开/关文字（仅 middle/large）',
      control: { type: 'boolean' },
    },
    showInnerIcon: {
      description: '显示勾/叉图标（仅 middle/large）',
      control: { type: 'boolean' },
    },
    label: {
      description: '外侧主文案（Figma Text）',
      control: 'text',
    },
    description: {
      description: '外侧副文案（Figma Sub Text）',
      control: 'text',
    },
    onChange: { action: 'changed' },
    onClick: { action: 'clicked' },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
  flexWrap: 'wrap' as const,
};

const col = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
};

export const Default: Story = {
  args: {
    defaultChecked: false,
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={row}>
      <Switch size="small" defaultChecked />
      <Switch size="middle" defaultChecked />
      <Switch size="large" defaultChecked />
      <Switch size="maxLarge" defaultChecked />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={col}>
      <div style={row}>
        <Switch size="middle" />
        <Switch size="middle" defaultChecked />
      </div>
      <div style={row}>
        <Switch size="middle" disabled />
        <Switch size="middle" disabled defaultChecked />
      </div>
      <div style={row}>
        <Switch size="middle" loading />
        <Switch size="middle" loading defaultChecked />
      </div>
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <div style={row}>
      <Switch size="small" label="Switch" />
      <Switch size="middle" label="Switch" defaultChecked />
      <Switch size="large" label="Switch" disabled />
    </div>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <div style={row}>
      <Switch
        size="middle"
        label="Enable notifications"
        description="Used for toggling a feature on or off"
      />
      <Switch
        size="large"
        label="Enable notifications"
        description="Used for toggling a feature on or off"
        defaultChecked
      />
    </div>
  ),
};

export const InnerText: Story = {
  render: () => (
    <div style={row}>
      <Switch size="middle" showInnerText />
      <Switch size="middle" showInnerText defaultChecked />
      <Switch size="large" showInnerText />
      <Switch size="large" showInnerText defaultChecked />
    </div>
  ),
};

export const InnerIcon: Story = {
  render: () => (
    <div style={row}>
      <Switch size="middle" showInnerIcon />
      <Switch size="middle" showInnerIcon defaultChecked />
      <Switch size="large" showInnerIcon />
      <Switch size="large" showInnerIcon defaultChecked />
    </div>
  ),
};

export const CustomChildren: Story = {
  render: () => (
    <div style={row}>
      <Switch checkedChildren="开" unCheckedChildren="关" size="large" />
      <Switch checkedChildren="ON" unCheckedChildren="OFF" size="large" defaultChecked />
    </div>
  ),
};

export const SemanticSlots: Story = {
  render: () => (
    <div style={row}>
      <Switch
        classNames={{ content: 'demo-content', indicator: 'demo-indicator', root: 'demo-root' }}
        defaultChecked
        showInnerText
        size="large"
        styles={{
          content: { fontWeight: 600 },
          indicator: { boxShadow: '0 0 0 2px rgba(242, 140, 69, 0.35)' },
          root: { outline: '1px dashed #f28c45' },
        }}
      />
      <Switch classNames={{ root: 'demo-root' }} showInnerIcon size="middle" />
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledRender() {
    const [checked, setChecked] = useState(false);
    return (
      <div style={row}>
        <Switch
          checked={checked}
          onChange={(next) => setChecked(next)}
          label={`受控：${checked ? 'ON' : 'OFF'}`}
        />
      </div>
    );
  },
};

export const Playground: Story = {
  args: {
    size: 'middle',
    defaultChecked: true,
    label: 'Switch',
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import { type CSSProperties, useState } from 'react';

import Checkbox from '../../src/components/Checkbox';
import type { CheckboxValueType } from '../../src/components/Checkbox';

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};

const colStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const labelStyle: CSSProperties = {
  minWidth: 88,
  fontSize: 12,
  color: '#888',
};

const COMPONENT_DOCS = [
  '多选框。用于在一组可选项中进行多项选择；对齐 Figma Checkbox，支持主文案、副文案与 `Checkbox.Group`。',
  '',
  '## 何时使用',
  '',
  '- 需要在多个选项中勾选一项或多项。',
  '- 需要「全选 / 半选」状态（`indeterminate`）。',
  '- 需要主文案 + 副文案说明，或仅方框（如表格行选）。',
  '',
  '## 代码演示',
  '',
  '下方按「总览（Controls）→ 仅方框 → 主文案 / 副文案 → 省略 → 禁用 → 受控 → 组合 / 受控 → 组合 / options → 组合 / 禁用 → 组合 / 换行 → 组合 / 独立子项」组织示例。',
  '',
  '## API',
  '',
  '### Checkbox',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| size | 尺寸：`medium`=16（Figma md-16），`large`=20（Figma lg-20）；未传时回落 ConfigProvider `componentSize`（`large`/`huge` → large，其余 → medium） | `medium` \\| `large` | `medium` |',
  '| checked | 指定当前是否选中（受控） | `boolean` | - |',
  '| defaultChecked | 初始是否选中（非受控） | `boolean` | `false` |',
  '| indeterminate | 半选 / Select All；与 `checked` 同时为真时以勾选为准 | `boolean` | `false` |',
  '| disabled | 禁用；在 Group 内未传时继承 Group / Config 的 disabled | `boolean` | `false` |',
  '| children | 主文案（Figma Text） | `ReactNode` | - |',
  '| description | 副文案（Figma Sub Text） | `ReactNode` | - |',
  '| title | 悬停提示（原生 title）；Group `options[].title` 也会传到这里 | `string` | - |',
  '| value | Group 内选项标识（需为 Group 的直接子节点 / Fragment 子节点，深层包装会被视为独立项，开发环境有 console 警告）；不在 Group 内时作为原生 value 透传 | `string` \\| `number` \\| `boolean` | - |',
  '| className | 根元素 className（挂在外层 label） | `string` | - |',
  '| rootClassName | 根元素额外 className，与 `className` 一并挂在 label | `string` | - |',
  '| onChange | 选中态变化；从 `e.target.checked` 读取 | `(e: CheckboxChangeEvent) => void` | - |',
  '| onClick | 点击（透传到原生 input） | `(e: MouseEvent<HTMLInputElement>) => void` | - |',
  '| aria-label | 无障碍名称；无文案时建议传入 | `string` | - |',
  '',
  '> ### Form',
  '',
  '- 单个 `Checkbox`：`Form.Item` 需设置 `valuePropName="checked"`（与 antd 相同）。',
  '- `Checkbox.Group`：直接包在 `Form.Item` 内即可（`value` / `onChange` 为数组）。初始值传数组即可勾选，如 `initialValues={{ habits: ["a"] }}`。',
  '',
  '> ### 迁移说明：接入方曾使用 `wrapperClassName`。库组件**无** `wrapperClassName`，请改为 `className` 或 `rootClassName`（二者都会加到根 `label` / Group 根 `div`）。',
  '',
  '### Checkbox.Group',
  '',
  '默认导出 `Checkbox`，并通过 `Checkbox.Group` 提供组合能力。',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| value | 指定选中的选项（受控） | `CheckboxValueType[]` | - |',
  '| defaultValue | 默认选中的选项（非受控） | `CheckboxValueType[]` | - |',
  '| onChange | 变化时回调 | `(checkedValue: CheckboxValueType[]) => void` | - |',
  '| options | 通过配置生成选项；与 children 可并存（`options` 先渲染） | `Array<CheckboxValueType \\| CheckboxOptionType>` | - |',
  '| disabled | 整组禁用 | `boolean` | - |',
  '| name | 透传到子 Checkbox 的 name（表单） | `string` | - |',
  '| className | 根元素 className | `string` | - |',
  '| rootClassName | 根元素额外 className | `string` | - |',
  '| children | 子节点；带 `value` 的 Checkbox（需为直接子节点 / Fragment 子节点）参与组控；无 `value`、或被深层包装的带 `value` 子项保持独立 Checkbox 行为（开发环境对后者有 console 警告） | `ReactNode` | - |',
  '| aria-label | 组合无障碍名称 | `string` | - |',
  '| aria-labelledby | 组合无障碍名称引用 | `string` | - |',
  '',
  '> Group 根节点为 `inline-flex` + `flex-wrap`，窄宽下会自动换行。若需要固定列数，请在页面层用 Grid / 列布局约束，而不是依赖 Group 自身分列。',
  '',
  '> `options[]` 可设 `disabled`、`title`、`onChange`、`style`、`className`。',
].join('\n');

const meta: Meta<typeof Checkbox> = {
  title: 'YakitUi/通用/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: COMPONENT_DOCS,
      },
    },
  },
  tags: ['autodocs'],
  // Primary 导出名为 Storybook Docs 主故事；避免按文件名排序后「仅方框」等顶到 Controls 上方
  argTypes: {
    size: {
      description: '尺寸：medium=16 / large=20',
      control: { type: 'select' },
      options: ['medium', 'large'],
      table: { defaultValue: { summary: 'medium' } },
    },
    checked: {
      description: '受控选中',
      control: { type: 'boolean' },
    },
    defaultChecked: {
      description: '非受控默认选中',
      control: { type: 'boolean' },
      table: { defaultValue: { summary: 'false' } },
    },
    indeterminate: {
      description: '半选；与 checked 同时为真时以勾选为准',
      control: { type: 'boolean' },
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      description: '是否禁用',
      control: { type: 'boolean' },
      table: { defaultValue: { summary: 'false' } },
    },
    children: {
      description: '主文案',
      control: 'text',
    },
    description: {
      description: '副文案',
      control: 'text',
    },
    title: {
      description: '悬停提示',
      control: 'text',
    },
    className: {
      description: '根 className（迁移：wrapperClassName → className / rootClassName）',
      control: 'text',
    },
    rootClassName: {
      description: '根额外 className',
      control: 'text',
    },
    onChange: {
      description: '选中变化（e.target.checked）',
      action: 'changed',
    },
    onClick: {
      description: '点击回调',
      action: 'clicked',
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 总览：Docs primary，唯一接 Controls */
export const Primary: Story = {
  name: '总览',
  parameters: {
    docs: {
      description: {
        story: '单个复选框；下方 Controls 可改尺寸、选中（checked）、半选、禁用与文案等。',
      },
    },
  },
  args: {
    children: '复选框',
    size: 'medium',
    indeterminate: false,
    disabled: false,
  },
};

/** 仅方框、无文案：表格行选等场景 */
export const BoxOnly: Story = {
  name: '仅方框',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: '无 `children` 时仅渲染方框；请传 `aria-label`。含禁用变体。',
      },
    },
  },
  render: () => (
    <div style={colStyle}>
      {(['medium', 'large'] as const).map((size) => (
        <div key={size} style={rowStyle}>
          <span style={labelStyle}>{size}</span>
          <Checkbox size={size} aria-label="未选" />
          <Checkbox size={size} defaultChecked aria-label="已选" />
          <Checkbox size={size} indeterminate aria-label="半选" />
          <Checkbox size={size} disabled aria-label="禁用未选" />
          <Checkbox size={size} disabled defaultChecked aria-label="禁用已选" />
          <Checkbox size={size} disabled indeterminate aria-label="禁用半选" />
        </div>
      ))}
    </div>
  ),
};

/** 主文案 / 副文案 */
export const WithDescription: Story = {
  name: '主文案 / 副文案',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: '`children` 为主文案（Figma Text），`description` 为副文案（Figma Sub Text）。',
      },
    },
  },
  render: () => (
    <div style={{ ...colStyle, maxWidth: 320 }}>
      <Checkbox size="medium" description="用于选择多个选项">
        复选框
      </Checkbox>
      <Checkbox size="large" defaultChecked description="用于选择多个选项">
        复选框
      </Checkbox>
      <Checkbox size="medium" indeterminate description="用于选择多个选项">
        复选框
      </Checkbox>
    </div>
  ),
};

/** 省略：父级限宽时主/副文案单行省略 */
export const Ellipsis: Story = {
  name: '省略',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: '当父级限制宽度时，主文案与副文案默认单行省略（`text-overflow: ellipsis`）。',
      },
    },
  },
  render: () => (
    <div
      style={{
        ...colStyle,
        maxWidth: 160,
        padding: 12,
        border: '1px dashed #c0c6d1',
        borderRadius: 4,
      }}
    >
      <Checkbox size="medium" description="这是一段很长的副文案，父级宽度受限时应单行省略显示">
        这是一段很长的主文案标签，超过容器宽度时应显示省略号
      </Checkbox>
      <Checkbox size="large" defaultChecked description="副文案在父级限宽时同样会省略显示">
        很长的主文案在限宽容器中应显示省略号
      </Checkbox>
    </div>
  ),
};

/** 禁用 */
export const Disabled: Story = {
  name: '禁用',
  parameters: {
    controls: { disable: true },
  },
  render: () => (
    <div style={rowStyle}>
      <Checkbox disabled>未选</Checkbox>
      <Checkbox disabled defaultChecked>
        已选
      </Checkbox>
      <Checkbox disabled indeterminate>
        半选
      </Checkbox>
      <Checkbox disabled description="用于选择多个选项">
        复选框
      </Checkbox>
    </div>
  ),
};

function ControlledDemo() {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)}>
      受控：{checked ? '开' : '关'}
    </Checkbox>
  );
}

/** 受控 */
export const Controlled: Story = {
  name: '受控',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: '受控用法：`checked` + `onChange`，从 `e.target.checked` 读取。',
      },
    },
  },
  render: () => <ControlledDemo />,
};

function ControlledGroupDemo() {
  const [value, setValue] = useState<CheckboxValueType[]>(['apple']);
  return (
    <div style={colStyle}>
      <Checkbox.Group value={value} onChange={setValue}>
        <Checkbox value="apple">苹果</Checkbox>
        <Checkbox value="pear">梨</Checkbox>
        <Checkbox value="orange">橙</Checkbox>
      </Checkbox.Group>
      <div style={{ fontSize: 12, color: '#858997' }}>value: {JSON.stringify(value)}</div>
    </div>
  );
}

/** 组合 / 受控 */
export const GroupControlled: Story = {
  name: '组合 / 受控',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story: '`Checkbox.Group` 受控：`value` + `onChange`。子项需带 `value` 才参与组控。',
      },
    },
  },
  render: () => <ControlledGroupDemo />,
};

/** 组合 / options */
export const GroupWithOptions: Story = {
  name: '组合 / options',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          '通过 `options` 生成选项；项可设 `title`、`disabled`。与 children 可并存时 `options` 先渲染。',
      },
    },
  },
  render: () => (
    <Checkbox.Group
      defaultValue={['Pear']}
      options={[
        { label: '苹果', value: 'Apple', title: '水果：苹果' },
        { label: '梨', value: 'Pear' },
        { label: '橙', value: 'Orange', disabled: true, title: '已禁用' },
      ]}
    />
  ),
};

/** 组合 / 禁用 */
export const GroupDisabled: Story = {
  name: '组合 / 禁用',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Group 上设 `disabled` 禁用整组；单项禁用请用 `options[].disabled` 或子项 `disabled`。',
      },
    },
  },
  render: () => (
    <Checkbox.Group defaultValue={['a', 'c']} disabled>
      <Checkbox value="a">选项 A</Checkbox>
      <Checkbox value="b">选项 B</Checkbox>
      <Checkbox value="c">选项 C</Checkbox>
    </Checkbox.Group>
  ),
};

/** 组合 / 换行：Group 默认 flex-wrap；固定列请用页面 Grid */
export const GroupWrap: Story = {
  name: '组合 / 换行',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Group 根节点为 `inline-flex` + `flex-wrap`，窄宽下自动换行。固定列数请用页面 Grid / 列布局，不要依赖 Group 自身分列。',
      },
    },
  },
  render: () => (
    <div
      style={{
        maxWidth: 280,
        padding: 12,
        border: '1px dashed #c0c6d1',
        borderRadius: 4,
      }}
    >
      <Checkbox.Group defaultValue={['1', '4']}>
        <Checkbox value="1">选项一</Checkbox>
        <Checkbox value="2">选项二</Checkbox>
        <Checkbox value="3">选项三</Checkbox>
        <Checkbox value="4">选项四</Checkbox>
        <Checkbox value="5">选项五</Checkbox>
        <Checkbox value="6">选项六</Checkbox>
        <Checkbox value="7">选项七</Checkbox>
        <Checkbox value="8">选项八</Checkbox>
      </Checkbox.Group>
    </div>
  ),
};

function GroupStandaloneChildDemo() {
  const [groupValue, setGroupValue] = useState<CheckboxValueType[]>(['a']);
  const [standalone, setStandalone] = useState(false);
  return (
    <div style={colStyle}>
      <Checkbox.Group value={groupValue} onChange={setGroupValue}>
        <Checkbox value="a">组内 A</Checkbox>
        <Checkbox value="b">组内 B</Checkbox>
        <Checkbox checked={standalone} onChange={(e) => setStandalone(e.target.checked)}>
          独立项（无 value，不参与 Group）
        </Checkbox>
      </Checkbox.Group>
      <div style={{ fontSize: 12, color: '#858997' }}>
        group: {JSON.stringify(groupValue)} · standalone: {String(standalone)}
      </div>
    </div>
  );
}

/** 组合 / 独立子项：有 value 参与组控；无 value 保持独立 */
export const GroupStandaloneChild: Story = {
  name: '组合 / 独立子项',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          '有 `value` 的直接子项参与组控；无 `value` 的 Checkbox 保持独立受控/非受控行为。' +
          '注意：带 `value` 但被自定义组件深层包装的子项也会按独立项处理（开发环境有 console 警告），' +
          '需要组控请用直接子节点 / Fragment，或改用 `options`。',
      },
    },
  },
  render: () => <GroupStandaloneChildDemo />,
};

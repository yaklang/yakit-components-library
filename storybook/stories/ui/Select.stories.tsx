import type { Meta, StoryObj } from '@storybook/react'
import { Select } from '@yakit-libs/yakit-ui'
import type { SelectProps } from '@yakit-libs/yakit-ui'
import { useState } from 'react'

const OPTIONS = [
  { value: 'apple', label: '苹果' },
  { value: 'pear', label: '梨' },
  { value: 'banana', label: '香蕉' },
  { value: 'orange', label: '橙子' },
  { value: 'disabled', label: '不可选', disabled: true },
]

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap' as const,
  width: 720,
}

const fieldStyle = { width: 240 }

const COMPONENT_DOCS = [
  '在一组选项里选择一项或多项。',
  '',
  '## 何时使用',
  '',
  '- 选项较多，需要收进浮层再选。',
  '- 需要搜索、多选或自由输入标签。',
  '',
  '## 代码演示',
  '',
  '下方按「总览（Controls）→ 尺寸 → 状态 → variant → 单选 → 多选 → tags → 选项删除 → 自定义渲染」组织示例。',
  '',
  '## API',
  '',
  '其余属性透传 antd 6 Select，例如 `options`、`mode`、`status`、`allowClear`、`showSearch`、`labelInValue`、`popupRender`、`onOpenChange`、`classNames`、`styles`。不接受 antd 5 的 `dropdownRender`、`dropdownClassName`、`dropdownMatchSelectWidth`、`onDropdownVisibleChange`、`bordered`。',
  '',
  'antd 6 已废弃 `Select.Option` 和 `Select.OptGroup`，这里不再挂这两个静态属性。选项写进 `options`。分组时，组名用 `label`，子项放进该组的 `options`：',
  '',
  '```tsx',
  '<Select',
  '  options={[',
  '    {',
  "      label: '水果',",
  '      options: [',
  "        { value: 'apple', label: '苹果' },",
  "        { value: 'pear', label: '梨' },",
  '      ],',
  '    },',
  '  ]}',
  '/>',
  '```',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| size | 框高与字号 | `small` \\| `medium` \\| `large` | `medium` |',
  '| checkbox | 下拉项改用左侧勾选框，并去掉右侧对勾。只在 `multiple` 或 `tags` 时生效，不传 `mode` 时忽略。不传时用右侧对勾。勾选框使用组件库的 Checkbox | `boolean` | `false` |',
  '| onOptionDelete | 传入后，悬浮或键盘高亮未选中且未禁用的项才出现垃圾桶。点击，或在该项高亮且搜索框为空时按 Delete，只回调该项，不改选中值和 `options`。垃圾桶是组件库的 Button，只放图标 | `(option) => void` | - |',
  '',
  '多选和 tags 的已选值默认用组件库的 Tag。单选有展开箭头，多选和 tags 默认没有。`suffixIcon`、`optionRender`、`tagRender`、`notFoundContent` 有传入时用调用处的。',
  '',
  '组件 token 用 `ConfigProvider` 的 `theme.components.YakitSelect`，字段与 antd Select 的组件 token 相同。没传的项用组件库默认值，传了的项用传入值。',
].join('\n')

const meta: Meta<typeof Select> = {
  title: 'YakitUi/数据录入/Select',
  component: Select,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: COMPONENT_DOCS,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      description: '选择框尺寸',
      table: { defaultValue: { summary: 'medium' } },
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    checkbox: {
      description: '下拉项用左侧勾选框。只在 multiple 或 tags 时生效，不传 mode 时忽略。勾选框使用组件库的 Checkbox',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    allowClear: {
      description: '是否可清空',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    disabled: {
      description: '是否禁用',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    mode: {
      description: '选择模式',
      control: { type: 'select' },
      options: [undefined, 'multiple', 'tags'],
    },
    placeholder: { control: 'text', description: '占位文案' },
    options: { control: false, description: '选项数据' },
    onChange: { action: 'changed', description: '选中变化' },
    onOptionDelete: {
      description:
        '删除下拉项。不传时下拉项没有垃圾桶。悬浮或键盘高亮时出现，高亮且搜索框为空时按 Delete 同样回调。垃圾桶是组件库的 Button，只放图标',
    },
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

const quiet = { controls: { disable: true } }

export const 总览: Story = {
  args: {
    options: OPTIONS,
    placeholder: '请选择',
    allowClear: false,
    disabled: false,
    checkbox: false,
    onOptionDelete: undefined,
    style: fieldStyle,
  },
}

export const 尺寸: Story = {
  parameters: {
    controls: quiet.controls,
    docs: {
      description: { story: '三档框高 24 / 28 / 32。不传 size 时为 medium。' },
    },
  },
  render: () => (
    <div style={rowStyle}>
      <Select options={OPTIONS} placeholder="Small" size="small" style={fieldStyle} />
      <Select options={OPTIONS} placeholder="Medium" size="medium" style={fieldStyle} />
      <Select options={OPTIONS} placeholder="Large" size="large" style={fieldStyle} />
    </div>
  ),
}

export const 状态: Story = {
  parameters: {
    controls: quiet.controls,
    docs: {
      description: {
        story: '悬停和聚焦看边框与光环。错误、警告、禁用是静止态。',
      },
    },
  },
  render: () => (
    <div style={rowStyle}>
      <Select options={OPTIONS} placeholder="默认" style={fieldStyle} />
      <Select options={OPTIONS} placeholder="错误" status="error" style={fieldStyle} />
      <Select options={OPTIONS} placeholder="警告" status="warning" style={fieldStyle} />
      <Select options={OPTIONS} placeholder="禁用" disabled style={fieldStyle} />
      <Select options={OPTIONS} defaultValue="apple" disabled style={fieldStyle} />
    </div>
  ),
}

export const 形态: Story = {
  name: 'variant',
  parameters: {
    controls: quiet.controls,
    docs: {
      description: {
        story:
          'variant 只改边框形态，不影响选择行为。outlined 是四周边框，filled 是浅底，borderless 没有边框，underlined 只留底边。不传时是 outlined。',
      },
    },
  },
  render: () => (
    <div style={rowStyle}>
      <Select options={OPTIONS} placeholder="outlined" variant="outlined" style={fieldStyle} />
      <Select options={OPTIONS} placeholder="filled" variant="filled" style={fieldStyle} />
      <Select options={OPTIONS} placeholder="borderless" variant="borderless" style={fieldStyle} />
      <Select options={OPTIONS} placeholder="underlined" variant="underlined" style={fieldStyle} />
    </div>
  ),
}

export const 单选: Story = {
  parameters: {
    controls: quiet.controls,
    docs: { description: { story: '单选带箭头。展开后箭头向上，选中项为主色字和浅主色底。' } },
  },
  render: () => (
    <div style={rowStyle}>
      <Select options={OPTIONS} placeholder="未选择" style={fieldStyle} />
      <Select options={OPTIONS} defaultValue="pear" style={fieldStyle} />
      <Select options={OPTIONS} defaultValue="pear" allowClear style={fieldStyle} />
    </div>
  ),
}

export const 多选: Story = {
  parameters: {
    controls: quiet.controls,
    docs: {
      description: {
        story:
          '多选没有默认箭头。已选值用组件库的 Tag。左边用右侧对勾，右边传入 checkbox 后，下拉项左侧是组件库的 Checkbox。',
      },
    },
  },
  render: () => (
    <div style={rowStyle}>
      <Select mode="multiple" options={OPTIONS} placeholder="右侧对勾" style={fieldStyle} />
      <Select checkbox mode="multiple" options={OPTIONS} placeholder="左侧勾选框" style={fieldStyle} />
      <Select mode="multiple" options={OPTIONS} defaultValue={['apple', 'pear']} allowClear style={fieldStyle} />
    </div>
  ),
}

export const 标签: Story = {
  name: 'tags',
  parameters: {
    controls: quiet.controls,
    docs: {
      description: {
        story: 'tags 可以输入选项里没有的值。下拉选中项用右侧对勾。已选值用组件库的 Tag。',
      },
    },
  },
  render: () => (
    <Select mode="tags" options={OPTIONS} defaultValue={['apple']} placeholder="输入或选择" style={{ width: 360 }} />
  ),
}

const DeletableSelect = (props: SelectProps) => {
  const [options, setOptions] = useState(OPTIONS.filter((item) => !item.disabled))
  return (
    <Select
      {...props}
      options={options}
      style={{ width: 360 }}
      onOptionDelete={(option) => {
        setOptions((current) => current.filter((item) => item.value !== option.value))
      }}
    />
  )
}

export const 选项删除: Story = {
  parameters: {
    controls: quiet.controls,
    docs: {
      description: {
        story:
          '左边不传 onOptionDelete，下拉项没有垃圾桶。右边传入后，悬浮或键盘高亮未选中且未禁用的项才出现垃圾桶。高亮且搜索框为空时按 Delete 同样回调。已选中的项不显示。回调里由调用处自己改 options。垃圾桶是组件库的 Button，只放图标。',
      },
    },
  },
  render: () => (
    <div style={rowStyle}>
      <Select options={OPTIONS} defaultValue="apple" placeholder="没有删除" style={fieldStyle} />
      <DeletableSelect options={OPTIONS} defaultValue="apple" />
    </div>
  ),
}

export const 自定义渲染: Story = {
  parameters: {
    controls: quiet.controls,
    docs: {
      description: {
        story: 'tagRender、notFoundContent、suffixIcon 和 optionRender 都保留调用处的内容。',
      },
    },
  },
  render: () => (
    <div style={rowStyle}>
      <Select
        mode="multiple"
        options={OPTIONS}
        defaultValue={['apple']}
        tagRender={(tag) => <span data-testid="custom-tag">{tag.label as never}</span>}
        style={fieldStyle}
      />
      <Select options={[]} notFoundContent="没有匹配项" placeholder="空数据" style={fieldStyle} />
      <Select options={OPTIONS} suffixIcon={null} placeholder="没有箭头" style={fieldStyle} />
      <Select
        mode="multiple"
        options={OPTIONS}
        optionRender={(option) => <span>自定义 {option.label as never}</span>}
        placeholder="自定义选项"
        style={fieldStyle}
      />
    </div>
  ),
}

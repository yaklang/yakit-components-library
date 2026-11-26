import { ArgTypes, Canvas, Description, Heading, Stories, Title } from '@storybook/blocks'
import type { Meta, StoryObj } from '@storybook/react'
import { Input } from '@yakit-libs/yakit-ui'
import type { InputProps, SearchProps } from '@yakit-libs/yakit-ui'
import type { ElementType } from 'react'

const inputLayout = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
  width: '400px',
}

const searchLayout = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '16px',
  width: '304px',
}

// Storybook 8.6's Docs blocks resolve against its React type graph while this package
// compiles with the workspace React types. Keep the boundary local to documentation.
const DocsArgTypes = ArgTypes as unknown as ElementType
const DocsCanvas = Canvas as unknown as ElementType
const DocsDescription = Description as unknown as ElementType
const DocsHeading = Heading as unknown as ElementType
const DocsStories = Stories as unknown as ElementType
const DocsTitle = Title as unknown as ElementType

function InputDocsPage() {
  return (
    <>
      <DocsTitle />
      <DocsDescription />

      <DocsHeading>Input 属性</DocsHeading>
      <DocsCanvas of={Default} />
      <DocsArgTypes />

      <DocsHeading>Input.Search 属性</DocsHeading>
      <p>
        Search 继承 Input 的基础属性；下表仅列出搜索场景新增或有差异的属性。新代码使用
        <code>Input.Search</code>，旧版 <code>SearchInput</code> 仅保留运行时兼容。
      </p>
      <DocsCanvas of={SearchDefault} />
      <DocsArgTypes of={SearchDefault} />

      <DocsHeading>全部示例</DocsHeading>
      <DocsStories includePrimary={false} />
    </>
  )
}

const meta: Meta<typeof Input> = {
  title: 'YakitUi/通用/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '文本输入与搜索输入属于同一 Input 组件族。搜索请使用 `Input.Search`；`SearchInput` 仅作为兼容入口保留。',
      },
      page: InputDocsPage,
    },
  },
  tags: ['autodocs'],
  args: { placeholder: '请输入...', size: 'large', style: { width: '400px' } },
  argTypes: {
    value: {
      control: 'text',
      description: '受控输入值；与 `onChange` 配合使用。',
      table: { type: { summary: 'string' } },
    },
    defaultValue: {
      control: 'text',
      description: '非受控模式的初始值。',
      table: { type: { summary: 'string' } },
    },
    placeholder: {
      control: 'text',
      description: '输入为空时显示的提示文本。',
      table: { type: { summary: 'string' }, defaultValue: { summary: '—' } },
    },
    disabled: {
      control: 'boolean',
      description: '禁用输入及所有交互。',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    readOnly: {
      control: 'boolean',
      description: '只读但仍可聚焦、选择和复制内容。',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    allowClear: {
      control: 'boolean',
      description: '显示清除按钮；也可传入 `{ clearIcon }` 自定义图标。',
      table: {
        type: { summary: 'boolean | { clearIcon?: ReactNode }' },
        defaultValue: { summary: 'false' },
      },
    },
    maxLength: {
      control: 'number',
      description: '允许输入的最大字符数。受控模式下值可以暂时超过该长度。',
      table: { type: { summary: 'number' } },
    },
    count: {
      control: false,
      description: '字符计数配置，可设置最大长度、计数策略和格式化展示。',
      table: { type: { summary: 'CountConfig' } },
    },
    showCount: {
      control: false,
      description: '显示字符计数。此兼容属性已由 `count` 取代。',
      table: { type: { summary: 'boolean | { formatter }' } },
    },
    size: {
      control: 'select',
      options: ['small', 'medium', 'large', 'middle'],
      description: '`middle` 是 Ant Design 6.5 的兼容别名，视觉上等同 `medium`。',
      table: {
        type: { summary: "'small' | 'medium' | 'large' | 'middle'" },
        defaultValue: { summary: 'large' },
      },
    },
    status: {
      control: 'select',
      options: [undefined, 'error', 'warning'],
      description: '校验状态。显式传入时优先于兼容属性 `error`。',
      table: { type: { summary: "'error' | 'warning'" } },
    },
    error: {
      control: 'boolean',
      description: '兼容属性，等效于未传 `status` 时的 `status="error"`；新代码请直接使用 `status`。',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    variant: {
      control: 'select',
      options: ['outlined', 'filled', 'borderless', 'underlined'],
      description: '输入框的视觉变体。',
      table: {
        type: { summary: "'outlined' | 'filled' | 'borderless' | 'underlined'" },
        defaultValue: { summary: 'outlined' },
      },
    },
    prefix: {
      control: false,
      description: '输入区域左侧的前缀内容。',
      table: { type: { summary: 'ReactNode' } },
    },
    suffix: {
      control: false,
      description: '输入区域右侧的后缀内容。',
      table: { type: { summary: 'ReactNode' } },
    },
    autoComplete: {
      control: 'text',
      description: '原生浏览器自动填充提示。',
      table: { type: { summary: 'string' } },
    },
    autoFocus: {
      control: 'boolean',
      description: '组件挂载后自动聚焦。',
      table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    onChange: {
      action: 'change',
      description: '输入值变化时触发，业务值请从 `event.target.value` 读取。',
      table: { type: { summary: '(event: ChangeEvent<HTMLInputElement>) => void' } },
    },
    onPressEnter: {
      action: 'pressEnter',
      description: '输入框按下 Enter 时触发。',
      table: { type: { summary: '(event: KeyboardEvent<HTMLInputElement>) => void' } },
    },
    onClear: {
      action: 'clear',
      description: '通过清除按钮清空值后触发。',
      table: { type: { summary: '() => void' } },
    },
    onInput: {
      action: 'input',
      description: '原生输入事件回调；一般业务场景优先使用 `onChange`。',
      table: { type: { summary: '(event: FormEvent<HTMLInputElement>) => void' } },
    },
    classNames: {
      control: false,
      description: '按语义 DOM 插槽附加 className。',
      table: { type: { summary: 'SemanticClassNames' } },
    },
    styles: {
      control: false,
      description: '按语义 DOM 插槽附加内联样式。',
      table: { type: { summary: 'SemanticStyles' } },
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>
type SearchStory = StoryObj<typeof Input.Search>

const searchArgTypes: SearchStory['argTypes'] = {
  value: {
    control: 'text',
    description: '受控搜索词；搜索值变化仍通过 `onChange` 通知。',
    table: { type: { summary: 'string' } },
  },
  defaultValue: {
    control: 'text',
    description: '非受控搜索词的初始值。',
    table: { type: { summary: 'string' } },
  },
  placeholder: {
    control: 'text',
    description: '搜索框为空时显示的提示文本。',
    table: { type: { summary: 'string' }, defaultValue: { summary: '—' } },
  },
  size: {
    control: 'select',
    options: ['small', 'medium', 'large', 'huge', 'middle'],
    description: '搜索尺寸；默认 `medium`。`huge` 使用 Yakit 的 32px 视觉尺寸。',
    table: {
      type: { summary: "'small' | 'medium' | 'large' | 'huge' | 'middle'" },
      defaultValue: { summary: 'medium' },
    },
  },
  variant: {
    control: 'select',
    options: ['box', 'main-bg', 'dropdown', 'outlined', 'filled', 'borderless', 'underlined'],
    description: '`box`、`main-bg`、`dropdown` 是 Yakit 搜索视觉变体；其余值透传 Ant Design Input。',
    table: {
      type: {
        summary: "'box' | 'main-bg' | 'dropdown' | 'outlined' | 'filled' | 'borderless' | 'underlined'",
      },
      defaultValue: { summary: 'box' },
    },
  },
  iconPosition: {
    control: 'select',
    options: ['front', 'back', 'both'],
    description: '自定义搜索图标位于输入内容的前方、后方或两侧。',
    table: { type: { summary: "'front' | 'back' | 'both'" } },
  },
  icon: {
    control: false,
    description: '自定义搜索图标；传 `false` 可隐藏默认图标。',
    table: { type: { summary: 'ReactNode | false' } },
  },
  enterButton: {
    control: false,
    description: '右侧搜索操作内容。`main-bg` 与 `dropdown` 默认显示可访问的搜索按钮。',
    table: { type: { summary: 'ReactNode' } },
  },
  searchIcon: {
    control: false,
    description: '传给 Ant Design Search 的搜索图标；未传时由 `icon` 与 `iconPosition` 决定。',
    table: { type: { summary: 'ReactNode' } },
  },
  selector: {
    control: false,
    description: 'Dropdown 搜索范围选择器，支持受控/非受控 value、options 和 onChange；改变选项不会触发搜索。',
    table: { type: { summary: 'SearchSelectorProps' } },
  },
  dropdownLabel: {
    control: false,
    description: '静态 Dropdown 标签。此兼容属性已由可编辑的 `selector` 取代。',
    table: { type: { summary: 'ReactNode' }, defaultValue: { summary: '关键词' } },
  },
  prefix: {
    control: false,
    description: '搜索内容左侧的前缀；与前置图标一起渲染。',
    table: { type: { summary: 'ReactNode' } },
  },
  suffix: {
    control: false,
    description: '搜索内容右侧的后缀。',
    table: { type: { summary: 'ReactNode' } },
  },
  allowClear: {
    control: 'boolean',
    description: '显示清除按钮；清除时 `onSearch` 的 source 为 `clear`。',
    table: {
      type: { summary: 'boolean | { clearIcon?: ReactNode }' },
      defaultValue: { summary: 'false' },
    },
  },
  disabled: {
    control: 'boolean',
    description: '禁用搜索输入、选择器和搜索操作。',
    table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
  },
  status: {
    control: 'select',
    options: [undefined, 'error', 'warning'],
    description: '搜索输入的校验状态，优先于兼容属性 `error`。',
    table: { type: { summary: "'error' | 'warning'" } },
  },
  error: {
    control: 'boolean',
    description: '兼容属性。未传 `status` 时映射为 `status="error"`。',
    table: { type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
  },
  onChange: {
    action: 'change',
    description: '搜索词变化时触发；选择器变化不会触发此回调。',
    table: { type: { summary: '(event: ChangeEvent<HTMLInputElement>) => void' } },
  },
  onSearch: {
    action: 'search',
    description: '点击搜索、按 Enter 或清除时触发：`(value, event, { source })`，source 为 `input` 或 `clear`。',
    table: {
      type: {
        summary: "(value: string, event?: Event, info?: { source: 'input' | 'clear' }) => void",
      },
    },
  },
  onPressEnter: {
    action: 'pressEnter',
    description: '输入框按 Enter 时触发；Search 同时会按 Ant Design 语义触发 `onSearch`。',
    table: { type: { summary: '(event: KeyboardEvent<HTMLInputElement>) => void' } },
  },
  onClear: {
    action: 'clear',
    description: '通过清除按钮清空搜索词后触发。',
    table: { type: { summary: '() => void' } },
  },
  classNames: {
    control: false,
    description: '按 Input.Search 的语义 DOM 插槽附加 className。',
    table: { type: { summary: 'SemanticClassNames' } },
  },
  styles: {
    control: false,
    description: '按 Input.Search 的语义 DOM 插槽附加内联样式。',
    table: { type: { summary: 'SemanticStyles' } },
  },
}

export const Default: Story = {}

export const Sizes: Story = {
  render: (args: InputProps) => (
    <div style={inputLayout}>
      <Input {...args} size="small" placeholder="Small" />
      <Input {...args} size="medium" placeholder="Medium" />
      <Input {...args} size="large" placeholder="Large" />
    </div>
  ),
}

export const Error: Story = {
  args: { error: true, value: '这里是内容', readOnly: true },
}

export const Disabled: Story = {
  args: { disabled: true },
}

export const Variants: Story = {
  render: (args: InputProps) => (
    <div style={inputLayout}>
      <Input {...args} placeholder="Outlined" variant="outlined" />
      <Input {...args} placeholder="Filled" variant="filled" />
      <Input {...args} placeholder="Borderless" variant="borderless" />
      <Input {...args} placeholder="Underlined" variant="underlined" />
    </div>
  ),
}

export const AffixesAndClear: Story = {
  args: { allowClear: true, defaultValue: '可清除的内容', prefix: '¥', suffix: '元' },
}

export const TextArea: Story = {
  render: () => <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="支持自动高度" />,
}

export const Password: Story = {
  render: () => <Input.Password placeholder="请输入密码" visibilityToggle={{ tabIndex: 0 }} />,
}

export const OTP: Story = {
  render: () => <Input.OTP length={4} />,
}

export const FigmaStateMatrix: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Node 37277:17053 specimens use 400px layout width; the component itself remains caller-sized.',
      },
    },
  },
  render: () => (
    <div style={inputLayout}>
      <Input placeholder="Default" />
      <Input prefix="前" placeholder="Leading" />
      <Input placeholder="Trailing" suffix="后" />
      <Input prefix="前" placeholder="Both" suffix="后" />
      <Input prefix={<Input.Select aria-label="协议">https://</Input.Select>} placeholder="yaklang.com" />
      <Input prefix="$" placeholder="8,000.00" suffix={<Input.Select aria-label="币种">USD</Input.Select>} />
      <Input autoFocus defaultValue="Focus" />
      <Input defaultValue="Filled" variant="filled" />
      <Input defaultValue="Error" status="error" />
      <Input disabled value="Disabled" />
      <Input.TextArea defaultValue={'Area\nText'} />
    </div>
  ),
}

export const SearchDefault: SearchStory = {
  name: 'Search Default',
  args: { placeholder: '请输入关键词搜索' },
  argTypes: searchArgTypes,
  render: (args: SearchProps) => <Input.Search {...args} />,
}

export const SearchSizes: SearchStory = {
  name: 'Search Sizes',
  argTypes: searchArgTypes,
  render: (args: SearchProps) => (
    <div style={searchLayout}>
      <Input.Search {...args} size="small" />
      <Input.Search {...args} size="medium" />
      <Input.Search {...args} size="large" />
      <Input.Search {...args} size="huge" />
    </div>
  ),
}

export const SearchMainBackground: SearchStory = {
  name: 'Search Main Background',
  args: { placeholder: '请输入关键词搜索', variant: 'main-bg' },
  argTypes: searchArgTypes,
  render: (args: SearchProps) => <Input.Search {...args} />,
}

export const SearchDropdown: SearchStory = {
  name: 'Search Dropdown',
  args: { dropdownLabel: '关键词', placeholder: '请输入关键词搜索', variant: 'dropdown' },
  argTypes: searchArgTypes,
  render: (args: SearchProps) => <Input.Search {...args} />,
}

export const SearchEditableDropdownSelector: SearchStory = {
  name: 'Search Editable Dropdown Selector',
  argTypes: searchArgTypes,
  render: () => (
    <div style={searchLayout}>
      <Input.Search
        placeholder="请输入关键词搜索"
        selector={{
          defaultValue: 'keyword',
          options: [
            { label: '关键词', value: 'keyword' },
            { label: '标题', value: 'title' },
          ],
        }}
        variant="dropdown"
      />
    </div>
  ),
}

export const SearchIconOnly: SearchStory = {
  name: 'Search Icon Only',
  argTypes: searchArgTypes,
  render: () => <Input.SearchTrigger aria-label="仅搜索图标" />,
}

export const SearchDisabled: SearchStory = {
  name: 'Search Disabled',
  args: { disabled: true, placeholder: '请输入关键词搜索' },
  argTypes: searchArgTypes,
  render: (args: SearchProps) => <Input.Search {...args} />,
}

export const FigmaSearchMatrix: SearchStory = {
  name: 'Search Figma State Matrix',
  argTypes: searchArgTypes,
  parameters: {
    docs: {
      description: {
        story:
          'Node 37285:27849 uses 216px Box/Main-bg and 304px Dropdown specimen widths; these widths belong to the story layout, not component defaults.',
      },
    },
  },
  render: () => (
    <div style={searchLayout}>
      <div style={{ width: '216px' }}>
        <Input.Search iconPosition="front" placeholder="请输入关键词搜索" variant="box" />
      </div>
      <div style={{ width: '216px' }}>
        <Input.Search iconPosition="back" placeholder="请输入关键词搜索" variant="box" />
      </div>
      <div style={{ width: '216px' }}>
        <Input.Search placeholder="请输入关键词搜索" variant="main-bg" />
      </div>
      <Input.Search
        placeholder="请输入关键词搜索"
        selector={{
          defaultValue: 'keyword',
          options: [
            { label: '关键词', value: 'keyword' },
            { label: '标题', value: 'title' },
          ],
        }}
        variant="dropdown"
      />
      <Input.Search autoFocus placeholder="Focus" />
      <Input.Search disabled value="Disabled" />
      <Input.SearchTrigger aria-label="Only icon" />
    </div>
  ),
}

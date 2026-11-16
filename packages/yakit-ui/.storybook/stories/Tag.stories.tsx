import type { Meta, StoryObj } from '@storybook/react';
import { ExclamationOutlined, ShieldCheckOutlined } from '@yakit-libs/yakit-ui-icons';
import { type CSSProperties, type MouseEvent, useState } from 'react';

import Tag from '../../src/components/Tag';
import type { CheckableTagOption, TagColor, TagVariant } from '../../src/components/Tag';

const DemoIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" width="1em" height="1em">
    <path
      d="M8 2.5 13.5 13h-11L8 2.5Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

const DemoAvatar = () => (
  <span
    style={{
      background: 'linear-gradient(135deg,#8ab4f8,#c58af9)',
      borderRadius: '50%',
      display: 'block',
      height: '100%',
      width: '100%',
    }}
  />
);

const COLORS: TagColor[] = [
  'default',
  'black',
  'primary',
  'error',
  'warning',
  'success',
  'purple',
  'magenta',
  'blue',
  'lake-blue',
  'cyan',
  'orange',
  'yellow',
];

const STATUS_COLORS: Array<{ color: TagColor; label: string }> = [
  { color: 'serious', label: '严重' },
  { color: 'high', label: '高危' },
  { color: 'medium', label: '中危' },
  { color: 'low', label: '低危' },
  { color: 'safe', label: '安全' },
  { color: 'unknown', label: '未知' },
];

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
  '进行标记和分类的小标签。',
  '',
  '## 何时使用',
  '',
  '- 标记事物的属性或维度。',
  '- 做分类、筛选或状态展示。',
  '',
  '## 代码演示',
  '',
  '下方按「总览（Controls）→ 尺寸 → 颜色 → 变体 → 图标/点/头像 → 可关闭 → 可复制 → 分栏（风险等级）→ 省略 → 可选择 → 禁用」组织示例。',
  '',
  '## API',
  '',
  '### Tag',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| size | 尺寸 | `small` \\| `medium` \\| `large` | `medium` |',
  '| color | 颜色（Figma TagColor；含风险色） | `TagColor` | `default` |',
  '| variant | 填充样式；传入 `extra` 分栏时运行时固定为 `soft` | `soft` \\| `solid` \\| `borderless` | `soft` |',
  '| bordered | 是否描边（仅 `soft` 生效；`solid` / `borderless` 下忽略） | `boolean` | `true` |',
  '| shape | 圆角形态 | `default` \\| `round` | `default` |',
  '| icon | 图标 | `ReactNode` | - |',
  '| avatar | 前置头像 | `ReactNode` | - |',
  '| dot | 前置状态点 | `boolean` | `false` |',
  '| copy | 是否显示复制；true 复制纯文本 children，或 { text } 指定文本（可与 closable 并排） | `boolean` \\| `{ text?: string }` | `false` |',
  '| onCopy | 复制结束回调（接入通知等）；info.ok 表示是否成功 | `(e, info) => void` | - |',
  '| closable | 是否可关闭 | `boolean` | `false` |',
  '| closeIcon | 自定义关闭图标；`true` / 未传时用默认 ×。函数会先调用，再用返回的节点 | `ReactNode` \\| `boolean` \\| `((props: any) => ReactNode)` | - |',
  '| onClose | 关闭回调；`e.preventDefault()` 可阻止关闭 | `(e) => void` | - |',
  '| onClick | 点击回调；`checkable` 时在切换选中后触发 | `(e) => void` | - |',
  '| checkable | 可选择模式 | `boolean` | `false` |',
  '| checked | 受控选中 | `boolean` | - |',
  '| defaultChecked | 非受控默认选中（`Tag.CheckableTag` 不支持） | `boolean` | `false` |',
  '| onChange | 选中变化（仅 `checkable`） | `(checked: boolean) => void` | - |',
  '| disabled | 禁用 | `boolean` | `false` |',
  '| ellipsis | 单行省略（需限宽；分栏时左右两侧均省略）；仅截断时设 `title` | `boolean` | `false` |',
  '| extra | 右侧附加内容；启用左右分栏（左彩色软底 / 右白底）；分栏仅 `soft` | `ReactNode` | - |',
  '| children | 内容 | `ReactNode` | - |',
  '| aria-label | 仅图标标签的无障碍名称 | `string` | - |',
  '',
  '### TagCopy / Tag.TagCopy',
  '',
  '独立复制按钮，可供 Tag 之外使用。属性：`copyText`（必填）、`color`（默认 `primary`；可传 CSS 色如 `#f60` / `var(--brand)`；Tag 内嵌传 `currentColor`）、`size`、`onCopy`、`disabled`、`className`。成功仅为图标反馈；文案通知请用 `onCopy`。',
  '',
  '### Tag.CheckableTag',
  '',
  '可通过 `CheckableTag` 实现类似 `Checkbox` 的效果，点击切换选中。',
  '',
  '> `CheckableTag` 为完全受控组件，不支持非受控用法。等价于 `<Tag checkable checked onChange />`。',
  '',
  '> 可选择支持 `soft` / `borderless`，不支持 `solid`（传入 `solid` 时运行时回落为 `borderless`）。未选中静态外观固定 soft/default（对齐 Figma），两档 variant 视觉差异很小。',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| checked | 选中状态（必填） | `boolean` | - |',
  '| onChange | 切换回调 | `(checked: boolean) => void` | - |',
  '| variant | 填充样式（仅 soft / borderless） | `soft` \\| `borderless` | `soft` |',
  '',
  '其余属性同 Tag（不含 `checkable` / `defaultChecked`）。',
  '',
  '### Tag.CheckableTagGroup',
  '',
  '`CheckableTagGroup` 提供类似 `CheckboxGroup` 或 `RadioGroup` 的功能。',
  '',
  '| 参数 | 说明 | 类型 | 默认值 |',
  '| --- | --- | --- | --- |',
  '| options | 选项列表；项可设 `disabled`、`color?` 覆盖选中色 | `Array<{ label; value; className?; style?; disabled?; color? } \\| string \\| number>` | - |',
  '| color | 选中色（未选中 hover 亦读此色 border token） | `TagColor` | `primary` |',
  '| value | 选中值；单选可取消为 `null`，多选为数组 | `T \\| T[] \\| null` | - |',
  '| defaultValue | 初始选中值 | 同上 | - |',
  '| onChange | 选中变化 | `(value) => void` | - |',
  '| multiple | 多选模式；默认单选 | `boolean` | `false` |',
  '| disabled | 禁用整组；单项请用 `options[].disabled` | `boolean` | - |',
].join('\n');

const meta: Meta<typeof Tag> = {
  title: 'YakitUi/通用/Tag',
  component: Tag,
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
      description: '标签尺寸',
      table: { defaultValue: { summary: 'medium' } },
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
    color: {
      description: '标签颜色（Figma TagColor）',
      table: { defaultValue: { summary: 'default' } },
      control: { type: 'select' },
      options: [...COLORS, 'serious', 'high', 'medium', 'low', 'safe', 'unknown'],
    },
    variant: {
      description: '填充样式；分栏（extra）时固定 soft',
      table: { defaultValue: { summary: 'soft' } },
      control: { type: 'select' },
      options: ['soft', 'solid', 'borderless'],
    },
    bordered: {
      description: '是否描边（仅 soft）',
      control: { type: 'boolean' },
      table: { defaultValue: { summary: 'true' } },
    },
    shape: {
      description: '圆角形态',
      table: { defaultValue: { summary: 'default' } },
      control: { type: 'select' },
      options: ['default', 'round'],
    },
    dot: { control: 'boolean', description: '前置状态点' },
    copy: { control: 'boolean', description: '是否可复制（高级用法传 { text }）' },
    closable: { control: 'boolean', description: '是否可关闭' },
    closeIcon: { control: false, description: '自定义关闭图标' },
    checkable: { control: 'boolean', description: '可选择模式' },
    checked: { control: 'boolean', description: '受控选中态' },
    disabled: { control: 'boolean', description: '是否禁用' },
    icon: { control: false, description: '图标' },
    avatar: { control: false, description: '前置头像' },
    extra: {
      control: 'text',
      description: '右侧附加内容（分栏；仅 soft）。清空 / 空串不启用分栏',
    },
    children: { control: 'text', description: '标签内容' },
    ellipsis: {
      control: 'boolean',
      description: '长文案单行省略（需限宽；分栏时左右两侧均省略）。开启后仅在实际截断时设置 title',
      table: { defaultValue: { summary: 'false' } },
    },
    onClose: { action: 'closed', description: '关闭回调' },
    onClick: { action: 'clicked', description: '点击回调' },
    onChange: { action: 'changed', description: '选中变化回调' },
  },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 总览：绑定 Controls 的可调示例 */
export const Overview: Story = {
  name: '总览',
  parameters: {
    docs: {
      description: {
        story: '单个标签；下方 Controls 可改颜色、尺寸、变体等。',
      },
    },
  },
  args: {
    children: '标签',
    size: 'medium',
    color: 'primary',
    variant: 'soft',
    shape: 'default',
    bordered: true,
    closable: false,
    copy: false,
    disabled: false,
    dot: false,
    ellipsis: false,
  },
};

/** 尺寸 */
export const Sizes: Story = {
  name: '尺寸',
  render: (args) => (
    <div style={rowStyle}>
      <Tag {...args} size="small">
        small
      </Tag>
      <Tag {...args} size="medium">
        medium
      </Tag>
      <Tag {...args} size="large">
        large
      </Tag>
    </div>
  ),
};

/** 颜色：主题色 + 风险色 */
export const Colors: Story = {
  name: '颜色',
  parameters: {
    docs: {
      description: {
        story:
          '颜色使用 Figma `TagColor` 命名（无 antd 色名别名）。下方为扩展色板与风险 / 状态等级（`--Colors-Use-Status-*`）。',
      },
    },
  },
  render: (args) => (
    <div style={colStyle}>
      <div style={rowStyle}>
        <span style={labelStyle}>主题色</span>
        {COLORS.map((color) => (
          <Tag key={color} {...args} color={color}>
            {color}
          </Tag>
        ))}
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>风险色</span>
        {STATUS_COLORS.map(({ color, label }) => (
          <Tag key={color} {...args} color={color} dot>
            {label}
          </Tag>
        ))}
      </div>
    </div>
  ),
};

/** 变体：soft / solid / borderless，以及 bordered、round */
export const Variants: Story = {
  name: '变体',
  parameters: {
    docs: {
      description: {
        story:
          '`soft` 浅色填充+边框；`solid` 实色填充；`borderless` 浅色无边框。`bordered` 仅在 `soft` 下生效；无边框软底更推荐 `variant="borderless"`。`shape="round"` 为胶囊圆角。',
      },
    },
  },
  render: () => (
    <div style={colStyle}>
      {(['soft', 'solid', 'borderless'] as TagVariant[]).map((variant) => (
        <div key={variant} style={rowStyle}>
          <span style={labelStyle}>{variant}</span>
          <Tag color="primary" variant={variant}>
            小圆角
          </Tag>
          <Tag color="primary" variant={variant} shape="round">
            全圆角
          </Tag>
          {variant === 'soft' ? (
            <>
              <Tag color="primary" variant="soft" bordered>
                有边框
              </Tag>
              <Tag color="primary" variant="soft" bordered={false}>
                无边框
              </Tag>
            </>
          ) : null}
        </div>
      ))}
    </div>
  ),
};

/** 图标 / 状态点 / 头像 / 仅图标 */
export const Content: Story = {
  name: '图标 / 点 / 头像',
  parameters: {
    docs: {
      description: {
        story:
          '支持前置 `dot`、`icon`、`avatar`。仅图标时请传 `aria-label`。图标未显式设色时会继承标签文字色。',
      },
    },
  },
  render: () => (
    <div style={rowStyle}>
      <Tag color="primary">文本</Tag>
      <Tag color="primary" dot>
        状态点
      </Tag>
      <Tag color="primary" icon={<DemoIcon />}>
        图标
      </Tag>
      <Tag color="primary" avatar={<DemoAvatar />}>
        头像
      </Tag>
      <Tag color="primary" icon={<DemoIcon />} aria-label="仅图标" />
      <Tag color="serious" dot icon={<ExclamationOutlined color="currentColor" />}>
        点+图标
      </Tag>
    </div>
  ),
};

/** 可关闭 */
export const Closable: Story = {
  name: '可关闭',
  parameters: {
    docs: {
      description: {
        story:
          '`closable` 显示关闭按钮。`onClose` 中调用 `e.preventDefault()` 可阻止关闭。可通过 `closeIcon` 自定义关闭图标。',
      },
    },
  },
  render: function ClosableRender(args) {
    const preventClose = (e: MouseEvent<HTMLElement>) => {
      e.preventDefault();
    };
    return (
      <div style={rowStyle}>
        <Tag {...args} closable onClose={args.onClose}>
          可关闭
        </Tag>
        <Tag {...args} closable color="primary" onClose={args.onClose}>
          主色
        </Tag>
        <Tag closable color="high" dot onClose={args.onClose}>
          高危
        </Tag>
        <Tag closable onClose={preventClose}>
          阻止关闭
        </Tag>
        <Tag
          closable
          closeIcon={<ExclamationOutlined color="currentColor" />}
          onClose={args.onClose}
        >
          自定义关闭图标
        </Tag>
      </div>
    );
  },
};

/** 可复制 */
export const Copyable: Story = {
  name: '可复制',
  parameters: {
    docs: {
      description: {
        story:
          '开启 `copy` 后显示复制按钮。`copy={true}` 时复制纯文本 children；`copy={{ text }}` 指定剪贴板文本（无 children 时亦作展示）。成功后仅图标反馈（loading → 对勾）；文案通知请用 `onCopy`。亦可使用独立的 `TagCopy` / `Tag.TagCopy`（默认主色，或传 CSS 色）。可与 `closable` 并排。',
      },
    },
  },
  render: (args) => (
    <div style={colStyle}>
      <div style={rowStyle}>
        <Tag {...args} color="blue" copy={{ text: 'chmod +rw /dev/bpf*' }} />
        <Tag color="primary" copy={{ text: 'hello-tag' }}>
          展示与复制可不同
        </Tag>
        <Tag color="success" copy>
          复制 children
        </Tag>
        <Tag color="warning" copy={{ text: 'both' }} closable onClose={args.onClose}>
          复制+关闭
        </Tag>
        <Tag color="purple" copy={{ text: 'disabled-copy' }} disabled>
          禁用
        </Tag>
      </div>
      <div style={{ ...colStyle, gap: 8 }}>
        <span style={labelStyle}>独立按钮（默认主色 / 自定义色 / size）</span>
        <div style={rowStyle}>
          <Tag.TagCopy copyText="c-default" size="medium" />
          <span style={{ fontSize: 12, color: 'var(--Colors-Use-Main-Primary)' }}>
            默认 primary
          </span>
          <Tag.TagCopy copyText="c-css" color="#722ED1" size="medium" />
          <span style={{ fontSize: 12, color: '#722ED1' }}>color="#722ED1"</span>
          <Tag.TagCopy copyText="c-var" color="var(--Colors-Use-Success-Primary)" size="medium" />
          <span style={{ fontSize: 12, color: 'var(--Colors-Use-Success-Primary)' }}>
            color="var(--Colors-Use-Success-Primary)"
          </span>
          <span style={{ color: '#1677ff' }}>
            <Tag.TagCopy copyText="c-inherit" color="currentColor" size="medium" />
          </span>
          <span style={{ fontSize: 12, color: '#1677ff' }}>currentColor</span>
        </div>
        <div style={rowStyle}>
          <Tag.TagCopy copyText="s-sm" size="small" />
          <span style={{ fontSize: 12 }}>small</span>
          <Tag.TagCopy copyText="s-md" size="medium" />
          <span style={{ fontSize: 12 }}>medium</span>
          <Tag.TagCopy copyText="s-lg" size="large" />
          <span style={{ fontSize: 12 }}>large</span>
        </div>
      </div>
    </div>
  ),
};

/** 分栏 extra — 对齐 Figma 漏洞风险等级（左 soft | 竖线 | 右白底） */
const RISK_LEVELS: Array<{ color: TagColor; label: string }> = [
  { color: 'serious', label: '严重' },
  { color: 'high', label: '高危' },
  { color: 'medium', label: '中危' },
  { color: 'low', label: '低危' },
  { color: 'safe', label: '安全' },
];

export const ExtraSplit: Story = {
  name: '分栏',
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        story:
          '传入 `extra` 后左右分栏：左侧彩色软底 | 竖线 | 右侧白底。分栏仅 `soft`。可与 `closable`、`shape="round"`、`dot` / `icon` 组合。',
      },
    },
  },
  render: () => (
    <div style={colStyle}>
      <span style={labelStyle}>风险等级</span>
      <div style={rowStyle}>
        {RISK_LEVELS.map(({ color, label }) => (
          <Tag key={color} color={color} size="large" variant="soft" extra="9.8">
            {label}
          </Tag>
        ))}
      </div>
      <span style={labelStyle}>可关闭 · 全圆角 · 点 / 图标</span>
      <div style={rowStyle}>
        <Tag color="serious" size="large" variant="soft" extra="9.8" closable>
          严重
        </Tag>
        <Tag color="high" size="large" variant="soft" shape="round" extra="9.8">
          高危
        </Tag>
        <Tag color="medium" size="large" variant="soft" dot extra="9.8">
          中危
        </Tag>
        <Tag
          color="low"
          size="large"
          variant="soft"
          icon={<ExclamationOutlined color="currentColor" />}
          extra="9.8"
        >
          低危
        </Tag>
        <Tag
          color="safe"
          size="large"
          variant="soft"
          icon={<ShieldCheckOutlined color="currentColor" />}
          extra="9.8"
          aria-label="安全"
        />
      </div>
    </div>
  ),
};

const LONG_TEXT =
  '这是一段很长的标签文案，用来演示换行与省略：超出宽度后可以自然折行，也可以单行显示省略号。';

/** 长文案：换行 / 省略 */
export const Ellipsis: Story = {
  name: '省略',
  parameters: {
    docs: {
      description: {
        story:
          '默认长文案换行。开启 `ellipsis` 后单行省略（需 `style.maxWidth` / 父级限宽）。分栏时左右两侧同时省略。仅在文案实际被截断时设置原生 `title`。',
      },
    },
  },
  render: () => (
    <div style={colStyle}>
      <div style={{ ...rowStyle, maxWidth: 280 }}>
        <span style={labelStyle}>默认换行</span>
        <Tag color="primary">{LONG_TEXT}</Tag>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>单行省略</span>
        <Tag ellipsis color="primary" style={{ maxWidth: 180 }}>
          {LONG_TEXT}
        </Tag>
        <Tag ellipsis color="error" closable style={{ maxWidth: 160 }}>
          {LONG_TEXT}
        </Tag>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>分栏省略</span>
        <Tag
          color="serious"
          size="large"
          variant="soft"
          ellipsis
          extra="这是一段很长的附加文案，右侧也应省略"
          style={{ maxWidth: 200 }}
        >
          这是一段很长的左侧标签文案，左侧也应省略
        </Tag>
      </div>
      <div style={{ ...rowStyle, maxWidth: 280 }}>
        <span style={labelStyle}>分栏换行</span>
        <Tag
          color="high"
          size="large"
          variant="soft"
          closable
          extra="右侧附加也很长，未开 ellipsis 时应换行显示"
        >
          左侧很长且可关闭，未开 ellipsis 时应换行显示
        </Tag>
      </div>
    </div>
  ),
};

/** 可选择：CheckableTag / Group 单选多选 / 单项禁用 / soft·borderless */
export const Checkable: Story = {
  name: '可选择',
  parameters: {
    docs: {
      description: {
        story:
          '`CheckableTag` 类似 Checkbox，点击切换选中（完全受控）。`CheckableTagGroup` 支持单选（可取消为 `null`）与多选。可选择仅支持 `soft` / `borderless`；未选中外观固定 soft/default。单项可用 `options[].disabled` / `options[].color`。',
      },
    },
  },
  render: function CheckableRender() {
    const tagsData: CheckableTagOption<string>[] = [
      { value: 'movies', label: '电影' },
      { value: 'books', label: '图书' },
      { value: 'music', label: '音乐' },
      { value: 'sports', label: '运动' },
    ];
    const [checkedSoft, setCheckedSoft] = useState(true);
    const [checkedBorderless, setCheckedBorderless] = useState(true);
    const [tagChecked, setTagChecked] = useState(false);
    const [singleValue, setSingleValue] = useState<string | null>('sports');
    const [multiValue, setMultiValue] = useState<string[]>(['movies', 'books', 'music', 'sports']);

    return (
      <div style={colStyle}>
        <div style={rowStyle}>
          <span style={labelStyle}>Checkable soft</span>
          <Tag.CheckableTag
            checked={checkedSoft}
            color="primary"
            variant="soft"
            onChange={setCheckedSoft}
          >
            选中
          </Tag.CheckableTag>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Checkable borderless</span>
          <Tag.CheckableTag
            checked={checkedBorderless}
            color="primary"
            variant="borderless"
            onChange={setCheckedBorderless}
          >
            选中
          </Tag.CheckableTag>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Tag checkable</span>
          <Tag checkable checked={tagChecked} color="success" onChange={setTagChecked}>
            受控
          </Tag>
          <Tag checkable defaultChecked color="warning">
            非受控默认选中
          </Tag>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>单选 Group</span>
          <Tag.CheckableTagGroup options={tagsData} value={singleValue} onChange={setSingleValue} />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>多选 Group</span>
          <Tag.CheckableTagGroup
            multiple
            options={tagsData}
            value={multiValue}
            onChange={setMultiValue}
          />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>单项禁用</span>
          <Tag.CheckableTagGroup<string>
            multiple
            options={[
              { value: 'movies', label: '电影' },
              { value: 'books', label: '图书', disabled: true },
              { value: 'music', label: '音乐', disabled: true },
              { value: 'sports', label: '运动' },
            ]}
            defaultValue={['movies', 'sports']}
          />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>整组禁用</span>
          <Tag.CheckableTagGroup disabled options={tagsData} defaultValue="sports" />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>自定义选中色</span>
          <Tag.CheckableTagGroup<string>
            color="success"
            options={[
              { value: 'movies', label: '电影' },
              { value: 'books', label: '图书', color: 'warning' },
              { value: 'music', label: '音乐' },
              { value: 'sports', label: '运动' },
            ]}
            defaultValue="movies"
          />
        </div>
      </div>
    );
  },
};

/** 禁用 */
export const Disabled: Story = {
  name: '禁用',
  parameters: {
    docs: {
      description: {
        story:
          '普通标签、可关闭、可选择均可禁用。Group 整组禁用见「可选择」示例；单项禁用用 `options[].disabled`。',
      },
    },
  },
  render: () => (
    <div style={rowStyle}>
      <Tag disabled>禁用</Tag>
      <Tag disabled color="primary">
        主色禁用
      </Tag>
      <Tag disabled closable>
        可关闭禁用
      </Tag>
      <Tag disabled color="serious" dot>
        风险色禁用
      </Tag>
      <Tag.CheckableTag checked disabled color="primary">
        可选择禁用
      </Tag.CheckableTag>
      <Tag disabled color="high" extra="9.8">
        分栏禁用
      </Tag>
    </div>
  ),
};

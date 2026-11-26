import type { Meta, StoryObj } from '@storybook/react'
import { Tree } from '@yakit-libs/yakit-ui'
import type { DirectoryTreeProps, WebsiteTreeDataNode, YakitTreeProps } from '@yakit-libs/yakit-ui'
import type { TreeDataNode } from 'antd'
import type { Key } from 'react'
import { useArgs } from 'storybook/internal/preview-api'

const SHOW_LINE_MAP = {
  关闭: false,
  '开启(无叶子图标)': { showLeafIcon: false },
  '开启(带叶子图标)': { showLeafIcon: true },
} as const

const resolveShowLine = (value: unknown): YakitTreeProps['showLine'] => {
  if (value === false || value === true) return value
  if (value && typeof value === 'object') return value as YakitTreeProps['showLine']
  if (typeof value === 'string' && value in SHOW_LINE_MAP) {
    return SHOW_LINE_MAP[value as keyof typeof SHOW_LINE_MAP]
  }
  return undefined
}

const DIRECTORY_EDITING = {
  关闭: null,
  'scripts.java': { key: 'script', title: 'scripts.java' },
  'extensions.yak': { key: 'yak', title: 'extensions.yak' },
  build: { key: 'build', title: 'build' },
} as const

type DirectoryStoryArgs = DirectoryTreeProps & {
  editing?: keyof typeof DIRECTORY_EDITING
}

const renameNode = (nodes: TreeDataNode[], key: Key, title: string): TreeDataNode[] =>
  nodes.map((node) => {
    if (node.key === key) return { ...node, title }
    if (!node.children?.length) return node
    return { ...node, children: renameNode(node.children, key, title) }
  })

const titleOf = (nodes: TreeDataNode[] | undefined, key: Key): string | undefined => {
  for (const node of nodes ?? []) {
    if (node.key === key) return String(node.title ?? '')
    const nested = titleOf(node.children, key)
    if (nested !== undefined) return nested
  }
  return undefined
}

const withResolvedShowLine = (
  args: DirectoryTreeProps,
  Component: typeof Tree | typeof Tree.WebsiteTree | typeof Tree.DirectoryTree = Tree,
) => {
  const showLine = resolveShowLine(args.showLine)
  if (Component === Tree.DirectoryTree) {
    return <Tree.DirectoryTree {...args} showLine={showLine} />
  }
  return <Component {...(args as YakitTreeProps)} showLine={showLine} />
}

const basicTreeData: TreeDataNode[] = [
  {
    title: 'parent 1',
    key: '0-0',
    children: [
      {
        title: 'parent 1-0',
        key: '0-0-0',
        disabled: true,
        children: [
          { title: 'leaf', key: '0-0-0-0', disableCheckbox: true },
          { title: 'leaf', key: '0-0-0-1' },
        ],
      },
      {
        title: 'parent 1-1',
        key: '0-0-1',
        children: [{ title: 'leaf', key: '0-0-1-0' }],
      },
    ],
  },
]

const websiteData: WebsiteTreeDataNode[] = [
  {
    key: 'host',
    title: 'http://127.0.0.1:8786',
    resourceType: 'dir',
    children: [
      {
        key: 'playground',
        title: 'bruteplayground/ [4]',
        resourceType: 'path',
        children: [
          {
            key: 'order',
            title: 'by-order-id',
            resourceType: 'path',
            children: [
              {
                key: 'query',
                title: '(x) GET 参数: orderId',
                resourceType: 'query',
                isLeaf: true,
              },
            ],
          },
        ],
      },
    ],
  },
]

const fileData: TreeDataNode[] = [
  {
    key: 'data',
    title: 'Data',
    children: [
      {
        key: 'build',
        title: 'build',
        children: [{ key: 'script', title: 'scripts.java', isLeaf: true }],
      },
      { key: 'yak', title: 'extensions.yak', isLeaf: true },
    ],
  },
]

const meta: Meta<typeof Tree> = {
  title: 'YakitUi/数据展示/Tree',
  component: Tree,
  tags: ['autodocs'],
  parameters: {
    controls: {
      include: [
        'treeData',
        'checkable',
        'selectable',
        'multiple',
        'disabled',
        'defaultExpandAll',
        'showLine',
        'showIcon',
        'draggable',
        'blockNode',
        'onSelect',
        'onCheck',
        'onExpand',
      ],
    },
    docs: {
      description: {
        component: '三种树：`Tree` 是默认树，`Tree.WebsiteTree` 是网站树，`Tree.DirectoryTree` 是文件目录树。',
      },
    },
  },
  argTypes: {
    treeData: {
      description: 'treeNodes 数据，如果设置则不需要手动构造 TreeNode 节点（key 在整个树范围内唯一）',
      control: false,
    },
    checkable: {
      description: '节点前添加 Checkbox 复选框',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    selectable: {
      description: '是否可选中',
      table: { defaultValue: { summary: 'true' } },
      control: { type: 'boolean' },
    },
    multiple: {
      description: '支持点选多个节点（节点本身）',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    disabled: {
      description: '将树禁用',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    defaultExpandAll: {
      description: '默认展开所有树节点',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    blockNode: {
      description: '是否节点占据一行。默认树不传为 false，网站树和目录树不传为 true。',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    showIcon: {
      description: '是否展示图标。默认树不传为 false。网站树不传为 true。目录树的图标由行自己画，传 false 才关掉。',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    showLine: {
      description: '是否展示连接线。默认树和目录树不传时没有线；网站树不传时有线，且不画叶子图标。',
      table: { defaultValue: { summary: '关闭' } },
      control: { type: 'radio' },
      options: ['关闭', '开启(无叶子图标)', '开启(带叶子图标)'],
    },
    draggable: {
      description: '设置节点可拖拽，可以通过 `icon: false` 关闭拖拽提示图标',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    onSelect: { action: 'select' },
    onCheck: { action: 'check' },
    onExpand: { action: 'expand' },
  },
}

export default meta

type Story = StoryObj<typeof Tree>

export const Default: Story = {
  name: '默认树',
  args: {
    checkable: true,
    defaultExpandAll: true,
    style: { width: 320 },
    treeData: basicTreeData,
  },
  render: (args) => withResolvedShowLine(args),
  parameters: {
    docs: {
      description: {
        story:
          '`Tree`。行结构与 antd Tree 相同，颜色用 Yakit 主题。不传 `showLine` 时没有连接线，不传 `showIcon` 时不画图标，不传 `blockNode` 时节点不占满一行。',
      },
    },
  },
}

export const Website: Story = {
  name: '网站树',
  args: {
    checkable: true,
    defaultExpandAll: true,
    showIcon: true,
    showLine: '开启(无叶子图标)' as unknown as YakitTreeProps['showLine'],
    style: { width: 360 },
    treeData: websiteData,
    blockNode: true,
  },
  argTypes: {
    blockNode: { table: { defaultValue: { summary: 'true' } } },
    showIcon: { table: { defaultValue: { summary: 'true' } } },
    showLine: { table: { defaultValue: { summary: '开启(无叶子图标)' } } },
  },
  render: (args) => withResolvedShowLine(args, Tree.WebsiteTree),
  parameters: {
    docs: {
      description: {
        story:
          '`Tree.WebsiteTree`。带竖线，选中整行是主色。`dir` 是文件夹开合，`path` 是链接，`query` 是参数，`file` 是文件。路径有子节点时仍用链接图标。种类写在 `resourceType` 或 `data.ResourceType`。不传时第一层是文件夹，中间有子节点的是链接，叶子是变量。节点自己的 `icon` 优先。',
      },
    },
  },
}

export const Directory: StoryObj<DirectoryStoryArgs> = {
  name: '目录树',
  args: {
    defaultExpandAll: true,
    draggable: { icon: false },
    editing: '关闭',
    selectDirectory: false,
    showIcon: true,
    showLine: '关闭' as unknown as YakitTreeProps['showLine'],
    blockNode: true,
    style: { width: 280 },
    treeData: fileData,
  },
  argTypes: {
    selectDirectory: {
      description: '文件树是否允许选中目录。默认否，单击目录只展开',
      table: { defaultValue: { summary: 'false' } },
      control: { type: 'boolean' },
    },
    editing: {
      description: '把这一行换成编辑框。文件名只选中点号前面的部分',
      control: { type: 'radio' },
      options: ['关闭', 'scripts.java', 'extensions.yak', 'build'],
    },
    blockNode: { table: { defaultValue: { summary: 'true' } } },
    showIcon: { table: { defaultValue: { summary: 'true' } } },
    showLine: { table: { defaultValue: { summary: '关闭' } } },
    defaultExpandAll: {
      description: '默认展开所有树节点。目录树只在挂载时用它算一次；第一次挂上时 treeData 为空，后到的数据不会展开。',
    },
  },
  render: function DirectoryCanvas({ editing = '关闭', treeData = fileData, ...args }) {
    const [, updateArgs] = useArgs<DirectoryStoryArgs>()
    const target = DIRECTORY_EDITING[editing]
    const editingValue = target ? (titleOf(treeData, target.key) ?? target.title) : ''
    const dot = editingValue.lastIndexOf('.')
    return withResolvedShowLine(
      {
        ...args,
        treeData,
        editingKey: target?.key,
        editingValue: target ? editingValue : undefined,
        editingSelection: target && dot > 0 ? { start: 0, end: dot } : undefined,
        onEditSubmit: (value, key) => {
          updateArgs({
            treeData: renameNode(treeData, key, value),
            editing: '关闭',
          })
        },
      },
      Tree.DirectoryTree,
    )
  },
  parameters: {
    controls: {
      include: [
        'treeData',
        'checkable',
        'selectable',
        'multiple',
        'disabled',
        'defaultExpandAll',
        'showLine',
        'showIcon',
        'draggable',
        'blockNode',
        'selectDirectory',
        'editing',
        'onSelect',
        'onCheck',
        'onExpand',
      ],
    },
    docs: {
      description: {
        story:
          '`Tree.DirectoryTree`。点文件夹默认只展开或收起。不传 `icon` 时用默认的线框文件夹和文件图标。打开 `selectDirectory` 后，单击目录也会选中并画出描边。`editing` 选一个节点后，这一行变成输入框，箭头和图标留在外面。失焦或回车把文字写回标题，并关掉编辑。不传 `showLine` 时没有连接线；打开后缩进和箭头列是 24。选「开启(带叶子图标)」时，叶子箭头位是文件图标。`defaultExpandAll`、`defaultExpandedKeys`、`defaultExpandParent` 只在挂载时算一次。第一次挂上时 `treeData` 为空，后到的数据不会展开。',
      },
    },
  },
}

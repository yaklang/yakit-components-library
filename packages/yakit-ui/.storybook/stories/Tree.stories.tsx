import type { Meta, StoryObj } from '@storybook/react';
import { useEffect, useRef, useState, type Key } from 'react';

import Tree, { DirectoryTree, type TreeDataNode, type TreeProps } from '../../src/components/Tree';

const sampleData: TreeDataNode[] = [
  {
    key: '1',
    title: 'https://www.taskade.com',
    children: [
      {
        key: '1-1',
        title: 'https://www.taskade.com',
        children: [
          {
            key: '1-1-1',
            title: 'https://www.taskade.com',
            children: [{ key: '1-1-1-1', title: 'https://www.taskade.com', isLeaf: true }],
          },
        ],
      },
      { key: '1-2', title: 'leaf-a', isLeaf: true },
    ],
  },
  {
    key: '2',
    title: 'https://www.taskade.com',
    children: [
      { key: '2-1', title: 'leaf-b', isLeaf: true },
      { key: '2-2', title: 'leaf-c', isLeaf: true },
    ],
  },
];

// FileTree 数据：key 取 path、title 取 name（见 fieldNames），节点不写标准 key/title
const fieldNamesData = [
  {
    path: '/src',
    name: 'src',
    children: [
      { path: '/src/App.tsx', name: 'App.tsx', isLeaf: true },
      {
        path: '/src/components',
        name: 'components',
        children: [{ path: '/src/components/Tree.tsx', name: 'Tree.tsx', isLeaf: true }],
      },
    ],
  },
];

const meta = {
  title: 'YakitUi/通用/Tree',
  component: Tree,
  parameters: {
    layout: 'padded',
  },
  args: {
    defaultExpandAll: true,
    showIcon: true,
    treeData: sampleData,
  },
} satisfies Meta<typeof Tree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: (args) => (
    <div style={{ width: 320 }}>
      <Tree {...args} />
    </div>
  ),
};

const SelectableDemo = (args: TreeProps) => {
  const [selectedKeys, setSelectedKeys] = useState<Key[]>(['1']);
  return (
    <div style={{ width: 320 }}>
      <Tree {...args} onSelect={(keys) => setSelectedKeys(keys)} selectedKeys={selectedKeys} />
    </div>
  );
};

export const Selectable: Story = {
  render: (args) => <SelectableDemo {...args} />,
};

export const Checkable: Story = {
  args: {
    checkable: true,
    defaultCheckedKeys: ['1-2'],
  },
  render: (args) => (
    <div style={{ width: 320 }}>
      <Tree {...args} />
    </div>
  ),
};

export const WithLine: Story = {
  args: {
    showLine: true,
  },
  render: (args) => (
    <div style={{ width: 320 }}>
      <Tree {...args} />
    </div>
  ),
};

const EditingDemo = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const data: TreeDataNode[] = [
    {
      key: 'root',
      title: 'https://www.taskade.com',
      children: [
        {
          key: 'edit',
          className: 'yakit-tree-node-editing',
          isLeaf: false,
          selectable: false,
          title: (
            <input
              ref={inputRef}
              aria-label="rename"
              className="yakit-tree-edit-input"
              defaultValue=""
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              placeholder="Untitled-2"
            />
          ),
        },
      ],
    },
  ];

  return (
    <div style={{ width: 320 }}>
      <Tree defaultExpandedKeys={['root', 'edit']} showIcon treeData={data} />
    </div>
  );
};

export const Editing: Story = {
  render: () => <EditingDemo />,
};

export const Empty: Story = {
  args: {
    treeData: [],
    emptyText: '暂无数据',
  } satisfies Partial<TreeProps>,
  render: (args) => (
    <div style={{ width: 320, minHeight: 80 }}>
      <Tree {...args} />
    </div>
  ),
};

export const FieldNamesFileTree: Story = {
  name: 'FieldNames (FileTree)',
  render: () => (
    <div style={{ width: 320 }}>
      <Tree
        blockNode
        defaultExpandAll
        fieldNames={{ title: 'name', key: 'path', children: 'children' }}
        height={240}
        itemHeight={22}
        showIcon={false}
        switcherIcon={null}
        treeData={fieldNamesData as unknown as TreeDataNode[]}
      />
    </div>
  ),
};

export const Directory: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <DirectoryTree defaultExpandAll treeData={sampleData} />
    </div>
  ),
};

const DragDemo = () => {
  const [log, setLog] = useState('拖到另一节点上触发 onDrop（不自动重排）');
  return (
    <div style={{ width: 360 }}>
      <Tree
        defaultExpandAll
        draggable
        onDrop={(info) => {
          setLog(
            `drop ${String(info.dragNode.key)} -> ${String(info.node.key)} pos=${info.dropPosition}`,
          );
        }}
        treeData={sampleData}
      />
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>{log}</div>
    </div>
  );
};

export const DraggableBasic: Story = {
  render: () => <DragDemo />,
};

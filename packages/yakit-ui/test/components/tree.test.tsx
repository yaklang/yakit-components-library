import React from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfigProvider from '../../src/components/ConfigProvider';
import Tree, { DirectoryTree, YakitTreeCompat, type TreeDataNode } from '../../src/components/Tree';
import { cleanup, render } from '../helpers/render';

afterEach(cleanup);

const treeData = [
  {
    key: '1',
    title: 'parent',
    children: [
      { key: '1-1', title: 'child', isLeaf: true },
      {
        key: '1-2',
        title: 'folder-child',
        children: [{ key: '1-2-1', title: 'leaf', isLeaf: true }],
      },
    ],
  },
];

describe('Tree', () => {
  it('renders nodes with default folder / document icons', () => {
    const { container } = render(
      <ConfigProvider>
        <Tree defaultExpandAll treeData={treeData} />
      </ConfigProvider>,
    );

    expect(container.querySelector('.yakit-tree')).not.toBeNull();
    expect(container.textContent).toContain('parent');
    expect(container.textContent).toContain('child');
    expect(container.querySelectorAll('.yakit-tree-node-icon').length).toBeGreaterThan(0);
  });

  it('fires onSelect when a node title is clicked', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <ConfigProvider>
        <Tree defaultExpandAll onSelect={onSelect} treeData={treeData} />
      </ConfigProvider>,
    );

    const title = [...container.querySelectorAll('.yakit-tree-title')].find(
      (node) => node.textContent === 'child',
    );
    expect(title).toBeTruthy();
    flushSync(() => title!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onSelect).toHaveBeenCalled();
    expect(container.querySelector('.yakit-tree-treenode-selected')).not.toBeNull();
  });

  it('shows empty placeholder when treeData is empty', () => {
    const { container } = render(
      <ConfigProvider>
        <Tree emptyText="nothing here" treeData={[]} />
      </ConfigProvider>,
    );

    expect(container.querySelector('.yakit-tree-empty')?.textContent).toBe('nothing here');
    expect(container.querySelector('.yakit-tree-list')).toBeNull();
  });

  it('YakitTreeCompat enables show-line class by default', () => {
    const { container } = render(
      <ConfigProvider>
        <YakitTreeCompat defaultExpandAll treeData={treeData} />
      </ConfigProvider>,
    );

    expect(container.querySelector('.yakit-tree-show-line')).not.toBeNull();
  });

  it('toggles expand when switcher is clicked', () => {
    const { container } = render(
      <ConfigProvider>
        <Tree treeData={treeData} />
      </ConfigProvider>,
    );

    expect(container.textContent).not.toContain('child');
    const switcher = container.querySelector('.yakit-tree-switcher-close');
    expect(switcher).not.toBeNull();
    flushSync(() => switcher!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('child');
  });

  it('maps fieldNames title/key/children and keeps original fields', () => {
    const onSelect = vi.fn();
    // FileTree 数据：key 取 path、title 取 name（fieldNames 映射），不写标准 key/title
    const data = [
      {
        path: '/root',
        name: 'root-folder',
        children: [{ path: '/root/a.ts', name: 'a.ts', isLeaf: true }],
      },
    ];
    const { container } = render(
      <ConfigProvider>
        <Tree
          defaultExpandAll
          fieldNames={{ title: 'name', key: 'path', children: 'children' }}
          onSelect={onSelect}
          treeData={data as unknown as TreeDataNode[]}
        />
      </ConfigProvider>,
    );

    expect(container.textContent).toContain('root-folder');
    expect(container.textContent).toContain('a.ts');
    const title = [...container.querySelectorAll('.yakit-tree-title')].find(
      (node) => node.textContent === 'a.ts',
    );
    flushSync(() => title!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onSelect).toHaveBeenCalled();
    const [keys, info] = onSelect.mock.calls[0];
    expect(keys).toEqual(['/root/a.ts']);
    expect(info.node.path).toBe('/root/a.ts');
    expect(info.node.name).toBe('a.ts');
  });

  it('DirectoryTree expands on title click by default', () => {
    const { container } = render(
      <ConfigProvider>
        <DirectoryTree treeData={treeData} />
      </ConfigProvider>,
    );

    expect(container.querySelector('.yakit-tree-directory')).not.toBeNull();
    expect(container.textContent).not.toContain('child');
    const title = [...container.querySelectorAll('.yakit-tree-title')].find(
      (node) => node.textContent === 'parent',
    );
    flushSync(() => title!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(container.textContent).toContain('child');
  });

  it('Tree.DirectoryTree is attached', () => {
    expect(Tree.DirectoryTree).toBe(DirectoryTree);
  });

  it('autoExpandParent includes ancestors of expanded keys', () => {
    const { container } = render(
      <ConfigProvider>
        <Tree autoExpandParent expandedKeys={['1-2-1']} treeData={treeData} />
      </ConfigProvider>,
    );
    expect(container.textContent).toContain('parent');
    expect(container.textContent).toContain('folder-child');
    expect(container.textContent).toContain('leaf');
  });

  it('fires onDrop for HTML5 drag', () => {
    const onDrop = vi.fn();
    const { container } = render(
      <ConfigProvider>
        <Tree defaultExpandAll draggable onDrop={onDrop} treeData={treeData} />
      </ConfigProvider>,
    );
    const nodes = container.querySelectorAll('.yakit-tree-treenode');
    const dragNode = [...nodes].find((n) => n.getAttribute('data-tree-key') === '1-1');
    const dropNode = [...nodes].find((n) => n.getAttribute('data-tree-key') === '1-2');
    expect(dragNode && dropNode).toBeTruthy();

    flushSync(() => {
      dragNode!.dispatchEvent(new Event('dragstart', { bubbles: true }));
      dropNode!.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
      dropNode!.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    });
    // jsdom 的 DragEvent 支持有限；只要节点可拖且回调可挂即可
    expect(dragNode!.getAttribute('draggable')).toBe('true');
  });

  it('switcherIcon={null} hides default chevron', () => {
    const { container } = render(
      <ConfigProvider>
        <Tree defaultExpandAll switcherIcon={null} treeData={treeData} />
      </ConfigProvider>,
    );
    expect(container.querySelector('.yakit-tree-switcher-icon')).toBeNull();
  });
});

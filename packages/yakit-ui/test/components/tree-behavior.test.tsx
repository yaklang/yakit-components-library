import { userEvent } from '@vitest/browser/context';
import {
  DocumentOutlined,
  Link2Outlined,
  VariableOutlined,
} from '@yakit-libs/yakit-ui-icons/outline';
import { FolderOpenSolid, FolderSolid } from '@yakit-libs/yakit-ui-icons/solid';
import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfigProvider from '../../src/components/ConfigProvider';
import Tree, { type TreeRef } from '../../src/components/Tree';
import { cleanup, render } from '../helpers/render';

afterEach(cleanup);

const treeData = [
  {
    key: 'parent',
    title: 'parent',
    children: [{ key: 'child', title: 'child' }],
  },
];

const fileTitle = (container: HTMLElement, name: string) => {
  const node = [...container.querySelectorAll<HTMLElement>('.yakit-tree-file-title')].find(
    (item) => item.textContent === name,
  );
  if (!node) throw new Error(`expected ${name}`);
  return node;
};

describe('Tree behavior', () => {
  it('expands default and website trees from defaultExpandAll and from the switcher', async () => {
    const opened = render(<Tree defaultExpandAll treeData={treeData} />);
    expect(opened.container.textContent).toContain('child');
    cleanup();

    const website = render(<Tree.WebsiteTree defaultExpandAll treeData={treeData} />);
    expect(website.container.textContent).toContain('child');
    cleanup();

    const { container } = render(<Tree treeData={treeData} />);
    expect(container.textContent).not.toContain('child');
    const switcher = container.querySelector('.ant-tree-switcher');
    if (!switcher) throw new Error('expected switcher');
    await userEvent.click(switcher);
    expect(container.textContent).toContain('child');
  });

  it('keeps guide lines off on the default tree until showLine is set', () => {
    const plain = render(<Tree treeData={treeData} />);
    expect(plain.container.querySelector('.ant-tree-show-line')).toBeNull();
    cleanup();

    const website = render(<Tree.WebsiteTree treeData={treeData} />);
    expect(website.container.querySelector('.ant-tree-show-line')).toBeTruthy();
    cleanup();

    const lined = render(<Tree showLine treeData={treeData} />);
    expect(lined.container.querySelector('.ant-tree-show-line')).toBeTruthy();
  });

  it('puts the provider theme and direction on the tree root', () => {
    const { container } = render(
      <ConfigProvider direction="rtl" theme={{ mode: 'dark' }}>
        <Tree treeData={treeData} />
      </ConfigProvider>,
    );
    const root = container.querySelector('.yakit-tree');
    expect(root?.getAttribute('data-theme')).toBe('dark');
    expect(root?.getAttribute('dir')).toBe('rtl');
    expect(container.querySelector('.ant-tree-rtl')).toBeTruthy();
  });

  it('uses ConfigProvider componentDisabled unless the tree sets disabled', () => {
    const fromContext = render(
      <ConfigProvider componentDisabled>
        <Tree treeData={treeData} />
      </ConfigProvider>,
    );
    expect(fromContext.container.querySelector('.ant-tree-disabled')).toBeTruthy();
    cleanup();

    const explicit = render(
      <ConfigProvider componentDisabled>
        <Tree disabled={false} treeData={treeData} />
      </ConfigProvider>,
    );
    expect(explicit.container.querySelector('.ant-tree-disabled')).toBeNull();
  });

  it('renders a default tree without website or file classes', () => {
    const { container } = render(<Tree treeData={treeData} />);
    const root = container.querySelector('.yakit-tree');

    expect(root).toBeTruthy();
    expect(root?.className).not.toContain('website');
    expect(root?.className).not.toContain('file');
  });

  it('passes height through to the virtual list', () => {
    const { container } = render(<Tree height={120} treeData={treeData} />);
    const holder = container.querySelector<HTMLElement>('.ant-tree-list-holder');

    expect(holder).toBeTruthy();
    expect(holder?.style.maxHeight).toBe('120px');
  });

  it('exposes scrollTo on the ref', () => {
    const ref = createRef<TreeRef>();
    render(<Tree ref={ref} height={120} treeData={treeData} />);

    expect(() => ref.current?.scrollTo({ key: 'parent' })).not.toThrow();
  });

  it('expands a folder on click without selecting it, and selects a file', async () => {
    const onExpand = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree treeData={treeData} onExpand={onExpand} onSelect={onSelect} />,
    );
    const title = container.querySelector('.yakit-tree-file-title');
    const closedSvg = container.querySelector('.ant-tree-switcher_close svg');
    if (!title || !closedSvg) throw new Error('expected file title');
    const closedTransform = getComputedStyle(closedSvg).transform;
    expect(closedTransform === 'none' || closedTransform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);

    await userEvent.click(title);
    const folder = title.closest<HTMLElement>('.ant-tree-treenode');
    expect(folder?.className).toMatch(/switcher-open/);
    await userEvent.unhover(title);
    expect(getComputedStyle(folder as Element).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(container.textContent).toContain('child');
    expect(container.querySelector('.ant-tree-treenode-selected')).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onExpand).toHaveBeenCalledWith(['parent'], expect.objectContaining({ expanded: true }));

    const childTitle = [...container.querySelectorAll('.yakit-tree-file-title')].find(
      (node) => node.textContent === 'child',
    );
    if (!childTitle) throw new Error('expected child title');
    await userEvent.click(childTitle);
    expect(
      container.querySelector('.ant-tree-treenode-selected .yakit-tree-file-title')?.textContent,
    ).toBe('child');
    expect(onSelect).toHaveBeenCalledWith(['child'], expect.objectContaining({ selected: true }));
    expect(onSelect).toHaveBeenCalledWith(['child'], expect.objectContaining({ selected: true }));
  });

  it('fades a disabled file like antd directory tree, for one node and the whole tree', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [
          { key: 'off', title: 'off', disabled: true, isLeaf: true },
          { key: 'on', title: 'on', disabled: true, isLeaf: true },
        ],
      },
    ];
    const faded = 'rgb(192, 198, 209)';
    const secondary = 'rgb(134, 140, 151)';
    const disabledSelectedBg = 'rgb(238, 240, 243)';
    const row = (container: HTMLElement, title: string) =>
      [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find(
        (node) => node.querySelector('.yakit-tree-file-title')?.textContent === title,
      );

    const one = render(
      <Tree.DirectoryTree
        defaultExpandAll
        selectedKeys={['on']}
        showLine={{ showLeafIcon: true }}
        treeData={data}
      />,
    );
    const off = row(one.container, 'off');
    const on = row(one.container, 'on');
    const folder = row(one.container, 'parent');
    if (!off || !on || !folder) throw new Error('expected disabled file rows');
    const offTitle = off.querySelector<HTMLElement>('.yakit-tree-file-title');
    if (!offTitle) throw new Error('expected disabled title');

    expect(getComputedStyle(off).opacity).toBe('1');
    expect(getComputedStyle(offTitle).color).toBe(faded);
    expect(getComputedStyle(off.querySelector('.yakit-tree-file-icon') as Element).color).toBe(
      faded,
    );
    await userEvent.hover(offTitle);
    expect(getComputedStyle(off).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(on).backgroundColor).toBe(disabledSelectedBg);
    expect(getComputedStyle(on).boxShadow).toBe('none');
    expect(getComputedStyle(on.querySelector('.yakit-tree-file-title') as Element).color).toBe(
      faded,
    );
    expect(getComputedStyle(on.querySelector('.yakit-tree-file-icon') as Element).color).toBe(
      faded,
    );
    expect(getComputedStyle(off.querySelector('.yakit-tree-leaf-icon') as Element).color).toBe(
      faded,
    );
    expect(getComputedStyle(on.querySelector('.yakit-tree-leaf-icon') as Element).color).toBe(
      faded,
    );
    const folderArrow = folder.querySelector('svg');
    if (!folderArrow) throw new Error('expected folder arrow');
    expect(getComputedStyle(folderArrow).color).toBe(secondary);
    cleanup();

    const all = render(
      <Tree.DirectoryTree defaultExpandAll disabled selectedKeys={['on']} treeData={data} />,
    );
    const plain = row(all.container, 'off');
    const selected = row(all.container, 'on');
    const directory = row(all.container, 'parent');
    if (!plain || !selected || !directory) throw new Error('expected whole-tree disabled rows');
    expect(getComputedStyle(plain.querySelector('.yakit-tree-file-title') as Element).color).toBe(
      faded,
    );
    expect(getComputedStyle(plain.querySelector('.yakit-tree-file-icon') as Element).color).toBe(
      faded,
    );
    expect(getComputedStyle(plain).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(
      getComputedStyle(directory.querySelector('.yakit-tree-file-title') as Element).color,
    ).toBe(faded);
    expect(
      getComputedStyle(directory.querySelector('.yakit-tree-file-icon') as Element).color,
    ).toBe(faded);
    expect(getComputedStyle(selected).backgroundColor).toBe(disabledSelectedBg);
    expect(getComputedStyle(selected).boxShadow).toBe('none');
    expect(
      getComputedStyle(selected.querySelector('.yakit-tree-file-title') as Element).color,
    ).toBe(faded);
    const content = selected.querySelector<HTMLElement>('.yakit-tree-file-title');
    const switcher = directory.querySelector<HTMLElement>('.ant-tree-switcher');
    if (!content || !switcher) throw new Error('expected selected title and folder switcher');
    await userEvent.hover(content);
    expect(getComputedStyle(selected).backgroundColor).toBe(disabledSelectedBg);
    await userEvent.hover(directory.querySelector('.yakit-tree-file-title') as Element);
    expect(getComputedStyle(directory).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(switcher.querySelector('svg') as Element).color).toBe(secondary);
  });

  it('paints the file hover color on a directory row', async () => {
    const { container } = render(<Tree.DirectoryTree defaultExpandAll treeData={treeData} />);
    const title = (name: string) =>
      [...container.querySelectorAll<HTMLElement>('.yakit-tree-file-title')].find(
        (node) => node.textContent === name,
      );
    const folderTitle = title('parent');
    const fileTitle = title('child');
    const folder = folderTitle?.closest<HTMLElement>('.ant-tree-treenode');
    const file = fileTitle?.closest<HTMLElement>('.ant-tree-treenode');
    if (!folderTitle || !fileTitle || !folder || !file) throw new Error('expected folder and file');

    await userEvent.hover(folderTitle);
    const folderBg = getComputedStyle(folder).backgroundColor;
    await userEvent.unhover(folderTitle);
    await userEvent.hover(fileTitle);
    expect(folderBg).toBe(getComputedStyle(file).backgroundColor);
    expect(folderBg).toBe('rgb(248, 249, 250)');
    expect(folder.className).not.toMatch(/selected/);
  });

  it('selects a folder with ctrl without expanding or drawing a border', async () => {
    const onExpand = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree multiple treeData={treeData} onExpand={onExpand} onSelect={onSelect} />,
    );
    const title = container.querySelector('.yakit-tree-file-title');
    if (!title) throw new Error('expected file title');

    await userEvent.click(title, { modifiers: ['Control'] });
    expect(onSelect).toHaveBeenCalledWith(['parent'], expect.objectContaining({ selected: true }));
    expect(onExpand).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('child');
    expect(container.querySelector('.ant-tree-treenode-selected')).toBeNull();
  });

  it('selects a directory when selectDirectory is on', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree selectDirectory treeData={treeData} onSelect={onSelect} />,
    );
    const title = container.querySelector<HTMLElement>('.yakit-tree-file-title');
    if (!title) throw new Error('expected folder title');
    await userEvent.click(title);
    await userEvent.unhover(title);
    const folder = title.closest<HTMLElement>('.ant-tree-treenode');
    expect(onSelect).toHaveBeenCalledWith(['parent'], expect.objectContaining({ selected: true }));
    expect(container.querySelector('.yakit-tree-file-select-directory')).toBeTruthy();
    expect(folder?.className).toMatch(/treenode-selected/);
    expect(getComputedStyle(folder as Element).backgroundColor).toBe('rgb(254, 245, 238)');
    expect(getComputedStyle(folder as Element).boxShadow).toContain('rgb(242, 140, 69)');
  });

  it('selects the visible range on shift click, and skips a collapsed directory', async () => {
    const data = [
      { key: 'a', title: 'a', isLeaf: true },
      {
        key: 'dir',
        title: 'dir',
        children: [{ key: 'hidden', title: 'hidden', isLeaf: true }],
      },
      { key: 'c', title: 'c', isLeaf: true },
    ];
    const { container } = render(<Tree.DirectoryTree multiple treeData={data} />);
    const title = (name: string) => {
      const node = [...container.querySelectorAll<HTMLElement>('.yakit-tree-file-title')].find(
        (item) => item.textContent === name,
      );
      if (!node) throw new Error(`expected ${name}`);
      return node;
    };
    const selected = () =>
      [...container.querySelectorAll('.ant-tree-treenode-selected .yakit-tree-file-title')].map(
        (node) => node.textContent,
      );
    await userEvent.click(title('a'));
    await userEvent.click(title('c'), { modifiers: ['Shift'] });
    expect(selected().sort()).toEqual(['a', 'c']);
    expect(container.textContent).not.toContain('hidden');
  });

  it('keeps a shift range when the parent stores selectedKeys', async () => {
    const data = [
      { key: 'a', title: 'a', isLeaf: true },
      { key: 'b', title: 'b', isLeaf: true },
      { key: 'c', title: 'c', isLeaf: true },
    ];
    const Harness = () => {
      const [selected, setSelected] = React.useState<React.Key[]>([]);
      return (
        <Tree.DirectoryTree
          multiple
          selectedKeys={selected}
          treeData={data}
          onSelect={(keys) => setSelected(keys)}
        />
      );
    };
    const { container } = render(<Harness />);
    const title = (name: string) => {
      const node = [...container.querySelectorAll<HTMLElement>('.yakit-tree-file-title')].find(
        (item) => item.textContent === name,
      );
      if (!node) throw new Error(`expected ${name}`);
      return node;
    };
    const selected = () =>
      [...container.querySelectorAll('.ant-tree-treenode-selected .yakit-tree-file-title')].map(
        (node) => node.textContent,
      );
    await userEvent.click(title('a'));
    await userEvent.click(title('c'), { modifiers: ['Shift'] });
    expect(selected().sort()).toEqual(['a', 'b', 'c']);
  });

  it('does not revive cleared keys on the next shift click', async () => {
    const data = [
      { key: 'a', title: 'a', isLeaf: true },
      { key: 'b', title: 'b', isLeaf: true },
      { key: 'c', title: 'c', isLeaf: true },
    ];
    const onSelect = vi.fn();
    const Harness = () => {
      const [selected, setSelected] = React.useState<React.Key[]>(['a', 'b']);
      return (
        <>
          <button type="button" onClick={() => setSelected([])}>
            clear
          </button>
          <Tree.DirectoryTree
            multiple
            selectedKeys={selected}
            treeData={data}
            onSelect={(keys, info) => {
              onSelect(keys, info);
              setSelected(keys);
            }}
          />
        </>
      );
    };
    const { container } = render(<Harness />);
    await userEvent.click(container.querySelector('button') as HTMLButtonElement);
    const title = [...container.querySelectorAll<HTMLElement>('.yakit-tree-file-title')].find(
      (item) => item.textContent === 'c',
    );
    if (!title) throw new Error('expected c');
    await userEvent.click(title, { modifiers: ['Shift'] });
    const keys = onSelect.mock.calls.at(-1)?.[0] as React.Key[];
    expect(keys).toEqual(['c']);
    expect(
      container.querySelector('.ant-tree-treenode-selected .yakit-tree-file-title')?.textContent,
    ).toBe('c');
  });

  it('selects the clicked file when the first click is shift', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree
        multiple
        treeData={[
          { key: 'a', title: 'a', isLeaf: true },
          { key: 'c', title: 'c', isLeaf: true },
        ]}
        onSelect={onSelect}
      />,
    );
    const title = [...container.querySelectorAll<HTMLElement>('.yakit-tree-file-title')].find(
      (item) => item.textContent === 'c',
    );
    if (!title) throw new Error('expected c');
    await userEvent.click(title, { modifiers: ['Shift'] });
    expect(onSelect.mock.calls.at(-1)?.[0]).toEqual(['c']);
    expect(
      container.querySelector('.ant-tree-treenode-selected .yakit-tree-file-title')?.textContent,
    ).toBe('c');
  });

  it('leaves defaultExpandAll to antd when the first treeData is empty', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [{ key: 'child', title: 'child', isLeaf: true }],
      },
    ];
    const Harness = () => {
      const [treeData, setTreeData] = React.useState<typeof data>([]);
      return (
        <>
          <button type="button" onClick={() => setTreeData(data)}>
            load
          </button>
          <Tree.DirectoryTree defaultExpandAll treeData={treeData} />
        </>
      );
    };
    const { container } = render(<Harness />);
    expect(container.textContent).not.toContain('child');
    await userEvent.click(container.querySelector('button') as HTMLButtonElement);
    await vi.waitFor(() => {
      expect(container.innerText).toContain('parent');
    });
    expect(container.innerText).not.toContain('child');
  });

  it('expands ancestors of defaultExpandedKeys unless defaultExpandParent is false or a disabled node stops the walk', () => {
    const data = [
      {
        key: 'root',
        title: 'root',
        children: [
          {
            key: 'mid',
            title: 'mid',
            children: [{ key: 'leaf', title: 'leaf', isLeaf: true }],
          },
        ],
      },
    ];
    const titles = (container: HTMLElement) =>
      [...container.querySelectorAll('.yakit-tree-file-title')].map((item) => item.textContent);
    const opened = render(<Tree.DirectoryTree defaultExpandedKeys={['leaf']} treeData={data} />);
    expect(titles(opened.container)).toEqual(['root', 'mid', 'leaf']);
    cleanup();
    const closed = render(
      <Tree.DirectoryTree
        defaultExpandParent={false}
        defaultExpandedKeys={['leaf']}
        treeData={data}
      />,
    );
    expect(titles(closed.container)).toEqual(['root']);
    cleanup();
    const stopped = render(
      <Tree.DirectoryTree
        defaultExpandedKeys={['side-leaf', 'leaf']}
        treeData={[
          {
            key: 'root',
            title: 'root',
            children: [
              {
                key: 'side',
                title: 'side',
                children: [{ key: 'side-leaf', title: 'side-leaf', isLeaf: true }],
              },
              {
                key: 'upper',
                title: 'upper',
                children: [
                  {
                    key: 'blocked',
                    title: 'blocked',
                    disabled: true,
                    children: [
                      {
                        key: 'mid',
                        title: 'mid',
                        children: [{ key: 'leaf', title: 'leaf', isLeaf: true }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]}
      />,
    );
    expect(titles(stopped.container)).toEqual(['root', 'side', 'side-leaf', 'upper']);
    const upper = [...stopped.container.querySelectorAll('.ant-tree-treenode')].find(
      (node) => node.querySelector('.yakit-tree-file-title')?.textContent === 'upper',
    );
    expect(upper?.querySelector('.ant-tree-switcher_close')).toBeTruthy();
  });

  it('uses a tree icon without showIcon and keeps a website function icon', () => {
    const file = render(
      <Tree.DirectoryTree
        icon={() => <span data-testid="tree-icon" />}
        treeData={[{ key: 'file', title: 'file', isLeaf: true }]}
      />,
    );
    expect(file.container.querySelector('[data-testid="tree-icon"]')).toBeTruthy();

    const hidden = render(
      <Tree.DirectoryTree
        showIcon={false}
        icon={() => <span data-testid="tree-icon" />}
        treeData={[{ key: 'file', title: 'file', isLeaf: true }]}
      />,
    );
    expect(hidden.container.querySelector('[data-testid="tree-icon"]')).toBeNull();

    const website = render(
      <Tree.WebsiteTree
        treeData={[
          {
            key: 'link',
            title: 'link',
            isLeaf: true,
            icon: () => <span data-testid="node-icon" />,
          },
        ]}
      />,
    );
    expect(website.container.querySelector('[data-testid="node-icon"]')).toBeTruthy();
  });

  it('picks website icons from resource type the way history does', () => {
    const glyph = (node: React.ReactElement) => {
      const view = render(node);
      return view.container.querySelector('svg path')?.getAttribute('d');
    };
    const folder = glyph(<FolderSolid size={16} color="currentColor" />);
    const folderOpen = glyph(<FolderOpenSolid size={16} color="currentColor" />);
    const file = glyph(<DocumentOutlined size={16} color="currentColor" />);
    const query = glyph(<VariableOutlined size={16} color="currentColor" />);
    const path = glyph(<Link2Outlined size={16} color="currentColor" />);
    const iconPath = (container: HTMLElement, title: string) => {
      const row = [...container.querySelectorAll('.ant-tree-treenode')].find(
        (node) => node.querySelector('.ant-tree-title')?.textContent === title,
      );
      return row?.querySelector('.ant-tree-iconEle svg path')?.getAttribute('d');
    };
    const data = [
      {
        key: 'host',
        title: 'host',
        resourceType: 'dir' as const,
        children: [
          { key: 'file', title: 'file', resourceType: 'file' as const, isLeaf: true },
          { key: 'query', title: 'query', resourceType: 'query' as const, isLeaf: true },
          {
            key: 'path',
            title: 'path',
            resourceType: 'path' as const,
            children: [{ key: 'inside', title: 'inside', data: { ResourceType: 'query' } }],
          },
        ],
      },
    ];

    const closed = render(<Tree.WebsiteTree treeData={data} />);
    expect(iconPath(closed.container, 'host')).toBe(folder);
    cleanup();

    const opened = render(<Tree.WebsiteTree defaultExpandAll treeData={data} />);
    expect(iconPath(opened.container, 'host')).toBe(folderOpen);
    expect(iconPath(opened.container, 'file')).toBe(file);
    expect(iconPath(opened.container, 'query')).toBe(query);
    expect(iconPath(opened.container, 'path')).toBe(path);
    expect(iconPath(opened.container, 'inside')).toBe(query);
  });

  it('defaults a website tree to folder, link, then variable by depth', () => {
    const glyph = (node: React.ReactElement) => {
      const view = render(node);
      return view.container.querySelector('svg path')?.getAttribute('d');
    };
    const folder = glyph(<FolderSolid size={16} color="currentColor" />);
    const folderOpen = glyph(<FolderOpenSolid size={16} color="currentColor" />);
    const query = glyph(<VariableOutlined size={16} color="currentColor" />);
    const path = glyph(<Link2Outlined size={16} color="currentColor" />);
    const iconPath = (container: HTMLElement, title: string) => {
      const row = [...container.querySelectorAll('.ant-tree-treenode')].find(
        (node) => node.querySelector('.ant-tree-title')?.textContent === title,
      );
      return row?.querySelector('.ant-tree-iconEle svg path')?.getAttribute('d');
    };
    const data = [
      {
        key: 'host',
        title: 'host',
        children: [
          {
            key: 'path',
            title: 'path',
            children: [{ key: 'query', title: 'query' }],
          },
        ],
      },
    ];

    const closed = render(<Tree.WebsiteTree treeData={data} />);
    expect(iconPath(closed.container, 'host')).toBe(folder);
    cleanup();

    const opened = render(<Tree.WebsiteTree defaultExpandAll treeData={data} />);
    expect(iconPath(opened.container, 'host')).toBe(folderOpen);
    expect(iconPath(opened.container, 'path')).toBe(path);
    expect(iconPath(opened.container, 'query')).toBe(query);
  });

  it('expands an unloaded directory instead of selecting it', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree
        loadData={() => Promise.resolve()}
        treeData={[
          { key: 'dir', title: 'dir' },
          { key: 'file', title: 'file', isLeaf: true },
        ]}
        onSelect={onSelect}
      />,
    );
    const title = (name: string) => {
      const node = [...container.querySelectorAll<HTMLElement>('.yakit-tree-file-title')].find(
        (item) => item.textContent === name,
      );
      if (!node) throw new Error(`expected ${name}`);
      return node;
    };
    await userEvent.click(title('dir'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(container.querySelector('.ant-tree-treenode-selected')).toBeNull();
    await userEvent.click(title('file'));
    expect(onSelect).toHaveBeenCalled();
    expect(
      container.querySelector('.ant-tree-treenode-selected .yakit-tree-file-title')?.textContent,
    ).toBe('file');
  });

  it('selects a childless node when loadData is not set', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree treeData={[{ key: 'file', title: 'file' }]} onSelect={onSelect} />,
    );
    await userEvent.click(container.querySelector('.yakit-tree-file-title') as HTMLElement);
    expect(onSelect).toHaveBeenCalled();
  });

  it('includes directories in a shift range when selectDirectory is on', async () => {
    const data = [
      { key: 'a', title: 'a', isLeaf: true },
      { key: 'dir', title: 'dir', children: [{ key: 'hidden', title: 'hidden', isLeaf: true }] },
      { key: 'c', title: 'c', isLeaf: true },
    ];
    const { container } = render(<Tree.DirectoryTree multiple selectDirectory treeData={data} />);
    const title = (name: string) => {
      const node = [...container.querySelectorAll<HTMLElement>('.yakit-tree-file-title')].find(
        (item) => item.textContent === name,
      );
      if (!node) throw new Error(`expected ${name}`);
      return node;
    };
    await userEvent.click(title('a'));
    await userEvent.click(title('c'), { modifiers: ['Shift'] });
    const selected = [
      ...container.querySelectorAll('.ant-tree-treenode-selected .yakit-tree-file-title'),
    ].map((node) => node.textContent);
    expect(selected.sort()).toEqual(['a', 'c', 'dir']);
  });

  it('drops file selection chrome when ctrl toggles one of two files off', async () => {
    const data = [
      {
        key: 'build',
        title: 'build',
        children: [
          { key: 'scripts', title: 'scripts.java', isLeaf: true },
          { key: 'ext', title: 'extensions.yak', isLeaf: true },
        ],
      },
    ];
    const { container } = render(<Tree.DirectoryTree defaultExpandAll multiple treeData={data} />);
    const title = (name: string) => {
      const node = [...container.querySelectorAll<HTMLElement>('.yakit-tree-file-title')].find(
        (item) => item.textContent === name,
      );
      if (!node) throw new Error(`expected ${name}`);
      return node;
    };
    const row = (name: string) => {
      const node = title(name).closest<HTMLElement>('.ant-tree-treenode');
      if (!node) throw new Error(`expected ${name} row`);
      return node;
    };

    await userEvent.click(title('scripts.java'), { modifiers: ['Control'] });
    await userEvent.click(title('extensions.yak'), { modifiers: ['Control'] });
    expect(row('scripts.java').className).toMatch(/treenode-selected/);
    expect(row('extensions.yak').className).toMatch(/treenode-selected/);

    await userEvent.click(title('extensions.yak'), { modifiers: ['Control'] });
    await userEvent.unhover(title('extensions.yak'));
    const cancelled = row('extensions.yak');
    const kept = row('scripts.java');
    expect(cancelled.className).not.toMatch(/treenode-selected/);
    expect(cancelled.querySelector('.yakit-tree-file-focused')).toBeNull();
    expect(getComputedStyle(cancelled).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(cancelled).boxShadow).toBe('none');
    expect(kept.className).toMatch(/treenode-selected/);
    expect(getComputedStyle(kept).backgroundColor).toBe('rgb(254, 245, 238)');
    expect(getComputedStyle(kept).boxShadow).toContain('rgb(242, 140, 69)');
  });

  it('shows a spinner while a folder loads', async () => {
    let finish: (() => void) | undefined;
    const data = [
      {
        key: 'parent',
        title: 'parent',
        isLeaf: false,
      },
    ];
    const loadingTree = render(
      <Tree.DirectoryTree
        loadData={() =>
          new Promise<void>((resolve) => {
            finish = resolve;
          })
        }
        treeData={data}
      />,
    );
    const arrow = loadingTree.container.querySelector('.ant-tree-switcher');
    if (!arrow) throw new Error('expected folder switcher');
    await userEvent.click(arrow);
    const spinner = loadingTree.container.querySelector('.ant-tree-switcher-loading-icon');
    expect(loadingTree.container.querySelector('.ant-tree-treenode-loading')).toBeTruthy();
    expect(spinner).toBeTruthy();
    expect(getComputedStyle(spinner as Element).color).toBe('rgb(242, 140, 69)');
    finish?.();
  });

  it('places directory drag and checkbox like antd: indent, drag, arrow, checkbox, icon', () => {
    const { container } = render(
      <Tree.DirectoryTree checkable defaultExpandAll draggable treeData={treeData} />,
    );
    const rows = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].filter((row) =>
      row.querySelector('.ant-tree-node-content-wrapper'),
    );
    const folder = rows[0];
    const file = rows[1];
    if (!folder || !file) throw new Error('expected rows');

    const box = (row: HTMLElement, selector: string) =>
      row.querySelector<HTMLElement>(selector)?.getBoundingClientRect();
    const folderDrag = box(folder, '.ant-tree-draggable-icon');
    const folderSwitcher = box(folder, '.ant-tree-switcher');
    const folderCheckbox = box(folder, '.ant-tree-checkbox');
    const folderIcon = box(folder, '.yakit-tree-file-icon');
    const fileDrag = box(file, '.ant-tree-draggable-icon');
    const fileCheckbox = box(file, '.ant-tree-checkbox');
    const fileIcon = box(file, '.yakit-tree-file-icon');
    if (
      !folderDrag ||
      !folderSwitcher ||
      !folderCheckbox ||
      !folderIcon ||
      !fileDrag ||
      !fileCheckbox ||
      !fileIcon
    ) {
      throw new Error('expected drag, switcher, checkbox, and icon');
    }

    expect(Math.abs(folderSwitcher.left - folderDrag.right)).toBeLessThanOrEqual(1);
    expect(folderSwitcher.right).toBeLessThanOrEqual(folderCheckbox.left + 0.5);
    const rowBox = folder.querySelector('.yakit-tree-file-row')?.getBoundingClientRect();
    if (!rowBox) throw new Error('expected file row');
    const switcherMid = folderSwitcher.top + folderSwitcher.height / 2;
    const rowMid = rowBox.top + rowBox.height / 2;
    expect(Math.abs(switcherMid - rowMid)).toBeLessThanOrEqual(1);
    expect(folderCheckbox.right).toBeLessThanOrEqual(folderIcon.left + 0.5);
    expect(fileDrag.left).toBeGreaterThan(folderDrag.left + 8);
    expect(Math.abs(fileDrag.left - folderSwitcher.left)).toBeLessThanOrEqual(1);
    expect(fileCheckbox.left - folderCheckbox.left).toBeGreaterThanOrEqual(12);
    const fileSwitcher = file.querySelector('.ant-tree-switcher');
    expect(fileSwitcher?.className).toMatch(/noop/);
    expect(getComputedStyle(fileSwitcher as Element).display).not.toBe('none');
    expect(fileSwitcher?.querySelector('svg')).toBeNull();
    expect(
      parseFloat(
        getComputedStyle(folder.querySelector('.ant-tree-draggable-icon') as Element).width,
      ),
    ).toBe(24);
    expect(
      parseFloat(getComputedStyle(folder.querySelector('.ant-tree-switcher') as Element).width),
    ).toBe(24);
  });

  it('keeps file drag, arrow, and checkbox in place when showLine is off', () => {
    const props = { checkable: true, defaultExpandAll: true, draggable: true, treeData };
    const lined = render(<Tree.DirectoryTree showLine {...props} />);
    const plain = render(<Tree.DirectoryTree {...props} />);
    const lefts = (container: HTMLElement) => {
      const row = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find((node) =>
        node.textContent?.includes('parent'),
      );
      if (!row) throw new Error('expected folder row');
      return [
        '.ant-tree-draggable-icon',
        '.ant-tree-switcher',
        '.ant-tree-checkbox',
        '.yakit-tree-file-icon',
      ].map(
        (selector) => row.querySelector<HTMLElement>(selector)?.getBoundingClientRect().left ?? NaN,
      );
    };
    const linedLefts = lefts(lined.container);
    const plainLefts = lefts(plain.container);
    linedLefts.forEach((left, index) => {
      expect(Math.abs(left - plainLefts[index])).toBeLessThanOrEqual(1);
    });
  });

  it('draws file-tree guides at antd directory spacing when showLine is on', () => {
    const { container } = render(
      <Tree.DirectoryTree showLine defaultExpandAll treeData={treeData} />,
    );
    const leafRow = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find((row) =>
      row.textContent?.includes('child'),
    );
    const indent = leafRow?.querySelector<HTMLElement>('.ant-tree-indent-unit');
    const folderSwitcher = container.querySelector<HTMLElement>(
      '.ant-tree-switcher:not(.ant-tree-switcher-noop)',
    );
    if (!indent || !folderSwitcher) throw new Error('expected line parts');

    expect(container.querySelector('.ant-tree-show-line')).toBeTruthy();
    expect(parseFloat(getComputedStyle(indent).width)).toBe(24);
    expect(parseFloat(getComputedStyle(folderSwitcher).width)).toBe(24);
    const guide = getComputedStyle(indent, '::before');
    expect(guide.borderRightWidth).toBe('1px');
    expect(parseFloat(guide.right)).toBe(12);
    const leaf = leafRow?.querySelector<HTMLElement>('.ant-tree-switcher-leaf-line');
    if (!leaf) throw new Error('expected leaf elbow');
    expect(getComputedStyle(leaf).display).not.toBe('none');
    expect(parseFloat(getComputedStyle(leaf).width)).toBe(24);
    expect(container.querySelector('.yakit-tree-leaf-icon')).toBeNull();
  });

  it('puts a file glyph in the leaf switcher when showLeafIcon is on', () => {
    const { container } = render(
      <Tree.DirectoryTree
        checkable
        defaultExpandAll
        draggable
        showLine={{ showLeafIcon: true }}
        treeData={treeData}
      />,
    );
    const leafRow = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find((row) =>
      row.textContent?.includes('child'),
    );
    const switcher = leafRow?.querySelector<HTMLElement>('.ant-tree-switcher');
    const icon = switcher?.querySelector('.yakit-tree-leaf-icon');
    const indent = leafRow?.querySelector<HTMLElement>('.ant-tree-indent-unit-end');
    if (!switcher || !icon || !indent) throw new Error('expected leaf icon on the guide');

    expect(parseFloat(getComputedStyle(switcher).width)).toBe(24);
    expect(getComputedStyle(switcher).display).not.toBe('none');
    expect(switcher.querySelector('.ant-tree-switcher-leaf-line')).toBeNull();
    expect(getComputedStyle(icon).color).toBe('rgb(53, 54, 57)');
  });

  it('indents a file icon with the folder icon', () => {
    const { container } = render(<Tree.DirectoryTree defaultExpandAll treeData={treeData} />);
    const rows = [...container.querySelectorAll<HTMLElement>('.yakit-tree-file-row')];
    const folderIcon = rows[0]?.querySelector('.yakit-tree-file-icon');
    const fileIcon = rows[1]?.querySelector('.yakit-tree-file-icon');

    expect(rows).toHaveLength(2);
    expect(folderIcon && fileIcon).toBeTruthy();
    expect(
      (folderIcon?.getBoundingClientRect().left ?? 0) -
        (rows[0]
          ?.closest('.ant-tree-treenode')
          ?.querySelector('.ant-tree-switcher')
          ?.getBoundingClientRect().right ?? 0),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(
        (folderIcon?.getBoundingClientRect().left ?? 0) -
          (fileIcon?.getBoundingClientRect().left ?? 0),
      ),
    ).toBeLessThanOrEqual(1);
    expect(getComputedStyle(folderIcon?.querySelector('.yakit-icon') as Element).color).toBe(
      'rgb(53, 54, 57)',
    );
  });

  it('keeps the file icon against the arrow when dragging is on but the drag icon and lines are off', () => {
    const { container } = render(
      <Tree.DirectoryTree defaultExpandAll draggable={{ icon: false }} treeData={treeData} />,
    );
    const rows = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')];
    const folder = rows.find((row) => row.textContent?.includes('parent'));
    const file = rows.find((row) => row.textContent?.includes('child'));
    const arrow = folder?.querySelector<HTMLElement>('.ant-tree-switcher svg');
    const folderIcon = folder?.querySelector<HTMLElement>('.yakit-tree-file-icon');
    const fileIcon = file?.querySelector<HTMLElement>('.yakit-tree-file-icon');
    if (!arrow || !folderIcon || !fileIcon) throw new Error('expected arrow and icons');

    expect(folder?.querySelector('.ant-tree-draggable-icon')).toBeNull();
    expect(
      folderIcon.getBoundingClientRect().left - arrow.getBoundingClientRect().right,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(folderIcon.getBoundingClientRect().left - fileIcon.getBoundingClientRect().left),
    ).toBeLessThanOrEqual(1);
  });

  it('hides file icons when showIcon is false and uses the tree icon when it is true', () => {
    const hidden = render(
      <Tree.DirectoryTree defaultExpandAll showIcon={false} treeData={treeData} />,
    );
    expect(hidden.container.querySelector('.yakit-tree-file-icon')).toBeNull();
    cleanup();

    const shown = render(
      <Tree.DirectoryTree
        defaultExpandAll
        showIcon
        icon={<span className="custom-tree-icon">mark</span>}
        treeData={treeData}
      />,
    );
    expect(shown.container.querySelector('.custom-tree-icon')?.textContent).toBe('mark');
  });

  it('submits the current file-tree text on enter and on blur', async () => {
    const onEditSubmit = vi.fn();
    const view = render(
      <Tree.DirectoryTree
        defaultExpandAll
        editingKey="child"
        editingValue="Untitled-2"
        treeData={treeData}
        onEditSubmit={onEditSubmit}
      />,
    );
    const input = view.container.querySelector('input');
    if (!input) throw new Error('expected edit input');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(input.value.length);

    input.focus();
    await userEvent.keyboard('{Enter}');
    input.blur();
    expect(onEditSubmit).toHaveBeenCalledTimes(1);
    expect(onEditSubmit).toHaveBeenCalledWith('Untitled-2', 'child');
    expect(view.container.querySelector('input')).toBe(input);

    flushSync(() => {
      view.root.render(
        <Tree.DirectoryTree
          defaultExpandAll
          editingValue="Untitled-2"
          treeData={treeData}
          onEditSubmit={onEditSubmit}
        />,
      );
    });
    expect(view.container.querySelector('input')).toBeNull();
    expect(view.container.textContent).toContain('child');

    cleanup();
    onEditSubmit.mockClear();
    const blurred = render(
      <Tree.DirectoryTree
        defaultExpandAll
        editingKey="child"
        editingValue="Untitled-2"
        treeData={treeData}
        onEditSubmit={onEditSubmit}
      />,
    );
    const next = blurred.container.querySelector('input');
    if (!next) throw new Error('expected edit input');
    next.focus();
    await userEvent.tab();

    expect(onEditSubmit).toHaveBeenCalledTimes(1);
    expect(onEditSubmit).toHaveBeenCalledWith('Untitled-2', 'child');
    expect(blurred.container.querySelector('input')).toBe(next);

    flushSync(() => {
      blurred.root.render(
        <Tree.DirectoryTree
          defaultExpandAll
          editingValue="Untitled-2"
          treeData={treeData}
          onEditSubmit={onEditSubmit}
        />,
      );
    });
    expect(blurred.container.querySelector('input')).toBeNull();
    expect(blurred.container.textContent).toContain('child');
  });

  it('selects the caller range and keeps the suffix outside it', () => {
    const name = 'readme.yak';
    const { container } = render(
      <Tree.DirectoryTree
        defaultExpandAll
        editingKey="child"
        editingSelection={{ start: 0, end: name.lastIndexOf('.') }}
        editingValue={name}
        treeData={treeData}
      />,
    );
    const input = container.querySelector('input');
    if (!input) throw new Error('expected edit input');

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('readme'.length);
    expect(input.value.slice(input.selectionEnd ?? 0)).toBe('.yak');
  });

  it('selects text when editing starts after the row is already shown', () => {
    const data = [{ key: 'file', title: 'extensions.yak', isLeaf: true }];
    const view = render(<Tree.DirectoryTree defaultExpandAll treeData={data} />);

    flushSync(() => {
      view.root.render(
        <Tree.DirectoryTree
          defaultExpandAll
          editingKey="file"
          editingValue="extensions.yak"
          treeData={data}
        />,
      );
    });
    const whole = view.container.querySelector('input');
    if (!whole) throw new Error('expected edit input');
    expect(whole.selectionStart).toBe(0);
    expect(whole.selectionEnd).toBe('extensions.yak'.length);

    flushSync(() => {
      view.root.render(
        <Tree.DirectoryTree
          defaultExpandAll
          editingKey="file"
          editingSelection={{ start: 0, end: 'extensions'.length }}
          editingValue="extensions.yak"
          treeData={data}
        />,
      );
    });
    const named = view.container.querySelector('input');
    if (!named) throw new Error('expected edit input');
    expect(named.selectionStart).toBe(0);
    expect(named.selectionEnd).toBe('extensions'.length);
  });

  it('keeps editing and expansion when the input is clicked', async () => {
    const { container } = render(
      <Tree.DirectoryTree
        defaultExpandedKeys={['parent']}
        editingKey="child"
        editingValue="Untitled-2"
        treeData={treeData}
      />,
    );
    const input = container.querySelector('input');
    if (!input) throw new Error('expected edit input');

    await userEvent.click(input);

    expect(container.querySelector('input')).toBe(input);
    expect(container.querySelector('[aria-expanded="true"]')).toBeTruthy();
  });

  it('hides the file checkbox until checkable is set, then places it before the icon', () => {
    const plain = render(<Tree.DirectoryTree treeData={treeData} />);
    expect(plain.container.querySelector('.ant-tree-checkbox')).toBeNull();
    cleanup();

    const { container } = render(<Tree.DirectoryTree checkable treeData={treeData} />);
    const checkbox = container.querySelector('.ant-tree-checkbox');
    const icon = container.querySelector('.yakit-tree-file-icon');

    expect(checkbox).toBeTruthy();
    expect(icon).toBeTruthy();
    expect(
      (checkbox?.getBoundingClientRect().right ?? 0) <= (icon?.getBoundingClientRect().left ?? 0),
    ).toBe(true);
  });

  it('renders a file suffix after the title only when one is provided', () => {
    const plain = render(<Tree.DirectoryTree treeData={treeData} />);
    expect(plain.container.querySelector('.yakit-tree-file-suffix')).toBeNull();
    cleanup();

    const { container } = render(
      <Tree.DirectoryTree
        suffix={() => <button type="button">search</button>}
        treeData={treeData}
      />,
    );
    const title = container.querySelector('.yakit-tree-file-title');
    const suffix = container.querySelector('.yakit-tree-file-suffix');

    expect(suffix?.textContent).toBe('search');
    expect(
      title && suffix && title.compareDocumentPosition(suffix) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('draws focus on a different row from selection and reports focusedKey changes', async () => {
    const onFocusedKeyChange = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree
        defaultExpandAll
        focusedKey="parent"
        selectedKeys={['child']}
        treeData={treeData}
        onFocusedKeyChange={onFocusedKeyChange}
        onSelect={onSelect}
      />,
    );

    const focusedRow = container.querySelector('.yakit-tree-file-focused');
    const selected = container.querySelector(
      '.ant-tree-node-content-wrapper.ant-tree-node-selected',
    );
    expect(focusedRow?.textContent).toContain('parent');
    expect(selected?.textContent).toContain('child');
    expect(selected?.querySelector('.yakit-tree-file-focused')).toBeNull();

    const childTitle = [...container.querySelectorAll('.yakit-tree-file-title')].find(
      (node) => node.textContent === 'child',
    );
    if (!childTitle) throw new Error('expected child title');
    await userEvent.click(childTitle);
    expect(onFocusedKeyChange).toHaveBeenCalledWith('child');
    expect(onSelect).toHaveBeenCalled();
  });

  it('website select does not sync check by default', async () => {
    const onSelect = vi.fn();
    const onCheck = vi.fn();
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [
          { key: 'child-a', title: 'child-a', isLeaf: true },
          { key: 'child-b', title: 'child-b', isLeaf: true },
        ],
      },
    ];
    const { container } = render(
      <Tree.WebsiteTree
        checkable
        defaultExpandAll
        treeData={data}
        onCheck={onCheck}
        onSelect={onSelect}
      />,
    );
    const parentTitle = [...container.querySelectorAll('.ant-tree-title')].find(
      (node) => node.textContent === 'parent',
    );
    if (!parentTitle) throw new Error('expected parent title');
    await userEvent.click(parentTitle);

    expect(onSelect).toHaveBeenCalled();
    expect(onCheck).not.toHaveBeenCalled();
    expect(container.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(0);
  });

  it('paints an indeterminate checkbox as a primary box with a white inset border', () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [
          { key: 'a', title: 'a' },
          { key: 'b', title: 'b' },
        ],
      },
    ];
    const { container } = render(
      <Tree checkable defaultCheckedKeys={['a']} defaultExpandAll treeData={data} />,
    );
    const box = container.querySelector<HTMLElement>('.ant-tree-checkbox-indeterminate');
    if (!box) throw new Error('expected indeterminate checkbox');
    expect(getComputedStyle(box).backgroundColor).toBe('rgb(242, 140, 69)');
    const mark = getComputedStyle(box, '::after');
    expect(mark.width).toBe('12px');
    expect(mark.height).toBe('12px');
    expect(mark.borderTopWidth).toBe('1px');
    expect(mark.borderTopColor).toBe('rgb(255, 255, 255)');
    expect(
      mark.backgroundColor === 'rgba(0, 0, 0, 0)' || mark.backgroundColor === 'transparent',
    ).toBe(true);
  });

  it('website selected parent keeps switcher icon in the DOM', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [{ key: 'child', title: 'child', isLeaf: true }],
      },
    ];
    const { container } = render(
      <Tree.WebsiteTree defaultExpandAll defaultSelectedKeys={['parent']} treeData={data} />,
    );
    const selected = container.querySelector('.ant-tree-treenode-selected');
    if (!selected) throw new Error('expected selected treenode');
    const switcher = selected.querySelector('.ant-tree-switcher');
    if (!switcher) throw new Error('expected switcher');
    expect(switcher.className).not.toMatch(/noop/);
    expect(switcher.querySelector('.yakit-tree-switcher-icon, .yakit-icon, svg')).not.toBeNull();
    const content = selected.querySelector<HTMLElement>('.ant-tree-node-content-wrapper');
    if (!content) throw new Error('expected content');
    expect(getComputedStyle(switcher).transitionDuration).toBe('0s');
    expect(getComputedStyle(content).transitionDuration).toBe('0s');
  });

  it('website showLine true paints leaf DocumentOutlined in the switcher column', async () => {
    const { container } = render(
      <Tree.WebsiteTree
        checkable
        defaultExpandAll
        showIcon
        showLine
        treeData={[
          {
            key: 'p',
            title: 'parent',
            children: [{ key: 'c', title: 'child', isLeaf: true }],
          },
        ]}
      />,
    );
    expect(container.querySelector('.yakit-tree-show-leaf-icon')).toBeTruthy();
    const leafRow = [...container.querySelectorAll('.ant-tree-treenode')].find(
      (n) => n.querySelector('.ant-tree-title')?.textContent === 'child',
    );
    const switcher = leafRow?.querySelector('.ant-tree-switcher');
    const leafIcon =
      switcher?.querySelector('.yakit-tree-leaf-icon') ??
      switcher?.querySelector('.ant-tree-switcher-line-icon') ??
      switcher?.querySelector('.ant-tree-switcher-line-custom-icon');
    expect(leafIcon).toBeTruthy();
    expect(leafIcon!.getBoundingClientRect().width).toBeGreaterThan(0);
    // checkbox far-left, then switcher/leaf
    const checkbox = leafRow!.querySelector('.ant-tree-checkbox') as HTMLElement;
    expect(checkbox.getBoundingClientRect().left).toBeLessThan(
      (switcher as HTMLElement).getBoundingClientRect().left,
    );
    const indent = leafRow!.querySelector('.ant-tree-indent') as HTMLElement | null;
    if (indent) {
      expect(checkbox.getBoundingClientRect().right).toBeLessThanOrEqual(
        indent.getBoundingClientRect().left + 0.5,
      );
      expect(indent.getBoundingClientRect().right).toBeLessThanOrEqual(
        (switcher as HTMLElement).getBoundingClientRect().left + 0.5,
      );
    }
  });

  it('website showLine selected parent keeps Action bg and visible switcher icon', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [{ key: 'child', title: 'child', isLeaf: true }],
      },
    ];
    const { container } = render(
      <Tree.WebsiteTree
        checkable
        defaultExpandAll
        defaultSelectedKeys={['parent']}
        showLine={{ showLeafIcon: true }}
        treeData={data}
      />,
    );
    const selected = container.querySelector('.ant-tree-treenode-selected');
    if (!selected) throw new Error('expected selected treenode');
    const switcher = selected.querySelector<HTMLElement>('.ant-tree-switcher');
    if (!switcher) throw new Error('expected switcher');
    expect(switcher.className).not.toMatch(/noop/);
    // Action paint: background may lose to antd show-line transparent in some hosts;
    // ::after must still be Main-Pressed so white currentColor icon stays visible.
    const afterBg = getComputedStyle(switcher, '::after').backgroundColor;
    expect(afterBg).toBe('rgb(219, 117, 46)');
    const icon =
      switcher.querySelector<HTMLElement>('.yakit-tree-switcher-icon') ??
      switcher.querySelector<HTMLElement>('.yakit-icon');
    expect(icon).not.toBeNull();
    // currentColor — not inline white — inherits switcher color
    expect(icon!.style.color || '').not.toContain('Basic-White');
    expect(getComputedStyle(switcher).color).toBe('rgb(255, 255, 255)');
    expect(switcher.querySelector('svg')!.getBoundingClientRect().width).toBeGreaterThan(0);
  });

  it('default showLine selected does not force white switcher leaf icon without Action bg', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [{ key: 'child', title: 'child', isLeaf: true }],
      },
    ];
    const { container } = render(
      <Tree
        defaultExpandAll
        defaultSelectedKeys={['child']}
        showLine={{ showLeafIcon: true }}
        treeData={data}
      />,
    );
    const switcher = container.querySelector<HTMLElement>(
      '.ant-tree-treenode-selected > .ant-tree-switcher',
    );
    if (!switcher) throw new Error('expected selected leaf switcher');
    const leafIcon =
      switcher.querySelector<HTMLElement>('.yakit-tree-leaf-icon') ??
      switcher.querySelector<HTMLElement>('.ant-tree-switcher-line-icon');
    expect(leafIcon).not.toBeNull();
    // Secondary grey — NOT white on transparent switcher
    expect(getComputedStyle(leafIcon!).color).toBe('rgb(134, 140, 151)');
  });

  it('website disabled selected: content Neutral continuous under cleared switcher; indent transparent; no Action ::after', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [{ key: 'child', title: 'child', isLeaf: true, disabled: true }],
      },
    ];
    const { container } = render(
      <Tree.WebsiteTree
        checkable
        defaultExpandAll
        defaultSelectedKeys={['child']}
        showLine={{ showLeafIcon: true }}
        treeData={data}
      />,
    );
    const selected = container.querySelector(
      '.ant-tree-treenode-disabled.ant-tree-treenode-selected',
    );
    if (!selected) throw new Error('expected disabled selected treenode');
    const switcher = selected.querySelector<HTMLElement>('.ant-tree-switcher');
    const content = selected.querySelector<HTMLElement>('.ant-tree-node-content-wrapper');
    const indent = selected.querySelector<HTMLElement>('.ant-tree-indent');
    if (!switcher) throw new Error('expected switcher');
    if (!content) throw new Error('expected content');
    const neutralDisable = 'rgb(192, 198, 209)';
    expect(getComputedStyle(content).backgroundColor).toBe(neutralDisable);
    // leaf noop switcher must be cleared — no stray Action/Basic block right of the line
    expect(switcher.classList.contains('ant-tree-switcher-noop')).toBe(true);
    const switcherBg = getComputedStyle(switcher).backgroundColor;
    expect(switcherBg === 'rgba(0, 0, 0, 0)' || switcherBg === 'transparent').toBe(true);
    // content pulled under switcher for a continuous Neutral bar
    expect(getComputedStyle(content).marginInlineStart).toBe('-20px');
    if (indent) {
      const indentBg = getComputedStyle(indent).backgroundColor;
      expect(indentBg === 'rgba(0, 0, 0, 0)' || indentBg === 'transparent').toBe(true);
    }
    const after = getComputedStyle(switcher, '::after');
    expect(after.backgroundColor).not.toBe('rgb(242, 140, 69)');
    expect(after.backgroundColor).not.toBe('rgb(230, 114, 42)');
    expect(after.backgroundColor).not.toBe('rgb(245, 159, 100)');
    selected.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    const hoverSwitcherBg = getComputedStyle(switcher).backgroundColor;
    expect(hoverSwitcherBg === 'rgba(0, 0, 0, 0)' || hoverSwitcherBg === 'transparent').toBe(true);
    expect(getComputedStyle(content).backgroundColor).toBe(neutralDisable);
  });
  it('website disabled selected parent switcher uses Neutral-Disable (checkbox disabled-checked chrome), not Action', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        disabled: true,
        children: [{ key: 'child', title: 'child', isLeaf: true }],
      },
    ];
    const { container } = render(
      <Tree.WebsiteTree
        checkable
        defaultExpandAll
        defaultSelectedKeys={['parent']}
        showLine
        treeData={data}
      />,
    );
    const selected = container.querySelector(
      '.ant-tree-treenode-disabled.ant-tree-treenode-selected',
    );
    if (!selected) throw new Error('expected disabled selected parent');
    const switcher = selected.querySelector<HTMLElement>('.ant-tree-switcher');
    if (!switcher) throw new Error('expected switcher');
    expect(switcher.classList.contains('ant-tree-switcher-noop')).toBe(false);
    // Neutral-Disable ≈ #c0c6d1 — same as checkbox disabled-checked fill
    const neutralDisable = 'rgb(192, 198, 209)';
    expect(getComputedStyle(switcher).backgroundColor).toBe(neutralDisable);
    expect(getComputedStyle(switcher).color).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(switcher).width).toBe('20px');
    expect(getComputedStyle(switcher).height).toBe('24px');
    expect(getComputedStyle(switcher).borderTopLeftRadius).toBe('4px');
    expect(getComputedStyle(switcher).borderBottomLeftRadius).toBe('4px');
    expect(getComputedStyle(switcher).borderTopRightRadius).toBe('0px');
    const glyphSize = switcher.querySelector('svg');
    if (glyphSize) {
      expect(getComputedStyle(glyphSize).width).toBe('12px');
      expect(getComputedStyle(glyphSize).height).toBe('12px');
    }
    const afterBg = getComputedStyle(switcher, '::after').backgroundColor;
    expect(afterBg).toBe(neutralDisable);
    // must not be Action Main-Pressed / Primary orange
    expect(afterBg).not.toBe('rgb(242, 140, 69)');
    expect(afterBg).not.toBe('rgb(230, 114, 42)');
    expect(afterBg).not.toBe('rgb(245, 159, 100)');
    // hover of the folder switcher is Neutral-Bg-Hover; the arrow stays readable
    const content = selected.querySelector<HTMLElement>('.ant-tree-node-content-wrapper');
    if (!content) throw new Error('expected content');
    expect(getComputedStyle(content).backgroundColor).toBe(neutralDisable);
    await userEvent.hover(content);
    expect(getComputedStyle(switcher).backgroundColor).toBe(neutralDisable);
    expect(getComputedStyle(switcher, '::after').backgroundColor).toBe(neutralDisable);
    expect(getComputedStyle(content).backgroundColor).toBe(neutralDisable);
    await userEvent.hover(switcher);
    const hoverBg = 'rgb(238, 240, 243)';
    expect(getComputedStyle(switcher).backgroundColor).toBe(hoverBg);
    expect(getComputedStyle(switcher, '::after').backgroundColor).toBe(hoverBg);
    expect(getComputedStyle(content).backgroundColor).toBe(neutralDisable);
    const glyph = switcher.querySelector('svg');
    if (glyph) expect(getComputedStyle(glyph).color).toBe('rgb(134, 140, 151)');
  });

  it('disabled node keeps expand; arrow stays Secondary (default and a single website node)', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        disabled: true,
        children: [{ key: 'child', title: 'child' }],
      },
    ];

    for (const Component of [Tree, Tree.WebsiteTree]) {
      cleanup();
      const { container } = render(
        <Component
          checkable
          treeData={data}
          {...(Component === Tree
            ? { defaultCheckedKeys: ['parent'], defaultSelectedKeys: ['parent'] }
            : {})}
        />,
      );
      expect(container.textContent).not.toContain('child');

      const node = container.querySelector('.ant-tree-treenode-disabled');
      if (!node) throw new Error(`expected disabled treenode (${Component.displayName})`);
      const switcher = node.querySelector<HTMLElement>('.ant-tree-switcher');
      if (!switcher) throw new Error('expected switcher');
      const arrow = 'rgb(134, 140, 151)';
      expect(getComputedStyle(switcher).color).toBe(arrow);
      const glyph = switcher.querySelector('svg');
      if (glyph) expect(getComputedStyle(glyph).color).toBe(arrow);
      expect(getComputedStyle(switcher).cursor).toBe('pointer');

      // Simulate hover — disabled switcher must stay transparent (no Neutral-Bg-Hover)
      node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      switcher.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      const hoverBg = getComputedStyle(switcher).backgroundColor;
      expect(hoverBg === 'rgba(0, 0, 0, 0)' || hoverBg === 'transparent').toBe(true);

      await userEvent.click(switcher);
      expect(container.textContent).toContain('child');
    }
  });

  it('website tree disabled keeps unselected arrows and leaf glyphs on Secondary', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [{ key: 'child', title: 'child', isLeaf: true }],
      },
      {
        key: 'other',
        title: 'other',
        children: [{ key: 'other-child', title: 'other-child', isLeaf: true }],
      },
    ];
    const { container } = render(
      <Tree.WebsiteTree
        checkable
        defaultExpandAll
        defaultSelectedKeys={['parent']}
        disabled
        showLine={{ showLeafIcon: true }}
        treeData={data}
      />,
    );
    const secondary = 'rgb(134, 140, 151)';
    const leafDisable = 'rgb(192, 198, 209)';
    const child = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find(
      (node) => node.querySelector('.ant-tree-title')?.textContent === 'child',
    );
    const leaf = child?.querySelector<HTMLElement>(
      '.yakit-tree-leaf-icon, .ant-tree-switcher-line-icon',
    );
    if (!leaf) throw new Error('expected unselected leaf glyph');
    expect(child?.classList.contains('ant-tree-treenode-selected')).toBe(false);
    expect(getComputedStyle(leaf).color).toBe(leafDisable);
    const other = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find(
      (node) => node.querySelector('.ant-tree-title')?.textContent === 'other',
    );
    const arrow = other?.querySelector<HTMLElement>('.ant-tree-switcher svg');
    if (!arrow) throw new Error('expected unselected arrow');
    expect(getComputedStyle(arrow).color).toBe(secondary);
    expect(getComputedStyle(arrow.parentElement!).cursor).toBe('pointer');
    const leafSwitcher = child?.querySelector<HTMLElement>('.ant-tree-switcher');
    if (!leafSwitcher) throw new Error('expected leaf switcher');
    expect(getComputedStyle(leafSwitcher).cursor).toBe('not-allowed');
    const parent = container.querySelector<HTMLElement>(
      '.ant-tree-treenode-selected > .ant-tree-switcher',
    );
    if (!parent) throw new Error('expected selected parent switcher');
    expect(getComputedStyle(parent).color).toBe('rgb(255, 255, 255)');
  });

  it('default tree disabled keeps switcher arrows on Secondary', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [{ key: 'child', title: 'child' }],
      },
    ];
    const { container } = render(
      <Tree
        checkable
        defaultExpandAll
        defaultSelectedKeys={['parent']}
        disabled
        showLine
        treeData={data}
      />,
    );
    const secondary = 'rgb(134, 140, 151)';
    const arrows = [
      ...container.querySelectorAll<HTMLElement>('.ant-tree-switcher:not(.ant-tree-switcher-noop)'),
    ];
    expect(arrows.length).toBeGreaterThan(0);
    for (const switcher of arrows) {
      expect(getComputedStyle(switcher).color).toBe(secondary);
      const glyph = switcher.querySelector('svg');
      const path = switcher.querySelector('svg path');
      if (!glyph || !path) throw new Error('expected arrow glyph');
      expect(getComputedStyle(glyph).color).toBe(secondary);
      expect(getComputedStyle(path).stroke).toBe(secondary);
    }
  });

  it('showLeafIcon sits in switcher slot before checkbox (antd order)', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [{ key: 'child', title: 'child', isLeaf: true }],
      },
    ];
    const { container } = render(
      <Tree checkable defaultExpandAll showLine={{ showLeafIcon: true }} treeData={data} />,
    );
    const row = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find(
      (n) => n.querySelector('.ant-tree-title')?.textContent === 'child',
    );
    if (!row) throw new Error('expected leaf row');
    const switcher = row.querySelector<HTMLElement>('.ant-tree-switcher');
    const checkbox = row.querySelector<HTMLElement>('.ant-tree-checkbox');
    const leafIcon =
      switcher?.querySelector<HTMLElement>('.yakit-tree-leaf-icon') ??
      switcher?.querySelector<HTMLElement>('.ant-tree-switcher-line-icon');
    expect(leafIcon).not.toBeNull();
    expect(checkbox).not.toBeNull();
    // leaf glyph is inside switcher, not beside title as iconEle
    expect(row.querySelector('.ant-tree-node-content-wrapper .yakit-tree-leaf-icon')).toBeNull();
    const sBox = switcher!.getBoundingClientRect();
    const cBox = checkbox!.getBoundingClientRect();
    expect(sBox.right).toBeLessThanOrEqual(cBox.left + 0.5);
    // breathing room between switcher and checkbox
    expect(cBox.left - sBox.right).toBeGreaterThanOrEqual(3.5);
  });

  it('website leaf does not cover the guide line joints', () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [
          { key: 'leaf', title: 'leaf', isLeaf: true },
          { key: 'leaf2', title: 'leaf2', isLeaf: true },
        ],
      },
    ];
    const { container } = render(
      <Tree.WebsiteTree
        checkable
        defaultExpandAll
        defaultSelectedKeys={['leaf2']}
        draggable
        showLine={{ showLeafIcon: true }}
        treeData={data}
      />,
    );
    const row = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find(
      (node) => node.querySelector('.ant-tree-title')?.textContent === 'leaf2',
    );
    if (!row) throw new Error('missing row');
    const indent = row.querySelector<HTMLElement>('.ant-tree-indent');
    const unit = row.querySelector<HTMLElement>('.ant-tree-indent-unit');
    const switcher = row.querySelector<HTMLElement>('.ant-tree-switcher');
    if (!indent || !unit || !switcher) throw new Error('expected indent and switcher');
    const rowBox = row.getBoundingClientRect();
    const switcherBox = switcher.getBoundingClientRect();
    expect(switcherBox.top).toBeGreaterThanOrEqual(rowBox.top - 0.5);
    expect(switcherBox.bottom).toBeLessThanOrEqual(rowBox.bottom + 0.5);
    expect(Number(getComputedStyle(indent).zIndex)).toBeGreaterThan(
      Number(getComputedStyle(switcher).zIndex) || 0,
    );
    const line = getComputedStyle(unit, '::before');
    expect(line.bottom).toBe('-4px');
    expect(Number(line.zIndex)).toBeGreaterThan(Number(getComputedStyle(switcher).zIndex) || 0);
  });

  it('showLine drag outline keeps indent guides above chrome', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [{ key: 'child', title: 'child', isLeaf: true }],
      },
    ];
    const { container } = render(
      <Tree defaultExpandAll draggable showLine={{ showLeafIcon: true }} treeData={data} />,
    );
    const row = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find(
      (n) => n.querySelector('.ant-tree-title')?.textContent === 'child',
    );
    if (!row) throw new Error('expected leaf row');
    row.classList.add('dragging');
    const after = getComputedStyle(row, '::after');
    expect(after.borderTopColor).toBe('rgb(242, 140, 69)');
    // transparent fill — do not erase showLine with opaque chrome
    expect(
      after.backgroundColor === 'rgba(0, 0, 0, 0)' || after.backgroundColor === 'transparent',
    ).toBe(true);
    // outline above indent so primary stroke is continuous (not punched by guide lines)
    expect(Number(after.zIndex) || 0).toBeGreaterThanOrEqual(1);
    expect(Number(after.zIndex)).toBeGreaterThanOrEqual(3);
  });

  it('default switcher uses ChevronRight when collapsed and ChevronDown when expanded', async () => {
    const closed = render(<Tree treeData={treeData} />);
    const closedSwitcher = closed.container.querySelector<HTMLElement>(
      '.ant-tree-switcher:not(.ant-tree-switcher-noop)',
    );
    if (!closedSwitcher) throw new Error('expected closed switcher');
    expect(closedSwitcher.className).toMatch(/switcher_close/);
    const closedPath = closedSwitcher.querySelector('svg path')?.getAttribute('d') ?? '';
    expect(closedPath.length).toBeGreaterThan(0);
    cleanup();

    const opened = render(<Tree defaultExpandAll treeData={treeData} />);
    const openSwitcher = opened.container.querySelector<HTMLElement>(
      '.ant-tree-switcher:not(.ant-tree-switcher-noop)',
    );
    if (!openSwitcher) throw new Error('expected open switcher');
    expect(openSwitcher.className).toMatch(/switcher_open/);
    const openPath = openSwitcher.querySelector('svg path')?.getAttribute('d') ?? '';
    expect(openPath.length).toBeGreaterThan(0);
    // Collapsed right-chevron path must differ from expanded down-chevron (no sticky expand glyph).
    expect(openPath).not.toBe(closedPath);
  });

  it('expanded switchers share the same chevron path, including disabled nodes, and stay unfilled / unrotated', async () => {
    const data = [
      {
        title: 'parent 1',
        key: '0-0',
        children: [
          {
            title: 'parent 1-0',
            key: '0-0-0',
            disabled: true,
            children: [
              { title: 'leaf', key: '0-0-0-0' },
              { title: 'leaf2', key: '0-0-0-1' },
            ],
          },
          {
            title: 'parent 1-1',
            key: '0-0-1',
            children: [{ title: 'sss', key: '0-0-1-0' }],
          },
        ],
      },
    ];

    const assertOpenSwitchersConsistent = (container: HTMLElement) => {
      const openSwitchers = [
        ...container.querySelectorAll<HTMLElement>(
          '.ant-tree-switcher_open:not(.ant-tree-switcher-noop)',
        ),
      ];
      expect(openSwitchers.length).toBe(3);
      const paths = openSwitchers.map((s) => s.querySelector('svg path')?.getAttribute('d') ?? '');
      expect(paths.every((d) => d.length > 0)).toBe(true);
      // Enabled + disabled expanded siblings must share the same Down chevron (not a filled caret).
      expect(new Set(paths).size).toBe(1);
      for (const s of openSwitchers) {
        const svg = s.querySelector('svg');
        const path = s.querySelector('svg path');
        if (!svg || !path) throw new Error('expected switcher svg');
        expect(getComputedStyle(svg).fill).toBe('none');
        expect(getComputedStyle(path).fill).toBe('none');
        const transform = getComputedStyle(svg).transform;
        expect(transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
      }
      return paths[0];
    };

    const opened = render(<Tree checkable defaultExpandAll showLine treeData={data} />);
    const downPath = assertOpenSwitchersConsistent(opened.container);
    cleanup();

    const website = render(
      <Tree.WebsiteTree checkable defaultExpandAll showLine treeData={data} />,
    );
    const websiteDown = assertOpenSwitchersConsistent(website.container);
    expect(websiteDown).toBe(downPath);

    const row = [...website.container.querySelectorAll('.ant-tree-treenode')].find((node) => {
      const title = node.querySelector('.ant-tree-title');
      return title?.textContent === 'parent 1-1';
    });
    const switcher = row?.querySelector<HTMLElement>(
      '.ant-tree-switcher:not(.ant-tree-switcher-noop)',
    );
    if (!switcher) throw new Error('expected parent 1-1 switcher');
    await userEvent.click(switcher);
    expect(switcher.className).toMatch(/switcher_close/);
    const closedPath = switcher.querySelector('svg path')?.getAttribute('d') ?? '';
    expect(closedPath.length).toBeGreaterThan(0);
    expect(closedPath).not.toBe(downPath);
    const closedSvg = switcher.querySelector('svg');
    if (!closedSvg) throw new Error('expected closed svg');
    expect(getComputedStyle(closedSvg).fill).toBe('none');
    const closedTransform = getComputedStyle(closedSvg).transform;
    expect(closedTransform === 'none' || closedTransform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
  });

  it('website disabled+selected title and iconEle use Basic-White on the Neutral-Disable bar', async () => {
    const data = [
      {
        title: 'parent 1',
        key: '0-0',
        children: [
          {
            title: 'parent 1-0',
            key: '0-0-0',
            children: [
              { title: 'leaf', key: '0-0-0-0' },
              { title: 'leaf2', key: '0-0-0-1' },
            ],
          },
        ],
      },
    ];
    const { container } = render(
      <Tree.WebsiteTree
        checkable
        defaultExpandAll
        defaultSelectedKeys={['0-0-0-0']}
        disabled
        showIcon
        showLine
        treeData={data}
      />,
    );
    const selected = container.querySelector<HTMLElement>(
      '.ant-tree-treenode-disabled.ant-tree-treenode-selected',
    );
    if (!selected) throw new Error('expected disabled selected treenode');
    const title = selected.querySelector<HTMLElement>('.ant-tree-title');
    const icon =
      selected.querySelector<HTMLElement>('.ant-tree-iconEle .yakit-icon') ??
      selected.querySelector<HTMLElement>('.ant-tree-iconEle');
    if (!title || !icon) throw new Error('expected title and iconEle');
    expect(getComputedStyle(title).color).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(icon).color).toBe('rgb(255, 255, 255)');
    // leaf-line glyph in switcher also white
    const leafGlyph =
      selected.querySelector<HTMLElement>('.yakit-tree-leaf-icon') ??
      selected.querySelector<HTMLElement>('.ant-tree-switcher-line-icon');
    if (leafGlyph) {
      expect(getComputedStyle(leafGlyph).color).toBe('rgb(255, 255, 255)');
    }
  });

  it('keeps a stroke icon hollow when a disabled selected row turns icons white', () => {
    const { container } = render(
      <Tree.WebsiteTree
        defaultExpandAll
        disabled
        defaultSelectedKeys={['link']}
        treeData={[
          {
            key: 'dir',
            title: 'dir',
            children: [
              {
                key: 'link',
                title: 'link',
                isLeaf: true,
                icon: () => (
                  <svg data-testid="stroke-icon" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6h8" stroke="currentColor" fill="none" />
                  </svg>
                ),
              },
            ],
          },
        ]}
      />,
    );
    const path = container.querySelector<SVGPathElement>('[data-testid="stroke-icon"] path');
    const folder = container.querySelector<SVGPathElement>(
      '.ant-tree-treenode:not(.ant-tree-treenode-selected) .ant-tree-iconEle path',
    );
    if (!path || !folder) throw new Error('expected stroke icon and folder');
    expect(getComputedStyle(path).fill).toBe('none');
    expect(getComputedStyle(path).stroke).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(folder).fill).toBe('rgb(192, 198, 209)');
  });

  it('uses project tree tokens until the provider overrides them', () => {
    const project = render(
      <Tree treeData={[{ key: 'a', title: 'A' }]} defaultSelectedKeys={['a']} />,
    );
    const custom = render(
      <ConfigProvider
        theme={{
          components: {
            YakitTree: { nodeSelectedBg: 'rgb(1, 2, 3)', titleHeight: 40 },
          },
        }}
      >
        <Tree treeData={[{ key: 'b', title: 'B' }]} defaultSelectedKeys={['b']} />
      </ConfigProvider>,
    );
    const projectNode = project.container.querySelector<HTMLElement>('.ant-tree-node-selected');
    const customNode = custom.container.querySelector<HTMLElement>('.ant-tree-node-selected');
    if (!projectNode || !customNode) throw new Error('expected selected nodes');

    expect(getComputedStyle(projectNode).backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(projectNode).minHeight).not.toBe('40px');
    expect(getComputedStyle(customNode).backgroundColor).toBe('rgb(1, 2, 3)');
    expect(getComputedStyle(customNode).minHeight).toBe('40px');
  });

  it('keeps the variant selected color when a tree token field is undefined', () => {
    const { container } = render(
      <ConfigProvider
        theme={{
          components: {
            YakitTree: { nodeSelectedBg: undefined, titleHeight: 40 },
          },
        }}
      >
        <Tree defaultSelectedKeys={['a']} treeData={[{ key: 'a', title: 'A' }]} />
      </ConfigProvider>,
    );
    const node = container.querySelector<HTMLElement>('.ant-tree-node-selected');
    if (!node) throw new Error('expected selected node');
    expect(getComputedStyle(node).backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(node).minHeight).toBe('40px');
  });

  it('closes again when a controlled expandedKeys list is not written back', async () => {
    const onExpand = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree expandedKeys={[]} treeData={treeData} onExpand={onExpand} />,
    );
    await userEvent.click(fileTitle(container, 'parent'));
    expect(onExpand).toHaveBeenCalledWith(['parent'], expect.objectContaining({ expanded: true }));
    expect(container.textContent).not.toContain('child');
  });

  it('paints defaultFocusedKey and moves it when a folder expands', async () => {
    const initial = render(
      <Tree.DirectoryTree defaultExpandAll defaultFocusedKey="child" treeData={treeData} />,
    );
    expect(initial.container.querySelector('.yakit-tree-file-focused')?.textContent).toContain(
      'child',
    );
    cleanup();

    const onFocusedKeyChange = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree treeData={treeData} onFocusedKeyChange={onFocusedKeyChange} />,
    );
    await userEvent.click(fileTitle(container, 'parent'));
    expect(onFocusedKeyChange).toHaveBeenCalledWith('parent');
    expect(container.querySelector('.yakit-tree-file-focused')?.textContent).toContain('parent');
  });

  it('reports a controlled focus change without moving the ring', async () => {
    const onFocusedKeyChange = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree
        defaultExpandAll
        focusedKey="parent"
        treeData={treeData}
        onFocusedKeyChange={onFocusedKeyChange}
      />,
    );
    await userEvent.click(fileTitle(container, 'child'));
    expect(onFocusedKeyChange).toHaveBeenCalledWith('child');
    expect(container.querySelector('.yakit-tree-file-focused')?.textContent).toContain('parent');
  });

  it('clears the focus ring when focusedKey is null or empty', () => {
    const view = render(
      <Tree.DirectoryTree defaultExpandAll focusedKey="child" treeData={treeData} />,
    );
    expect(view.container.querySelector('.yakit-tree-file-focused')).toBeTruthy();
    flushSync(() => {
      view.root.render(
        <Tree.DirectoryTree defaultExpandAll focusedKey={null} treeData={treeData} />,
      );
    });
    expect(view.container.querySelector('.yakit-tree-file-focused')).toBeNull();
    flushSync(() => {
      view.root.render(<Tree.DirectoryTree defaultExpandAll focusedKey="" treeData={treeData} />);
    });
    expect(view.container.querySelector('.yakit-tree-file-focused')).toBeNull();
  });

  it('keeps the selected file when a directory is clicked afterwards', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree defaultExpandAll treeData={treeData} onSelect={onSelect} />,
    );
    await userEvent.click(fileTitle(container, 'child'));
    await userEvent.click(fileTitle(container, 'parent'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector('.ant-tree-treenode-selected .yakit-tree-file-title')?.textContent,
    ).toBe('child');
  });

  it('keeps a ctrl-clicked directory key when a file is ctrl-clicked', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree defaultExpandAll multiple treeData={treeData} onSelect={onSelect} />,
    );
    await userEvent.click(fileTitle(container, 'parent'), { modifiers: ['Control'] });
    await userEvent.click(fileTitle(container, 'child'), { modifiers: ['Control'] });
    const keys = [...(onSelect.mock.calls.at(-1)?.[0] as React.Key[])].sort();
    expect(keys).toEqual(['child', 'parent']);
    const row = (name: string) => fileTitle(container, name).closest('.ant-tree-treenode');
    expect(row('parent')?.className).not.toMatch(/treenode-selected/);
    expect(row('child')?.className).toMatch(/treenode-selected/);
  });

  it('treats a meta click like a ctrl click', async () => {
    const onSelect = vi.fn();
    const data = [
      { key: 'a', title: 'a', isLeaf: true },
      { key: 'b', title: 'b', isLeaf: true },
    ];
    const { container } = render(
      <Tree.DirectoryTree multiple treeData={data} onSelect={onSelect} />,
    );
    await userEvent.click(fileTitle(container, 'a'), { modifiers: ['Meta'] });
    await userEvent.click(fileTitle(container, 'b'), { modifiers: ['Meta'] });
    expect([...(onSelect.mock.calls.at(-1)?.[0] as React.Key[])].sort()).toEqual(['a', 'b']);
  });

  it('replaces a multiple selection when the next click has no modifier', async () => {
    const data = [
      { key: 'a', title: 'a', isLeaf: true },
      { key: 'b', title: 'b', isLeaf: true },
    ];
    const { container } = render(<Tree.DirectoryTree multiple treeData={data} />);
    await userEvent.click(fileTitle(container, 'a'), { modifiers: ['Control'] });
    await userEvent.click(fileTitle(container, 'b'), { modifiers: ['Control'] });
    await userEvent.click(fileTitle(container, 'a'));
    const selected = [
      ...container.querySelectorAll('.ant-tree-treenode-selected .yakit-tree-file-title'),
    ].map((node) => node.textContent);
    expect(selected).toEqual(['a']);
  });

  it('uses defaultSelectedKeys as the base of the first ctrl click', async () => {
    const onSelect = vi.fn();
    const data = [
      { key: 'a', title: 'a', isLeaf: true },
      { key: 'b', title: 'b', isLeaf: true },
    ];
    const { container } = render(
      <Tree.DirectoryTree
        multiple
        defaultSelectedKeys={['a']}
        treeData={data}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(fileTitle(container, 'b'), { modifiers: ['Control'] });
    const info = onSelect.mock.calls.at(-1);
    expect([...(info?.[0] as React.Key[])].sort()).toEqual(['a', 'b']);
    expect(
      (info?.[1].selectedNodes as { key: React.Key }[]).map((node) => node.key).sort(),
    ).toEqual(['a', 'b']);
  });

  it('skips disabled and unselectable nodes, and files inside an expanded directory, in a shift range', async () => {
    const data = [
      { key: 'a', title: 'a', isLeaf: true },
      { key: 'off', title: 'off', isLeaf: true, disabled: true },
      { key: 'locked', title: 'locked', isLeaf: true, selectable: false },
      {
        key: 'dir',
        title: 'dir',
        children: [{ key: 'inside', title: 'inside', isLeaf: true }],
      },
      { key: 'c', title: 'c', isLeaf: true },
    ];
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree multiple defaultExpandAll treeData={data} onSelect={onSelect} />,
    );
    await userEvent.click(fileTitle(container, 'a'));
    await userEvent.click(fileTitle(container, 'c'), { modifiers: ['Shift'] });
    expect([...(onSelect.mock.calls.at(-1)?.[0] as React.Key[])].sort()).toEqual([
      'a',
      'c',
      'inside',
    ]);
    expect(
      onSelect.mock.calls.at(-1)?.[1].selectedNodes.map((node: { key: React.Key }) => node.key),
    ).toEqual(['a', 'inside', 'c']);
  });

  it('reads custom field names for folders, initial expansion, and shift ranges', async () => {
    const data = [
      {
        id: 'parent',
        name: 'parent',
        nodes: [
          { id: 'a', name: 'a' },
          { id: 'b', name: 'b' },
        ],
      },
    ];
    const fieldNames = { key: 'id', title: 'name', children: 'nodes' };
    const opened = render(
      <Tree.DirectoryTree
        defaultExpandedKeys={['a']}
        fieldNames={fieldNames}
        treeData={data as never}
      />,
    );
    expect(fileTitle(opened.container, 'parent')).toBeTruthy();
    expect(fileTitle(opened.container, 'a')).toBeTruthy();
    expect(fileTitle(opened.container, 'b')).toBeTruthy();
    cleanup();

    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree
        multiple
        defaultExpandAll
        fieldNames={fieldNames}
        treeData={data as never}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(fileTitle(container, 'a'));
    await userEvent.click(fileTitle(container, 'b'), { modifiers: ['Shift'] });
    expect(onSelect.mock.calls.at(-1)?.[0]).toEqual(['a', 'b']);
  });

  it('uses titleRender and a title function', () => {
    const rendered = render(
      <Tree treeData={treeData} titleRender={(node) => <em>{String(node.key)}-custom</em>} />,
    );
    expect(rendered.container.querySelector('em')?.textContent).toBe('parent-custom');
    cleanup();

    const file = render(
      <Tree.DirectoryTree
        treeData={treeData}
        titleRender={(node) => <em>{String(node.key)}-file</em>}
      />,
    );
    expect(file.container.querySelector('.yakit-tree-file-title em')?.textContent).toBe(
      'parent-file',
    );
    cleanup();

    const named = render(
      <Tree.DirectoryTree treeData={[{ key: 'n', title: () => 'from-function', isLeaf: true }]} />,
    );
    expect(named.container.textContent).toContain('from-function');
  });

  it('expands a childless node marked isLeaf false instead of selecting it', async () => {
    const onExpand = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <Tree.DirectoryTree
        treeData={[{ key: 'dir', title: 'dir', isLeaf: false }]}
        onExpand={onExpand}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(fileTitle(container, 'dir'));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onExpand).toHaveBeenCalledWith(['dir'], expect.objectContaining({ expanded: true }));
  });

  it('prefers a file node icon over the tree icon', () => {
    const { container } = render(
      <Tree.DirectoryTree
        icon={() => <span data-testid="tree-icon" />}
        treeData={[
          {
            key: 'file',
            title: 'file',
            isLeaf: true,
            icon: () => <span data-testid="node-icon" />,
          },
        ]}
      />,
    );
    expect(container.querySelector('[data-testid="node-icon"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="tree-icon"]')).toBeNull();
  });

  it('resolves website icons by resource type field order', () => {
    const glyph = (node: React.ReactElement) => {
      const view = render(node);
      return view.container.querySelector('svg path')?.getAttribute('d');
    };
    const folder = glyph(<FolderSolid size={16} color="currentColor" />);
    const file = glyph(<DocumentOutlined size={16} color="currentColor" />);
    const query = glyph(<VariableOutlined size={16} color="currentColor" />);
    const path = glyph(<Link2Outlined size={16} color="currentColor" />);
    const iconPath = (container: HTMLElement, title: string) => {
      const row = [...container.querySelectorAll('.ant-tree-treenode')].find(
        (node) => node.querySelector('.ant-tree-title')?.textContent === title,
      );
      return row?.querySelector('.ant-tree-iconEle svg path')?.getAttribute('d');
    };
    const { container } = render(
      <Tree.WebsiteTree
        treeData={[
          { key: 'camel', title: 'camel', isLeaf: true, data: { resourceType: 'file' } },
          {
            key: 'dataOrder',
            title: 'dataOrder',
            isLeaf: true,
            data: { ResourceType: 'path', resourceType: 'query' },
          },
          {
            key: 'nodeFirst',
            title: 'nodeFirst',
            isLeaf: true,
            resourceType: 'file',
            data: { ResourceType: 'path', resourceType: 'query' },
          },
          {
            key: 'nodeResource',
            title: 'nodeResource',
            isLeaf: true,
            ResourceType: 'query',
            data: { resourceType: 'file' },
          },
          { key: 'bad', title: 'bad', isLeaf: true, resourceType: 'nope' as 'dir' },
          {
            key: 'emptyIcon',
            title: 'emptyIcon',
            isLeaf: true,
            icon: () => null,
          },
        ]}
      />,
    );
    expect(iconPath(container, 'camel')).toBe(file);
    expect(iconPath(container, 'dataOrder')).toBe(path);
    expect(iconPath(container, 'nodeFirst')).toBe(file);
    expect(iconPath(container, 'nodeResource')).toBe(query);
    expect(iconPath(container, 'bad')).toBe(folder);
    const empty = [...container.querySelectorAll('.ant-tree-treenode')].find(
      (node) => node.querySelector('.ant-tree-title')?.textContent === 'emptyIcon',
    );
    expect(empty?.querySelector('.ant-tree-iconEle svg')).toBeNull();
  });

  it('turns website lines off, leaves a boolean showLine to antd, and passes a custom leaf icon through', () => {
    const website = render(<Tree.WebsiteTree showLine={false} treeData={treeData} />);
    expect(website.container.querySelector('.ant-tree-show-line')).toBeNull();
    cleanup();

    const lined = render(<Tree defaultExpandAll showLine treeData={treeData} />);
    expect(lined.container.querySelector('.ant-tree-show-line')).toBeTruthy();
    expect(lined.container.querySelector('.yakit-tree-leaf-icon')).toBeNull();
    expect(lined.container.querySelector('.ant-tree-switcher-leaf-line')).toBeTruthy();
    cleanup();

    const custom = render(
      <Tree
        defaultExpandAll
        showLine={{ showLeafIcon: () => <span data-testid="custom-leaf" /> }}
        treeData={treeData}
      />,
    );
    expect(custom.container.querySelector('[data-testid="custom-leaf"]')).toBeTruthy();
    expect(custom.container.querySelector('.yakit-tree-leaf-icon')).toBeNull();

    const file = render(
      <Tree.DirectoryTree defaultExpandAll showLine={{ showLeafIcon: true }} treeData={treeData} />,
    );
    expect(file.container.querySelector('.yakit-tree-leaf-icon')).toBeTruthy();
    expect(file.container.querySelector('.yakit-tree-show-leaf-icon')).toBeNull();
  });

  it('submits typed text, resets the draft when editingValue changes, and hides the focus ring while editing', async () => {
    const onEditSubmit = vi.fn();
    const view = render(
      <Tree.DirectoryTree
        defaultExpandAll
        editingKey="child"
        editingValue="Old"
        focusedKey="child"
        treeData={treeData}
        onEditSubmit={onEditSubmit}
      />,
    );
    expect(view.container.querySelector('.yakit-tree-file-focused')).toBeNull();
    const input = view.container.querySelector('input');
    if (!input) throw new Error('expected edit input');
    await userEvent.clear(input);
    await userEvent.type(input, 'New');
    await userEvent.keyboard('{Enter}');
    expect(onEditSubmit).toHaveBeenCalledTimes(1);
    expect(onEditSubmit).toHaveBeenCalledWith('New', 'child');

    flushSync(() => {
      view.root.render(
        <Tree.DirectoryTree
          defaultExpandAll
          editingKey="child"
          editingValue="Reset"
          focusedKey="child"
          treeData={treeData}
          onEditSubmit={onEditSubmit}
        />,
      );
    });
    expect(view.container.querySelector('input')?.value).toBe('Reset');
    expect(view.container.querySelector('.yakit-tree-file-focused')).toBeNull();
  });

  it('selects the whole name when the editing range end is negative', () => {
    const { container } = render(
      <Tree.DirectoryTree
        editingKey="parent"
        editingSelection={{ start: 0, end: -1 }}
        editingValue="readme.yak"
        treeData={treeData}
      />,
    );
    const input = container.querySelector('input');
    if (!input) throw new Error('expected edit input');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('readme.yak'.length);
  });

  it('merges className, renders a custom switcher, and checks a node without its children', async () => {
    const marked = render(
      <Tree
        className="extra-tree"
        switcherIcon={<span data-testid="custom-switcher" />}
        treeData={treeData}
      />,
    );
    expect(marked.container.querySelector('.yakit-tree')?.className).toContain('extra-tree');
    expect(marked.container.querySelector('[data-testid="custom-switcher"]')).toBeTruthy();
    cleanup();

    const onCheck = vi.fn();
    const { container } = render(
      <Tree checkable checkStrictly defaultExpandAll treeData={treeData} onCheck={onCheck} />,
    );
    const parent = [...container.querySelectorAll('.ant-tree-treenode')].find(
      (node) => node.querySelector('.ant-tree-title')?.textContent === 'parent',
    );
    const checkbox = parent?.querySelector('.ant-tree-checkbox');
    if (!checkbox) throw new Error('expected parent checkbox');
    await userEvent.click(checkbox);
    expect(onCheck.mock.calls.at(-1)?.[0]).toEqual({ checked: ['parent'], halfChecked: [] });
    expect(container.querySelectorAll('.ant-tree-checkbox-checked')).toHaveLength(1);
  });

  it('turns blockNode on unless the tree is the default variant', () => {
    const plain = render(<Tree treeData={treeData} />);
    expect(plain.container.querySelector('.ant-tree-block-node')).toBeNull();
    cleanup();
    const forced = render(<Tree blockNode treeData={treeData} />);
    expect(forced.container.querySelector('.ant-tree-block-node')).toBeTruthy();
    cleanup();
    const website = render(<Tree.WebsiteTree treeData={treeData} />);
    expect(website.container.querySelector('.ant-tree-block-node')).toBeTruthy();
    cleanup();
    const file = render(<Tree.DirectoryTree treeData={treeData} />);
    expect(file.container.querySelector('.ant-tree-block-node')).toBeTruthy();
  });

  it('scrolls a virtual tree to the requested key', async () => {
    const data = Array.from({ length: 40 }, (_, index) => ({
      key: `k${index}`,
      title: `node-${index}`,
    }));
    const ref = createRef<TreeRef>();
    const { container } = render(<Tree ref={ref} height={48} itemHeight={24} treeData={data} />);
    const holder = container.querySelector<HTMLElement>('.ant-tree-list-holder');
    if (!holder) throw new Error('expected virtual holder');
    expect(holder.scrollTop).toBe(0);
    ref.current?.scrollTo({ key: 'k30', align: 'top' });
    await vi.waitFor(() => {
      expect(holder.scrollTop).toBeGreaterThan(0);
    });
    const target = [...container.querySelectorAll('.ant-tree-title')].find(
      (node) => node.textContent === 'node-30',
    );
    if (!target) throw new Error('expected scrolled node');
    const targetTop = target.getBoundingClientRect().top;
    const holderBox = holder.getBoundingClientRect();
    expect(targetTop).toBeGreaterThanOrEqual(holderBox.top - 1);
    expect(targetTop).toBeLessThan(holderBox.bottom);
  });
});

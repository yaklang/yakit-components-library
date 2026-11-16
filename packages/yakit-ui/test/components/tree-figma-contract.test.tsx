import { userEvent } from '@vitest/browser/context';
import { DocumentOutlined } from '@yakit-libs/yakit-ui-icons/outline';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import Tree from '../../src/components/Tree';
import { cleanup, render } from '../helpers/render';

beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'light');
});

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute('data-theme');
});

const treeData = [
  {
    key: 'parent',
    title: 'https://www.taskade.com',
    children: [{ key: 'child', title: 'child' }],
  },
];

const settle = () => new Promise((resolve) => setTimeout(resolve, 300));

const content = (container: HTMLElement, key: string) =>
  container.querySelector<HTMLElement>(
    `.ant-tree-treenode[data-key="${key}"] .ant-tree-node-content-wrapper`,
  ) ??
  [...container.querySelectorAll<HTMLElement>('.ant-tree-node-content-wrapper')].find((node) =>
    node.textContent?.includes(key === 'parent' ? 'taskade' : 'child'),
  );

describe('Tree Figma contract', () => {
  it('gives a website tree lines and a checkbox when checkable', async () => {
    const { container } = render(<Tree.WebsiteTree checkable treeData={treeData} />);

    expect(container.querySelector('.ant-tree-show-line')).toBeTruthy();
    expect(container.querySelector('.ant-tree-checkbox')).toBeTruthy();
    const checkbox = container.querySelector<HTMLElement>('.ant-tree-checkbox');
    const box = container.querySelector<HTMLElement>('.ant-tree-checkbox-inner');
    const switcher = container.querySelector('.ant-tree-switcher');
    if (!checkbox || !box || !switcher) throw new Error('expected website checkbox');
    expect(checkbox.getBoundingClientRect().right <= switcher.getBoundingClientRect().left).toBe(
      true,
    );
    expect(parseFloat(getComputedStyle(box).width)).toBe(16);
    expect(parseFloat(getComputedStyle(box).height)).toBe(16);
    expect(parseFloat(getComputedStyle(box).borderRadius)).toBe(4);
    expect(getComputedStyle(box).borderTopColor).toBe('rgb(192, 198, 209)');
    expect(getComputedStyle(box).backgroundColor).toBe('rgb(255, 255, 255)');
    const content = container.querySelector<HTMLElement>('.ant-tree-node-content-wrapper');
    const icon = container.querySelector<HTMLElement>('.ant-tree-iconEle');
    const title = container.querySelector<HTMLElement>('.ant-tree-title');
    if (!content || !icon || !title) throw new Error('expected website row content');
    expect(parseFloat(getComputedStyle(content).paddingLeft)).toBe(6);
    expect(parseFloat(getComputedStyle(content).columnGap || getComputedStyle(content).gap)).toBe(
      4,
    );
    const iconBox = icon.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    const switcherBox = switcher.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    expect(
      Math.abs(iconBox.top + iconBox.height / 2 - (titleBox.top + titleBox.height / 2)),
    ).toBeLessThan(1);
    expect(Math.abs(switcherBox.right - contentBox.left)).toBeLessThan(1);
    const folder = container.querySelector<HTMLElement>(
      '.yakit-tree-website .ant-tree-iconEle .yakit-icon',
    );
    expect(folder && getComputedStyle(folder).color).toBe('rgb(255, 182, 96)');

    await userEvent.click(checkbox);
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(getComputedStyle(checkbox).backgroundColor).toBe('rgb(245, 159, 100)');
    expect(getComputedStyle(checkbox, '::after').borderBottomColor).toBe('rgb(255, 255, 255)');
  });

  it('uses Neutral-Disable for disabled default-tree text, icons, and checkboxes', async () => {
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
              { title: 'leaf', key: '0-0-0-0', disableCheckbox: true },
              { title: 'leaf', key: '0-0-0-1' },
            ],
          },
        ],
      },
    ];
    const { container } = render(
      <Tree
        checkable
        defaultCheckedKeys={['0-0-0-0']}
        defaultExpandAll
        defaultSelectedKeys={['0-0-0-0']}
        showIcon
        treeData={data}
      />,
    );
    await settle();

    const disabledNode =
      container.querySelector<HTMLElement>('.ant-tree-treenode-disabled .ant-tree-title') ??
      [...container.querySelectorAll<HTMLElement>('.ant-tree-title')].find((n) =>
        n.textContent?.includes('parent 1-0'),
      );
    if (!disabledNode) throw new Error('expected disabled title');
    expect(getComputedStyle(disabledNode).color).toBe('rgb(192, 198, 209)');
    expect(getComputedStyle(disabledNode).opacity).toBe('1');
    const disabledTreenode = disabledNode.closest('.ant-tree-treenode-disabled');
    expect(disabledTreenode && getComputedStyle(disabledTreenode).opacity).toBe('1');

    const disabledCheckbox = container.querySelector<HTMLElement>(
      '.ant-tree-treenode-disabled .ant-tree-checkbox-inner',
    );
    if (!disabledCheckbox) throw new Error('expected disabled checkbox');
    expect(getComputedStyle(disabledCheckbox).backgroundColor).toBe('rgb(238, 240, 243)');
    expect(getComputedStyle(disabledCheckbox).borderTopColor).toBe('rgb(230, 232, 237)');

    const selectedLeaf =
      container.querySelector<HTMLElement>(
        '.ant-tree-treenode:not(.ant-tree-treenode-disabled) .ant-tree-checkbox-disabled + .ant-tree-node-content-wrapper.ant-tree-node-selected',
      ) ??
      container.querySelector<HTMLElement>(
        '.ant-tree-checkbox-disabled + .ant-tree-node-content-wrapper.ant-tree-node-selected',
      );
    if (!selectedLeaf) throw new Error('expected disableCheckbox selected leaf');
    expect(getComputedStyle(selectedLeaf).backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(selectedLeaf).color).toBe('rgb(255, 255, 255)');

    const checkedDisabled = container.querySelector<HTMLElement>(
      '.ant-tree-checkbox-disabled.ant-tree-checkbox-checked .ant-tree-checkbox-inner',
    );
    if (!checkedDisabled) throw new Error('expected checked-disabled checkbox');
    expect(getComputedStyle(checkedDisabled).backgroundColor).toBe('rgb(192, 198, 209)');
    expect(getComputedStyle(checkedDisabled).borderTopColor).toBe('rgb(192, 198, 209)');
  });

  it('paints a website selection with a solid primary row and inverse text', async () => {
    const { container } = render(<Tree.WebsiteTree defaultExpandAll treeData={treeData} />);
    const row = content(container, 'parent');
    if (!row) throw new Error('expected website row');

    await userEvent.click(row);
    await settle();
    // Leave the row so we measure select (not select-hover — pointer still on the row after click).
    await userEvent.unhover(row);
    await settle();
    const selected = container.querySelector<HTMLElement>(
      '.ant-tree-node-content-wrapper.ant-tree-node-selected',
    );
    const switcher = container.querySelector<HTMLElement>(
      '.ant-tree-treenode-selected > .ant-tree-switcher',
    );
    if (!selected) throw new Error('expected selected website row');

    expect(getComputedStyle(selected).backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(selected).color).toBe('rgb(255, 255, 255)');
    expect(switcher && getComputedStyle(switcher).backgroundColor).toBe('rgb(219, 117, 46)');
    const icon = selected.querySelector<HTMLElement>('.ant-tree-iconEle .yakit-icon');
    expect(icon?.style.color).toBe('var(--Colors-Use-Basic-White)');
  });

  it('paints website select-hover with Primary action and Hover content, white text', async () => {
    const { container } = render(<Tree.WebsiteTree defaultExpandAll treeData={treeData} />);
    const row = content(container, 'parent');
    if (!row) throw new Error('expected website row');

    await userEvent.click(row);
    await settle();
    const selected = container.querySelector<HTMLElement>(
      '.ant-tree-node-content-wrapper.ant-tree-node-selected',
    );
    const switcher = container.querySelector<HTMLElement>(
      '.ant-tree-treenode-selected > .ant-tree-switcher',
    );
    if (!selected || !switcher) throw new Error('expected selected website row');

    await userEvent.hover(selected);
    await settle();
    expect(getComputedStyle(selected).backgroundColor).toBe('rgb(245, 159, 100)');
    expect(getComputedStyle(selected).color).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(switcher).backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(switcher).color).toBe('rgb(255, 255, 255)');
  });

  it('paints a selected website leaf switcher with the content color', async () => {
    const { container } = render(<Tree.WebsiteTree defaultExpandAll treeData={treeData} />);
    const row = content(container, 'child');
    if (!row) throw new Error('expected website leaf');

    await userEvent.click(row);
    await settle();
    await userEvent.unhover(row);
    await settle();
    const switcher = container.querySelector<HTMLElement>(
      '.ant-tree-treenode-selected > .ant-tree-switcher',
    );
    if (!switcher) throw new Error('expected selected leaf switcher');

    expect(switcher.classList.contains('ant-tree-switcher-noop')).toBe(true);
    expect(switcher.querySelector('.yakit-icon')).toBeNull();
    expect(getComputedStyle(switcher).backgroundColor).toBe('rgb(242, 140, 69)');
    const line = switcher.querySelector<HTMLElement>('.ant-tree-switcher-leaf-line');
    if (line) expect(getComputedStyle(line).display).toBe('none');

    const selectedLeaf = container.querySelector<HTMLElement>(
      '.ant-tree-node-content-wrapper.ant-tree-node-selected',
    );
    if (!selectedLeaf) throw new Error('expected selected leaf content');
    await userEvent.hover(selectedLeaf);
    await settle();
    expect(getComputedStyle(switcher).backgroundColor).toBe('rgb(245, 159, 100)');
    expect(getComputedStyle(selectedLeaf).backgroundColor).toBe('rgb(245, 159, 100)');
  });

  it('aligns a website guide line with the parent switcher', () => {
    const { container } = render(<Tree.WebsiteTree defaultExpandAll treeData={treeData} />);
    const rowByTitle = (title: string) =>
      [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find(
        (node) => node.querySelector('.ant-tree-title')?.textContent === title,
      );
    const parentSwitcher =
      rowByTitle('https://www.taskade.com')?.querySelector<HTMLElement>('.ant-tree-switcher');
    const child = rowByTitle('child');
    const indent = child?.querySelector<HTMLElement>('.ant-tree-indent-unit');
    const leafLine = child?.querySelector<HTMLElement>('.ant-tree-switcher-leaf-line');
    if (!parentSwitcher || !indent || !leafLine) throw new Error('expected website guide line');

    const parentBox = parentSwitcher.getBoundingClientRect();
    const indentBox = indent.getBoundingClientRect();
    expect(Math.abs(indentBox.right - (parentBox.left + parentBox.width / 2))).toBeLessThan(1);
    expect(indent.classList.contains('ant-tree-indent-unit-end')).toBe(true);
    const line = getComputedStyle(indent, '::before');
    expect(line.display).not.toBe('none');
    expect(line.insetInlineEnd).toBe('0px');
    expect(parseFloat(line.bottom)).toBeLessThan(0);
    expect(getComputedStyle(leafLine).display).toBe('none');
  });

  it('uses the neutral hover color for an unselected website row', async () => {
    const { container } = render(<Tree.WebsiteTree treeData={treeData} />);
    const row = content(container, 'parent');
    if (!row) throw new Error('expected website row');

    await userEvent.hover(row);
    await settle();

    expect(getComputedStyle(row).backgroundColor).toBe('rgb(248, 249, 250)');
    expect(getComputedStyle(row).backgroundColor).not.toBe('rgb(242, 140, 69)');
    const folderSwitcher = container.querySelector<HTMLElement>(
      '.ant-tree-treenode:hover > .ant-tree-switcher',
    );
    expect(folderSwitcher && getComputedStyle(folderSwitcher).backgroundColor).toBe(
      'rgb(238, 240, 243)',
    );

    if (!folderSwitcher) throw new Error('expected website switcher');
    await userEvent.hover(folderSwitcher);
    await settle();
    expect(getComputedStyle(row).backgroundColor).toBe('rgb(248, 249, 250)');
  });

  it('uses the content hover color for a website leaf switcher', async () => {
    const { container } = render(<Tree.WebsiteTree defaultExpandAll treeData={treeData} />);
    const row = content(container, 'child');
    if (!row) throw new Error('expected website leaf');

    await userEvent.hover(row);
    await settle();
    const switcher = row.parentElement?.querySelector<HTMLElement>('.ant-tree-switcher');
    if (!switcher) throw new Error('expected leaf switcher');

    expect(switcher.classList.contains('ant-tree-switcher-noop')).toBe(true);
    expect(getComputedStyle(switcher).backgroundColor).toBe(getComputedStyle(row).backgroundColor);
    expect(getComputedStyle(switcher).backgroundColor).toBe('rgb(248, 249, 250)');
  });

  it('paints default selection like YakitTree (solid primary, inverse text)', async () => {
    const { container } = render(
      <Tree checkable defaultSelectedKeys={['parent']} treeData={treeData} />,
    );
    const selected = container.querySelector<HTMLElement>(
      '.ant-tree-node-content-wrapper.ant-tree-node-selected',
    );
    if (!selected) throw new Error('expected selected default row');

    expect(getComputedStyle(selected).backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(selected).color).toBe('rgb(255, 255, 255)');
    const title = selected.querySelector<HTMLElement>('.ant-tree-title');
    expect(title && getComputedStyle(title).color).toBe('rgb(255, 255, 255)');

    // Click/hover keeps white: antd nodeHoverColor would otherwise win over nodeSelectedColor.
    // select-hover bg follows Figma Basic = Main-Hover.
    await userEvent.hover(selected);
    await settle();
    expect(getComputedStyle(selected).color).toBe('rgb(255, 255, 255)');
    expect(title && getComputedStyle(title).color).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(selected).backgroundColor).toBe('rgb(245, 159, 100)');

    const box = container.querySelector<HTMLElement>('.ant-tree-checkbox-inner');
    if (!box) throw new Error('expected default checkbox');
    expect(parseFloat(getComputedStyle(box).width)).toBe(16);
    expect(parseFloat(getComputedStyle(box).borderRadius)).toBe(4);
    expect(getComputedStyle(box).backgroundColor).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(box).borderTopColor).toBe('rgb(192, 198, 209)');

    // Default checkbox shares website styles — no Yakit wave/spin on check.
    const checkbox = container.querySelector<HTMLElement>('.ant-tree-checkbox');
    if (!checkbox) throw new Error('expected default checkbox root');
    await userEvent.click(checkbox);
    await settle();
    expect(getComputedStyle(checkbox, '::after').animationName).toBe('none');
    expect(getComputedStyle(box).backgroundColor).toBe('rgb(245, 159, 100)');
  });

  it('default tree does not inject icons; website still injects folder/file icons', () => {
    const defOff = render(<Tree defaultExpandAll treeData={treeData} />);
    expect(defOff.container.querySelectorAll('.ant-tree-iconEle').length).toBe(0);
    cleanup();

    const defOn = render(<Tree defaultExpandAll showIcon treeData={treeData} />);
    // antd reserves slots when showIcon is on, but library no longer injects icons for default.
    expect(defOn.container.querySelectorAll('.ant-tree-iconEle .yakit-icon').length).toBe(0);
    cleanup();

    const website = render(<Tree.WebsiteTree defaultExpandAll treeData={treeData} />);
    expect(
      website.container.querySelectorAll('.ant-tree-iconEle .yakit-icon').length,
    ).toBeGreaterThan(0);
    cleanup();

    const websiteOff = render(
      <Tree.WebsiteTree defaultExpandAll showIcon={false} treeData={treeData} />,
    );
    expect(websiteOff.container.querySelectorAll('.ant-tree-iconEle .yakit-icon').length).toBe(0);
  });

  it('aligns custom node icons on default tree without forcing size or recoloring', () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        icon: <DocumentOutlined size={20} color="rgb(16, 185, 129)" />,
        children: [
          {
            key: 'child',
            title: 'child',
            icon: <DocumentOutlined size={20} color="rgb(16, 185, 129)" />,
          },
        ],
      },
    ];
    const { container } = render(
      <Tree checkable defaultExpandAll draggable showIcon treeData={data} />,
    );
    const iconEle = container.querySelector('.ant-tree-iconEle');
    const title = container.querySelector('.ant-tree-title');
    if (!iconEle || !title) throw new Error('expected custom icon slot and title');
    const iconStyle = getComputedStyle(iconEle);
    expect(['flex', 'inline-flex']).toContain(iconStyle.display);
    // consumer size kept — library does not force 16×16
    expect(parseFloat(iconStyle.width)).not.toBe(16);
    expect(iconEle.getBoundingClientRect().right).toBeLessThanOrEqual(
      title.getBoundingClientRect().left + 1,
    );
    const iconBox = iconEle.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    expect(
      Math.abs(iconBox.top + iconBox.height / 2 - (titleBox.top + titleBox.height / 2)),
    ).toBeLessThan(2);
    // custom color preserved — library only aligns the slot
    const svg = iconEle.querySelector('svg, .yakit-icon');
    if (!svg) throw new Error('expected custom icon node');
    expect(getComputedStyle(svg).color).toBe('rgb(16, 185, 129)');
    const svgWidth = parseFloat(getComputedStyle(svg).width) || Number(svg.getAttribute('width'));
    expect(svgWidth).toBe(20);
  });

  it('keeps primary after check-then-select on default tree (not neutral grey + white)', async () => {
    const { container } = render(<Tree checkable defaultExpandAll treeData={treeData} />);
    const row = content(container, 'child');
    const treenode =
      container.querySelector<HTMLElement>('.ant-tree-treenode[data-key="child"]') ??
      [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find((node) =>
        node.textContent?.includes('child'),
      );
    const checkbox = treenode?.querySelector<HTMLElement>('.ant-tree-checkbox');
    if (!row || !checkbox) throw new Error('expected child row and checkbox');

    await userEvent.click(checkbox);
    await settle();
    // Checked alone must not force white text / selected fill.
    expect(row.classList.contains('ant-tree-node-selected')).toBe(false);
    expect(getComputedStyle(row).color).not.toBe('rgb(255, 255, 255)');

    await userEvent.click(row);
    await settle();
    const selected = container.querySelector<HTMLElement>(
      '.ant-tree-node-content-wrapper.ant-tree-node-selected',
    );
    if (!selected) throw new Error('expected selected after title click');
    // Pointer still on the row after click → select-hover = Main-Hover, never Neutral-Bg-Hover grey.
    expect(getComputedStyle(selected).backgroundColor).toBe('rgb(245, 159, 100)');
    expect(getComputedStyle(selected).color).toBe('rgb(255, 255, 255)');

    await userEvent.unhover(selected);
    await settle();
    expect(getComputedStyle(selected).backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(selected).color).toBe('rgb(255, 255, 255)');
  });

  it('shows the drag handle unless draggable.icon is false; drop line is primary', () => {
    const hidden = render(
      <Tree draggable={{ icon: false }} defaultExpandAll treeData={treeData} />,
    );
    expect(hidden.container.querySelector('.ant-tree-draggable-icon')).toBeNull();

    cleanup();
    const { container } = render(<Tree draggable defaultExpandAll treeData={treeData} />);
    const handle = container.querySelector<HTMLElement>('.ant-tree-draggable-icon');
    if (!handle) throw new Error('expected drag handle');
    // light theme Neutral-Text-3-Secondary = Neutral-80 #868c97
    expect(getComputedStyle(handle).color).toBe('rgb(134, 140, 151)');

    const tree = container.querySelector('.ant-tree') ?? container.querySelector('.yakit-tree');
    if (!tree) throw new Error('expected tree root');
    // Mirror antd DOM: drop-indicator lives under node-content-wrapper (css-in-js nests there).
    const content = container.querySelector('.ant-tree-node-content-wrapper') ?? tree;
    const indicator = document.createElement('div');
    indicator.className = 'ant-tree-drop-indicator';
    content.appendChild(indicator);
    expect(getComputedStyle(indicator).backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(indicator, '::after').borderTopColor).toBe('rgb(242, 140, 69)');

    const dragging = container.querySelector('.ant-tree-treenode');
    if (!dragging) throw new Error('expected treenode');
    dragging.classList.add('dragging');
    expect(getComputedStyle(dragging, '::after').borderTopColor).toBe('rgb(242, 140, 69)');

    cleanup();
    const website = render(<Tree.WebsiteTree draggable defaultExpandAll treeData={treeData} />);
    const webHandle = website.container.querySelector<HTMLElement>('.ant-tree-draggable-icon');
    if (!webHandle) throw new Error('expected website drag handle');
    expect(getComputedStyle(webHandle).color).toBe('rgb(134, 140, 151)');
    const webTree =
      website.container.querySelector('.ant-tree') ??
      website.container.querySelector('.yakit-tree');
    if (!webTree) throw new Error('expected website tree root');
    const webContent = website.container.querySelector('.ant-tree-node-content-wrapper') ?? webTree;
    const webIndicator = document.createElement('div');
    webIndicator.className = 'ant-tree-drop-indicator';
    webContent.appendChild(webIndicator);
    expect(getComputedStyle(webIndicator).backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(webIndicator, '::after').borderTopColor).toBe('rgb(242, 140, 69)');
  });

  it('keeps file skin free of antd showIcon slot even when showIcon/draggable/checkable are passed', () => {
    const { container } = render(
      <Tree.DirectoryTree
        checkable
        draggable
        showIcon
        showLine
        defaultExpandAll
        treeData={treeData}
      />,
    );
    expect(container.querySelector('.yakit-tree-file')).toBeTruthy();
    expect(container.querySelector('.yakit-tree-file-icon')).toBeTruthy();
    expect(container.querySelector('.ant-tree-switcher')).toBeTruthy();
    // antd iconEle must stay hidden — FileTreeNode owns icons
    const iconEle = container.querySelectorAll('.ant-tree-iconEle');
    iconEle.forEach((el) => {
      expect(getComputedStyle(el).display).toBe('none');
    });
    // antd indent and switcher stay in front of the checkbox, same as DirectoryTree
    const switcher = container.querySelector('.ant-tree-switcher');
    const checkbox = container.querySelector('.ant-tree-checkbox');
    const drag = container.querySelector('.ant-tree-draggable-icon');
    expect(switcher && checkbox && drag).toBeTruthy();
    expect(getComputedStyle(switcher as Element).display).not.toBe('none');
    // optional antd chrome may appear, but file row chrome remains
    expect(container.querySelector('.ant-tree-checkbox')).toBeTruthy();
    expect(container.querySelector('.ant-tree-draggable-icon')).toBeTruthy();
  });

  it('draws a 22px file row with a primary border and light fill when selected', async () => {
    const { container } = render(<Tree.DirectoryTree defaultExpandAll treeData={treeData} />);
    const row = container.querySelector<HTMLElement>('.yakit-tree-file-row');
    if (!row) throw new Error('expected file row');

    expect(parseFloat(getComputedStyle(row).height)).toBe(22);
    const child = content(container, 'child');
    if (!child) throw new Error('expected file row');
    await userEvent.click(child);
    await settle();
    const selected = container.querySelector<HTMLElement>('.ant-tree-treenode-selected');
    if (!selected) throw new Error('expected selected file row');
    const style = getComputedStyle(selected);
    const title = selected.querySelector<HTMLElement>('.yakit-tree-file-title');

    expect(style.backgroundColor).toBe('rgb(254, 245, 238)');
    expect(style.boxShadow).toContain('rgb(242, 140, 69)');
    expect(parseFloat(style.borderRadius)).toBe(4);
    expect(getComputedStyle(title as Element).color).toBe('rgb(53, 54, 57)');
    expect(selected.querySelector('input')).toBeNull();
  });

  it('edits a file title in the small input outside the arrow and icon', () => {
    const { container } = render(
      <Tree.DirectoryTree editingKey="parent" editingValue="Untitled-2" treeData={treeData} />,
    );
    const input = container.querySelector('input');
    const row = container.querySelector('.yakit-tree-file-row');
    if (!input || !row) throw new Error('expected file editor');

    expect(input.className).toContain('yakit-input');
    expect(input.className).toContain('yakit-input-small');
    expect(parseFloat(getComputedStyle(input).height)).toBe(24);
    expect(getComputedStyle(input).paddingLeft).toBe('8px');
    expect(getComputedStyle(input).boxShadow).toBe('none');
    expect(getComputedStyle(input).borderTopWidth).toBe('1px');
    const node = row.closest<HTMLElement>('.ant-tree-treenode');
    if (!node) throw new Error('expected edit row');
    expect(getComputedStyle(node).backgroundColor).toBe('rgb(254, 245, 238)');
    expect(parseFloat(getComputedStyle(node).borderRadius)).toBe(4);
    expect(getComputedStyle(node).boxShadow).toBe('none');
    expect(getComputedStyle(row).paddingRight).toBe('0px');
    expect(parseFloat(getComputedStyle(row).height)).toBe(24);
    expect(
      row.closest('.ant-tree-treenode')?.querySelector('.ant-tree-switcher')?.contains(input),
    ).toBe(false);
    expect(row.querySelector('.yakit-tree-file-icon')?.contains(input)).toBe(false);
    expect(input.value).toBe('Untitled-2');
  });

  it('draws a focus ring on a file, and leaves a focused folder without a fill', () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [
          { key: 'child', title: 'child', isLeaf: true },
          { key: 'other', title: 'other', isLeaf: true },
        ],
      },
    ];
    const { container } = render(
      <Tree.DirectoryTree
        focusedKey="other"
        selectedKeys={['child']}
        defaultExpandAll
        treeData={data}
      />,
    );
    const focused = container.querySelector<HTMLElement>('.yakit-tree-file-focused');
    const focusedNode = focused?.closest<HTMLElement>('.ant-tree-treenode');
    const selected = container.querySelector<HTMLElement>('.ant-tree-treenode-selected');
    const folder = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')].find(
      (node) => node.querySelector('.yakit-tree-file-title')?.textContent === 'parent',
    );
    if (!focusedNode || !selected || !folder)
      throw new Error('expected focus, selection, and folder');

    expect(focused?.textContent).toContain('other');
    expect(getComputedStyle(focusedNode).boxShadow).toContain('rgb(249, 197, 162)');
    expect(getComputedStyle(focusedNode).backgroundColor).toBe('rgb(252, 229, 214)');
    expect(getComputedStyle(selected).boxShadow).toContain('rgb(242, 140, 69)');
    expect(getComputedStyle(selected).backgroundColor).toBe('rgb(254, 245, 238)');
    expect(getComputedStyle(folder).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(folder).boxShadow).toBe('none');
    expect(focusedNode).not.toBe(selected);
  });

  it('website disabled selected checkbox stays Neutral-Disable not primary', async () => {
    const data = [
      {
        key: 'parent',
        title: 'parent',
        children: [
          { key: 'leaf-off', title: 'leaf-off', disableCheckbox: true, isLeaf: true },
          { key: 'leaf-on', title: 'leaf-on', disabled: true, isLeaf: true },
        ],
      },
    ];
    const { container } = render(
      <Tree.WebsiteTree
        checkable
        defaultCheckedKeys={['leaf-off', 'leaf-on']}
        defaultExpandAll
        defaultSelectedKeys={['leaf-on']}
        treeData={data}
      />,
    );

    const disabledSelected = container.querySelector<HTMLElement>(
      '.ant-tree-treenode-disabled.ant-tree-treenode-selected .ant-tree-checkbox-inner',
    );
    if (!disabledSelected) throw new Error('expected disabled selected checkbox');
    // Must be Neutral-Disable grey, never Main-Primary orange.
    expect(getComputedStyle(disabledSelected).backgroundColor).toBe('rgb(192, 198, 209)');
    expect(getComputedStyle(disabledSelected).borderTopColor).toBe('rgb(192, 198, 209)');

    const disableCheckboxOnly = container.querySelector<HTMLElement>(
      '.ant-tree-checkbox-disabled.ant-tree-checkbox-checked .ant-tree-checkbox-inner',
    );
    if (!disableCheckboxOnly) throw new Error('expected disableCheckbox checked box');
    expect(getComputedStyle(disableCheckboxOnly).backgroundColor).toBe('rgb(192, 198, 209)');
  });

  it('styles website showLeafIcon like the default leaf file icon', async () => {
    const { container } = render(
      <Tree.WebsiteTree defaultExpandAll showLine={{ showLeafIcon: true }} treeData={treeData} />,
    );
    await settle();

    expect(container.querySelector('.yakit-tree-show-leaf-icon')).toBeTruthy();

    const leafSwitcher = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')]
      .find((node) => node.querySelector('.ant-tree-title')?.textContent === 'child')
      ?.querySelector<HTMLElement>('.ant-tree-switcher');
    if (!leafSwitcher) throw new Error('expected leaf switcher');

    const leafIcon =
      leafSwitcher.querySelector<HTMLElement>('.yakit-tree-leaf-icon') ??
      leafSwitcher.querySelector<HTMLElement>('.ant-tree-switcher-line-icon');
    expect(leafIcon).toBeTruthy();
    // showLeafIcon on: that layer must not keep the leaf-line L
    expect(leafSwitcher.querySelector('.ant-tree-switcher-leaf-line')).toBeNull();
    // opaque Action cell so indent guide does not show through
    expect(getComputedStyle(leafSwitcher).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(leafIcon!).color).toBe('rgb(134, 140, 151)');
    // 12px leaf glyph slot
    expect(parseFloat(getComputedStyle(leafIcon!).width)).toBe(12);
    expect(parseFloat(getComputedStyle(leafIcon!).height)).toBe(12);

    const row = content(container, 'child');
    if (!row) throw new Error('expected leaf content');
    await userEvent.click(row);
    await settle();
    await userEvent.unhover(row);
    await settle();
    // selected: leaf glyph stays (white on Primary Action)
    expect(
      leafSwitcher.querySelector('.yakit-tree-leaf-icon, .ant-tree-switcher-line-icon'),
    ).toBeTruthy();
    expect(getComputedStyle(leafSwitcher).backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(leafSwitcher, '::after').backgroundColor).toBe('rgb(242, 140, 69)');
    expect(getComputedStyle(leafIcon!).color).toBe('rgb(255, 255, 255)');
    expect(getComputedStyle(leafIcon!).opacity).toBe('1');
    expect(leafIcon!.getBoundingClientRect().width).toBeGreaterThan(0);
    const selected = content(container, 'child');
    if (!selected) throw new Error('expected selected leaf content');
    expect(getComputedStyle(selected).backgroundColor).toBe(
      getComputedStyle(leafSwitcher).backgroundColor,
    );
    await userEvent.hover(selected);
    await settle();
    expect(getComputedStyle(leafSwitcher).backgroundColor).toBe(
      getComputedStyle(selected).backgroundColor,
    );
    expect(getComputedStyle(leafSwitcher, '::after').backgroundColor).toBe(
      getComputedStyle(selected).backgroundColor,
    );
    await userEvent.unhover(selected);
    await settle();
    await userEvent.hover(leafSwitcher);
    await settle();
    expect(getComputedStyle(selected).backgroundColor).toBe('rgb(245, 159, 100)');
    expect(getComputedStyle(leafSwitcher).backgroundColor).toBe(
      getComputedStyle(selected).backgroundColor,
    );
  });

  it('website checkbox column is far-left aligned; indent then switcher/leaf follow', async () => {
    const { container } = render(
      <Tree.WebsiteTree
        checkable
        defaultExpandAll
        draggable
        showLine={{ showLeafIcon: true }}
        treeData={treeData}
      />,
    );
    await settle();
    const rows = [...container.querySelectorAll<HTMLElement>('.ant-tree-treenode')];
    const child = rows.find((n) => n.querySelector('.ant-tree-title')?.textContent === 'child');
    const parent = rows.find((n) =>
      n.querySelector('.ant-tree-title')?.textContent?.includes('taskade'),
    );
    if (!child || !parent) throw new Error('expected parent/child rows');

    const childDrag = child.querySelector<HTMLElement>('.ant-tree-draggable-icon');
    const parentDrag = parent.querySelector<HTMLElement>('.ant-tree-draggable-icon');
    const childCheckbox = child.querySelector<HTMLElement>('.ant-tree-checkbox');
    const parentCheckbox = parent.querySelector<HTMLElement>('.ant-tree-checkbox');
    const childIndent = child.querySelector<HTMLElement>('.ant-tree-indent');
    const childSwitcher = child.querySelector<HTMLElement>('.ant-tree-switcher');
    const parentSwitcher = parent.querySelector<HTMLElement>('.ant-tree-switcher');
    if (
      !childDrag ||
      !parentDrag ||
      !childCheckbox ||
      !parentCheckbox ||
      !childIndent ||
      !childSwitcher ||
      !parentSwitcher
    ) {
      throw new Error('expected drag/checkbox/indent/switcher');
    }

    const cd = childDrag.getBoundingClientRect();
    const pd = parentDrag.getBoundingClientRect();
    const cc = childCheckbox.getBoundingClientRect();
    const pc = parentCheckbox.getBoundingClientRect();
    const ci = childIndent.getBoundingClientRect();
    const cs = childSwitcher.getBoundingClientRect();
    const ps = parentSwitcher.getBoundingClientRect();

    expect(cd.right).toBeLessThanOrEqual(cc.left + 0.5);
    expect(pd.right).toBeLessThanOrEqual(pc.left + 0.5);
    // all depths: checkbox left edges share one column
    expect(Math.abs(cc.left - pc.left)).toBeLessThan(1);
    // drag → checkbox → indent → switcher/leaf
    expect(cc.right).toBeLessThanOrEqual(ci.left + 0.5);
    expect(ci.right).toBeLessThanOrEqual(cs.left + 0.5);
    expect(pc.right).toBeLessThanOrEqual(ps.left + 0.5);
    // leaf glyph in switcher
    expect(
      childSwitcher.querySelector('.yakit-tree-leaf-icon, .ant-tree-switcher-line-icon'),
    ).toBeTruthy();
  });
});

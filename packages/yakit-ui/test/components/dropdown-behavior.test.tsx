import { userEvent } from '@vitest/browser/context';
import React from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Dropdown, { YakitDropdownMenu } from '../../src/components/Dropdown';
import { cleanup, render } from '../helpers/render';

afterEach(cleanup);

describe('Dropdown behavior', () => {
  it('accepts text, numeric, and multiple trigger children', () => {
    const text = render(<Dropdown trigger={['click']}>Plain trigger</Dropdown>);
    expect(text.container.querySelector('.yakit-dropdown-trigger')?.textContent).toBe(
      'Plain trigger',
    );

    const number = render(<Dropdown trigger={['click']}>{42}</Dropdown>);
    expect(number.container.querySelector('.yakit-dropdown-trigger')?.textContent).toBe('42');

    const multiple = render(
      <Dropdown trigger={['click']}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Dropdown>,
    );
    expect(multiple.container.querySelector('.yakit-dropdown-trigger')?.textContent).toBe(
      'FirstSecond',
    );
  });

  it('renders arrows only when requested and positions them at the trigger center', async () => {
    render(
      <Dropdown defaultOpen menu={{ items: [{ key: 'plain', label: 'Plain' }] }}>
        <button type="button">No arrow</button>
      </Dropdown>,
    );

    await vi.waitFor(() => {
      expect(document.body.querySelector('.yakit-dropdown-panel')).not.toBeNull();
    });
    expect(document.body.querySelector('.yakit-dropdown-arrow')).toBeNull();

    render(
      <Dropdown arrow defaultOpen menu={{ items: [{ key: 'centered', label: 'Centered' }] }}>
        <button type="button">Centered arrow</button>
      </Dropdown>,
    );

    await vi.waitFor(() => {
      expect(document.body.querySelector('.yakit-dropdown-arrow')).not.toBeNull();
    });
    const arrow = document.body.querySelector<HTMLElement>('.yakit-dropdown-arrow');

    if (!arrow) throw new Error('expected a dropdown arrow');
    expect(arrow.style.left).not.toBe('');
  });

  it.each([
    ['left', 'right', '-4px'],
    ['rightTop', 'left', '-4px'],
  ] as const)(
    'positions the %s dropdown arrow pointing at the trigger center',
    async (placement, side, sideOffset) => {
      render(
        <Dropdown
          arrow
          defaultOpen
          placement={placement}
          menu={{ items: [{ key: 'item', label: 'Item' }] }}
        >
          <button type="button">Open</button>
        </Dropdown>,
      );

      await vi.waitFor(() => {
        const arrow = document.body.querySelector<HTMLElement>('.yakit-dropdown-arrow');
        if (!arrow) throw new Error('expected a dropdown arrow');
        const style = getComputedStyle(arrow);

        expect(style[side]).toBe(sideOffset);
        // arrow 一律 inline 定位指向触发器中心：水平侧弹出写 arrowLeft，垂直侧弹出写 arrowTop
        const vertical = placement.startsWith('left') || placement.startsWith('right');
        if (vertical) {
          expect(arrow.style.top).not.toBe('');
          expect(arrow.style.left).toBe('');
        } else {
          expect(arrow.style.top).toBe('');
          expect(arrow.style.left).not.toBe('');
        }
      });
    },
  );

  it('positions plain arrows at the trigger center with a non-overlapping gap', async () => {
    render(
      <Dropdown
        arrow
        defaultOpen
        placement="bottomLeft"
        menu={{ items: [{ key: 'item', label: 'Item' }] }}
      >
        <button type="button">Open</button>
      </Dropdown>,
    );

    await vi.waitFor(() => {
      const arrow = document.body.querySelector<HTMLElement>('.yakit-dropdown-arrow');
      if (!arrow) throw new Error('expected a dropdown arrow');
      const trigger = document.body.querySelector<HTMLElement>('.yakit-dropdown-trigger');
      if (!trigger) throw new Error('expected a dropdown trigger');

      const arrowRect = arrow.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      // 箭头中心指向触发器中心
      expect(
        Math.abs(arrowRect.left + arrowRect.width / 2 - (triggerRect.left + triggerRect.width / 2)),
      ).toBeLessThanOrEqual(0.5);
      // 有箭头时间距 10px：箭头中心骑面板顶边，面板顶边与触发器底边相距 10px
      const popup = arrow.parentElement;
      if (!popup) throw new Error('expected a dropdown popup');
      const popupRect = popup.getBoundingClientRect();
      expect(Math.round(popupRect.top - triggerRect.bottom)).toBe(10);
      // inline left 已写入且不与居中负 margin 叠加
      expect(arrow.style.left).not.toBe('');
      expect(getComputedStyle(arrow).marginLeft).toBe('0px');
    });
  });

  it('applies the legacy dropdownRender inside the YakitDropdownMenu wrapper', async () => {
    const dropdownRender = vi.fn((origin: React.ReactNode) => (
      <>
        <span data-testid="custom-dropdown-content">Custom content</span>
        {origin}
      </>
    ));
    render(
      <YakitDropdownMenu
        dropdown={{ defaultOpen: true, dropdownRender }}
        menu={{ items: [{ key: 'first', label: 'First item' }] }}
      >
        <button type="button">Open menu</button>
      </YakitDropdownMenu>,
    );

    await vi.waitFor(() => {
      expect(dropdownRender).toHaveBeenCalled();
      expect(
        document.body.querySelector(
          '.yakit-dropdown-menu-wrapper [data-testid="custom-dropdown-content"]',
        ),
      ).not.toBeNull();
      expect(document.body.textContent).toContain('First item');
    });
  });

  it('toggles open and closed on click trigger', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dropdown
        trigger={['click']}
        onOpenChange={onOpenChange}
        menu={{ items: [{ key: 'a', label: 'Alpha' }] }}
      >
        <button type="button">Toggle</button>
      </Dropdown>,
    );

    const trigger = document.body.querySelector<HTMLElement>('.yakit-dropdown-trigger');
    if (!trigger) throw new Error('expected trigger');

    flushSync(() => trigger.click());
    await vi.waitFor(() => {
      expect(document.body.querySelector('.yakit-dropdown.yakit-dropdown-hidden')).toBeNull();
      expect(document.body.querySelector('.yakit-dropdown-panel')).not.toBeNull();
    });
    expect(onOpenChange).toHaveBeenCalledWith(true, { source: 'trigger' });

    flushSync(() => trigger.click());
    await vi.waitFor(() => {
      expect(document.body.querySelector('.yakit-dropdown.yakit-dropdown-hidden')).not.toBeNull();
    });
    expect(onOpenChange).toHaveBeenCalledWith(false, { source: 'trigger' });
  });

  it('closes on Escape with trigger source', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dropdown
        trigger={['click']}
        onOpenChange={onOpenChange}
        menu={{ items: [{ key: 'a', label: 'Alpha' }] }}
      >
        <button type="button">Esc</button>
      </Dropdown>,
    );

    const trigger = document.body.querySelector<HTMLElement>('.yakit-dropdown-trigger');
    if (!trigger) throw new Error('expected trigger');
    flushSync(() => trigger.click());
    await vi.waitFor(() => {
      expect(document.body.querySelector('.yakit-dropdown.yakit-dropdown-hidden')).toBeNull();
    });

    flushSync(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await vi.waitFor(() => {
      expect(document.body.querySelector('.yakit-dropdown.yakit-dropdown-hidden')).not.toBeNull();
    });
    expect(onOpenChange).toHaveBeenCalledWith(false, { source: 'trigger' });
  });

  it('does not open when disabled', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dropdown
        disabled
        trigger={['click']}
        onOpenChange={onOpenChange}
        menu={{ items: [{ key: 'a', label: 'Alpha' }] }}
      >
        <button type="button">Disabled</button>
      </Dropdown>,
    );

    const trigger = document.body.querySelector<HTMLElement>('.yakit-dropdown-trigger');
    if (!trigger) throw new Error('expected trigger');
    flushSync(() => trigger.click());

    expect(onOpenChange).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      // mount 后可有 hidden 弹层；不应出现可见弹层
      expect(document.body.querySelector('.yakit-dropdown:not(.yakit-dropdown-hidden)')).toBeNull();
    });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('closes on leaf menu click with menu source', async () => {
    const onOpenChange = vi.fn();
    render(
      <Dropdown
        defaultOpen
        onOpenChange={onOpenChange}
        menu={{ items: [{ key: 'leaf', label: 'Leaf item' }] }}
      >
        <button type="button">Menu</button>
      </Dropdown>,
    );

    await vi.waitFor(() => {
      expect(document.body.querySelector('[role="menuitem"]')).not.toBeNull();
    });
    const item = document.body.querySelector<HTMLElement>('[role="menuitem"]');
    if (!item) throw new Error('expected menuitem');

    flushSync(() => item.click());
    await vi.waitFor(() => {
      expect(document.body.querySelector('.yakit-dropdown.yakit-dropdown-hidden')).not.toBeNull();
    });
    expect(onOpenChange).toHaveBeenCalledWith(false, { source: 'menu' });
  });

  it('uses absolute positioning inside a custom getPopupContainer', async () => {
    const host = document.createElement('div');
    host.style.position = 'relative';
    host.style.transform = 'translateX(0)';
    document.body.append(host);

    render(
      <Dropdown
        defaultOpen
        getPopupContainer={() => host}
        menu={{ items: [{ key: 'a', label: 'Alpha' }] }}
      >
        <button type="button">Hosted</button>
      </Dropdown>,
    );

    await vi.waitFor(() => {
      expect(host.querySelector('.yakit-dropdown-panel')).not.toBeNull();
    });
    const popup = host.querySelector<HTMLElement>('.yakit-dropdown');
    if (!popup) throw new Error('expected popup in custom container');
    expect(popup.parentElement).toBe(host);
    expect(popup.style.position).toBe('absolute');
  });

  it('makes a text trigger keyboard operable and describes the popup', () => {
    const { container } = render(
      <Dropdown trigger={['click']} menu={{ items: [{ key: 'a', label: 'Alpha' }] }}>
        Plain trigger
      </Dropdown>,
    );
    const trigger = container.querySelector<HTMLElement>('.yakit-dropdown-trigger');
    if (!trigger) throw new Error('expected trigger');

    expect(trigger.getAttribute('role')).toBe('button');
    expect(trigger.tabIndex).toBe(0);
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeTruthy();

    trigger.focus();
    flushSync(() =>
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    );
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('puts menu aria on a button child and toggles once on Enter', () => {
    const onOpenChange = vi.fn();
    const { container } = render(
      <Dropdown
        trigger={['click']}
        onOpenChange={onOpenChange}
        menu={{ items: [{ key: 'a', label: 'Alpha' }] }}
      >
        <button type="button">Open</button>
      </Dropdown>,
    );
    const trigger = container.querySelector<HTMLElement>('.yakit-dropdown-trigger');
    const button = container.querySelector<HTMLButtonElement>('button');
    if (!trigger || !button) throw new Error('expected trigger and button');

    expect(button.getAttribute('aria-haspopup')).toBe('menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('role')).toBe(false);

    flushSync(() =>
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    );
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true, { source: 'trigger' });
  });

  it('moves focus through root items and restores trigger focus on Escape', async () => {
    const { container } = render(
      <Dropdown
        defaultOpen
        menu={{
          items: [
            { key: 'a', label: 'Alpha' },
            { key: 'b', label: 'Beta' },
          ],
        }}
      >
        <button type="button">Open</button>
      </Dropdown>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('expected trigger button');

    await vi.waitFor(() => {
      expect(document.body.querySelectorAll('[role="menuitem"]')).toHaveLength(2);
    });
    const [first, second] = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];

    first.focus();
    expect(first.tabIndex).toBe(0);
    expect(second.tabIndex).toBe(-1);

    flushSync(() =>
      first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
    );
    expect(document.activeElement).toBe(second);
    expect(second.tabIndex).toBe(0);
    expect(first.tabIndex).toBe(-1);

    flushSync(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
    expect(document.activeElement).toBe(button);
  });

  it('opens a submenu with the keyboard', async () => {
    render(
      <Dropdown
        defaultOpen
        menu={{
          items: [
            {
              key: 'parent',
              label: 'Parent',
              children: [
                { key: 'child-a', label: 'Child A' },
                { key: 'child-b', label: 'Child B' },
              ],
            },
          ],
        }}
      >
        <button type="button">Open</button>
      </Dropdown>,
    );

    await vi.waitFor(() => {
      expect(document.body.querySelector('[role="menuitem"][aria-haspopup="menu"]')).not.toBeNull();
    });
    const parent = document.body.querySelector<HTMLElement>(
      '[role="menuitem"][aria-haspopup="menu"]',
    );
    if (!parent) throw new Error('expected submenu parent');

    expect(parent.getAttribute('aria-expanded')).toBe('false');
    flushSync(() =>
      parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
    );
    expect(parent.getAttribute('aria-expanded')).toBe('true');

    const childA = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (node) => node.textContent === 'Child A',
    );
    const childB = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (node) => node.textContent === 'Child B',
    );
    expect(childA).toBeTruthy();
    expect(childB).toBeTruthy();
    await vi.waitFor(() => {
      expect(document.activeElement).toBe(childA);
    });
    expect(childA?.tabIndex).toBe(0);
    expect(childB?.tabIndex).toBe(-1);

    flushSync(() =>
      childA?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
    );
    expect(document.activeElement).toBe(childB);
    expect(childA?.tabIndex).toBe(-1);
    expect(childB?.tabIndex).toBe(0);

    flushSync(() =>
      childB?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
    expect(parent.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(parent);
    const submenu = document.body.querySelector<HTMLElement>('.yakit-dropdown-menu-sub');
    if (!submenu) throw new Error('expected submenu');
    // 状态关闭后不能被子菜单自身的 :focus-within/:hover 重新显示
    expect(getComputedStyle(submenu).display).toBe('none');

    flushSync(() =>
      parent.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
    await vi.waitFor(() => {
      expect(document.body.querySelector('.yakit-dropdown.yakit-dropdown-hidden')).not.toBeNull();
    });
  });

  it('reports antd-compatible keyPath for root, group, and submenu items', async () => {
    const onClick = vi.fn();

    render(
      <Dropdown defaultOpen menu={{ items: [{ key: 'root', label: 'Root' }], onClick }}>
        <button type="button">Open</button>
      </Dropdown>,
    );
    await vi.waitFor(() => {
      expect(document.body.querySelector('[role="menuitem"]')).not.toBeNull();
    });
    flushSync(() => document.body.querySelector<HTMLElement>('[role="menuitem"]')!.click());
    expect(onClick).toHaveBeenLastCalledWith(
      expect.objectContaining({ key: 'root', keyPath: ['root'] }),
    );

    cleanup();

    render(
      <Dropdown
        defaultOpen
        menu={{
          items: [
            {
              type: 'group',
              key: 'group',
              label: 'Group',
              children: [{ key: 'group-item', label: 'Group item' }],
            },
          ],
          onClick,
        }}
      >
        <button type="button">Open</button>
      </Dropdown>,
    );
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Group item');
    });
    const groupItem = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (node) => node.textContent === 'Group item',
    );
    if (!groupItem) throw new Error('expected group item');
    flushSync(() => groupItem.click());
    expect(onClick).toHaveBeenLastCalledWith(
      expect.objectContaining({ key: 'group-item', keyPath: ['group-item'] }),
    );

    cleanup();

    render(
      <Dropdown
        defaultOpen
        menu={{
          items: [
            {
              key: 'parent',
              label: 'Parent',
              children: [{ key: 'child', label: 'Child' }],
            },
          ],
          onClick,
        }}
      >
        <button type="button">Open</button>
      </Dropdown>,
    );
    await vi.waitFor(() => {
      expect(document.body.querySelector('[role="menuitem"][aria-haspopup="menu"]')).not.toBeNull();
    });
    const parent = document.body.querySelector<HTMLElement>(
      '[role="menuitem"][aria-haspopup="menu"]',
    )!;
    const child = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
      (node) => node.textContent === 'Child',
    );
    if (!child) throw new Error('expected child item');
    flushSync(() => child.click());
    expect(onClick).toHaveBeenLastCalledWith(
      expect.objectContaining({ key: 'child', keyPath: ['parent', 'child'] }),
    );
    expect(parent.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not open a disabled submenu parent on hover', async () => {
    render(
      <Dropdown
        defaultOpen
        menu={{
          items: [
            {
              key: 'parent',
              label: 'Parent',
              disabled: true,
              children: [{ key: 'child', label: 'Child' }],
            },
          ],
        }}
      >
        <button type="button">Open</button>
      </Dropdown>,
    );

    await vi.waitFor(() => {
      expect(document.body.querySelector('[role="menuitem"][aria-haspopup="menu"]')).not.toBeNull();
    });
    const parent = document.body.querySelector<HTMLElement>(
      '[role="menuitem"][aria-haspopup="menu"]',
    )!;
    const submenu = document.body.querySelector<HTMLElement>('.yakit-dropdown-menu-sub');
    if (!submenu) throw new Error('expected submenu');

    await userEvent.hover(parent);
    await vi.waitFor(() => {
      expect(getComputedStyle(submenu).display).toBe('none');
    });
    expect(parent.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders success, info, and text item type classes', async () => {
    render(
      <Dropdown
        defaultOpen
        menu={{
          items: [
            { key: 'success', label: 'Success', itemType: 'success' },
            { key: 'info', label: 'Info', itemType: 'info' },
            { key: 'text', label: 'Text', itemType: 'text' },
          ],
        }}
      >
        <button type="button">Open</button>
      </Dropdown>,
    );

    await vi.waitFor(() => {
      expect(document.body.querySelectorAll('[role="menuitem"]')).toHaveLength(3);
    });
    const items = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    expect(items[0].className).toContain('yakit-dropdown-menu-item-success');
    expect(items[1].className).toContain('yakit-dropdown-menu-item-info');
    expect(items[2].className).toContain('yakit-dropdown-menu-item-text');
  });

  it('does not leak item type colors into submenu children', async () => {
    render(
      <Dropdown
        defaultOpen
        menu={{
          items: [
            {
              key: 'parent',
              label: 'Parent',
              itemType: 'text',
              children: [{ key: 'child', label: 'Child' }],
            },
            { key: 'normal', label: 'Normal' },
          ],
        }}
      >
        <button type="button">Open</button>
      </Dropdown>,
    );

    await vi.waitFor(() => {
      expect(document.body.querySelector('[role="menuitem"][aria-haspopup="menu"]')).not.toBeNull();
    });
    const parent = document.body.querySelector<HTMLElement>(
      '[role="menuitem"][aria-haspopup="menu"]',
    )!;
    const nodes = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    const child = nodes.find((node) => node.textContent === 'Child');
    const normal = nodes.find((node) => node.textContent === 'Normal');
    if (!child || !normal) throw new Error('expected child and normal items');

    expect(getComputedStyle(parent).color).not.toBe(getComputedStyle(normal).color);
    expect(getComputedStyle(child).color).toBe(getComputedStyle(normal).color);
  });
});

import React from 'react';
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

  it('renders arrows only when requested and positions pointAtCenter arrows', async () => {
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
      <Dropdown
        arrow={{ pointAtCenter: true }}
        defaultOpen
        menu={{ items: [{ key: 'centered', label: 'Centered' }] }}
      >
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

    expect(dropdownRender).toHaveBeenCalled();
  });
});

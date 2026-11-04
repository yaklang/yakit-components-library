import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Menu from '../../src/components/Menu';
import { cleanup, render } from '../helpers/render';

afterEach(cleanup);

const Icon = () => <span data-testid="icon">i</span>;

describe('Menu behavior', () => {
  it('renders MenuItem label, icon and size classes', () => {
    const { container } = render(<Menu.Item icon={<Icon />} label="MITM" size="large" />);
    const item = container.querySelector('.yakit-menu-item');
    expect(item).not.toBeNull();
    expect(item?.classList.contains('yakit-menu-item-large')).toBe(true);
    expect(item?.classList.contains('yakit-menu-item-vertical')).toBe(true);
    expect(item?.textContent).toContain('MITM');
    expect(container.querySelector('[data-testid="icon"]')).not.toBeNull();
  });

  it('supports horizontal layout, select chevron and active state', () => {
    const { container } = render(
      <Menu.Item icon={<Icon />} label="Codec" size="medium" vertical={false} select active />,
    );
    const item = container.querySelector('.yakit-menu-item');
    expect(item?.classList.contains('yakit-menu-item-horizontal')).toBe(true);
    expect(item?.classList.contains('yakit-menu-item-select')).toBe(true);
    expect(item?.classList.contains('yakit-menu-item-active')).toBe(true);
    expect(container.querySelector('.yakit-menu-item-select-icon')).not.toBeNull();
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Menu.Item icon={<Icon />} label="Disabled" disabled onClick={onClick} />,
    );
    container.querySelector('button')?.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('composes Menu with groups and dividers', () => {
    const { container } = render(
      <Menu>
        <Menu.Group>
          <Menu.Item icon={<Icon />} label="A" />
        </Menu.Group>
        <Menu.Group divided={false}>
          <Menu.Item icon={<Icon />} label="B" />
        </Menu.Group>
      </Menu>,
    );
    expect(container.querySelector('.yakit-menu')).not.toBeNull();
    const groups = container.querySelectorAll('.yakit-menu-group');
    expect(groups).toHaveLength(2);
    expect(groups[0]?.classList.contains('yakit-menu-group-divided')).toBe(true);
    expect(groups[1]?.classList.contains('yakit-menu-group-divided')).toBe(false);
  });

  it('exposes menuitem role and aria-current when active (not aria-pressed)', () => {
    const { container } = render(<Menu.Item icon={<Icon />} label="MITM" active />);
    const item = container.querySelector('.yakit-menu-item');
    expect(item?.getAttribute('role')).toBe('menuitem');
    expect(item?.getAttribute('aria-current')).toBe('page');
    expect(item?.hasAttribute('aria-pressed')).toBe(false);
  });

  it('blocks keyboard activation for disabled non-button items', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Menu.Item component="div" icon={<Icon />} label="Disabled" disabled onClick={onClick} />,
    );
    const item = container.querySelector('.yakit-menu-item') as HTMLElement;
    expect(item.getAttribute('tabindex')).toBe('-1');
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    item.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('activates enabled div menuitem with Enter/Space', () => {
    const onClick = vi.fn();
    const { container } = render(
      <Menu.Item component="div" icon={<Icon />} label="Div" onClick={onClick} />,
    );
    const item = container.querySelector('.yakit-menu-item') as HTMLElement;
    expect(item.getAttribute('tabindex')).toBe('0');
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders SubGroup parent layout with shared label', () => {
    const { container } = render(
      <Menu>
        <Menu.SubGroup label="Fuzzer">
          <Menu.Item icon={<Icon />} size="medium" vertical={false} aria-label="Web" />
          <Menu.Item icon={<Icon />} size="medium" vertical={false} aria-label="WS" />
        </Menu.SubGroup>
      </Menu>,
    );
    expect(container.querySelector('.yakit-menu-subgroup')).not.toBeNull();
    expect(container.querySelector('.yakit-menu-subgroup-label')?.textContent).toBe('Fuzzer');
    expect(container.querySelectorAll('.yakit-menu-item')).toHaveLength(2);
  });

  it('supports Group parentLabel layout', () => {
    const { container } = render(
      <Menu>
        <Menu.Group parentLabel="Brute" divided={false}>
          <Menu.Item icon={<Icon />} aria-label="Weak" />
          <Menu.Item icon={<Icon />} aria-label="Dir" />
        </Menu.Group>
      </Menu>,
    );
    expect(container.querySelector('.yakit-menu-group-parent')).not.toBeNull();
    expect(container.querySelector('.yakit-menu-group-parent-label')?.textContent).toBe('Brute');
  });

  it('wires Menu activeKey / onSelect via itemKey', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Menu activeKey="b" onSelect={onSelect}>
        <Menu.Item icon={<Icon />} label="A" itemKey="a" />
        <Menu.Item icon={<Icon />} label="B" itemKey="b" />
      </Menu>,
    );
    const items = container.querySelectorAll('.yakit-menu-item');
    expect(items[1]?.classList.contains('yakit-menu-item-active')).toBe(true);
    expect(items[1]?.getAttribute('aria-current')).toBe('page');
    (items[0] as HTMLElement).click();
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'a' }));
  });

  it('does not render label when label is false or empty', () => {
    const falseLabel = render(
      <Menu.Item icon={<Icon />} label={false as unknown as string} aria-label="x" />,
    );
    expect(falseLabel.container.querySelector('.yakit-menu-item-label')).toBeNull();

    const empty = render(<Menu.Item icon={<Icon />} label="" aria-label="x" />);
    expect(empty.container.querySelector('.yakit-menu-item-label')).toBeNull();
  });

  it('opens Dropdown panel when select + menu is provided', async () => {
    const { container } = render(
      <Menu.Item
        icon={<Icon />}
        label="Plugin"
        select
        menu={{ items: [{ key: 'a', label: 'Option A' }] }}
      />,
    );
    expect(container.querySelector('.yakit-menu-item-select')).not.toBeNull();
    container.querySelector('button')?.click();
    await vi.waitFor(() => {
      expect(document.body.querySelector('.yakit-dropdown-panel')).not.toBeNull();
    });
    expect(document.body.textContent).toContain('Option A');
  });

  it('keeps hover target classes for non-active enabled items', () => {
    const { container } = render(<Menu.Item icon={<Icon />} label="Hover" />);
    const item = container.querySelector('.yakit-menu-item');
    expect(item?.classList.contains('yakit-menu-item-disabled')).toBe(false);
    expect(item?.classList.contains('yakit-menu-item-active')).toBe(false);
  });
});

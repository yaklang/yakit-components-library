import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Checkbox from '../../src/components/Checkbox';
import ConfigProvider from '../../src/components/ConfigProvider';
import { cleanup, render } from '../helpers/render';

afterEach(cleanup);

const checkboxInput = (container: HTMLElement) => {
  const input = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!input) throw new Error('expected checkbox input');
  return input;
};

const iconBox = (root: Element) => {
  const svg = root.querySelector<SVGSVGElement>('.yakit-checkbox-icon svg');
  return {
    height: svg?.getAttribute('height') ?? null,
    mark: root.querySelector('.yakit-checkbox-indeterminate-mark'),
    width: svg?.getAttribute('width') ?? null,
  };
};

describe('Checkbox size, theme, and icon', () => {
  it('uses medium geometry by default and large geometry when size or provider asks for it', () => {
    const { container } = render(
      <>
        <Checkbox defaultChecked>medium</Checkbox>
        <Checkbox defaultChecked size="large">
          large
        </Checkbox>
        <ConfigProvider componentSize="huge">
          <Checkbox defaultChecked>huge provider</Checkbox>
        </ConfigProvider>
        <ConfigProvider componentSize="large">
          <Checkbox defaultChecked size="medium">
            explicit medium
          </Checkbox>
        </ConfigProvider>
        <ConfigProvider componentSize="small">
          <Checkbox defaultChecked>small provider</Checkbox>
        </ConfigProvider>
      </>,
    );
    const roots = [...container.querySelectorAll<HTMLElement>('.yakit-checkbox')];

    expect(roots.map((root) => root.classList.contains('yakit-checkbox-large'))).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
    expect(roots.map((root) => iconBox(root).width)).toEqual(['12', '15', '15', '12', '12']);
    expect(roots.map((root) => iconBox(root).height)).toEqual(['12', '15', '15', '12', '12']);
  });

  it('applies theme mode, direction, and checkbox token variables', () => {
    const { container } = render(
      <ConfigProvider
        direction="rtl"
        theme={{
          components: { YakitCheckbox: { gap: '10px', sizeMD: '18px' } },
          mode: 'dark',
          token: { colorPrimary: '#123456' },
        }}
      >
        <Checkbox>主题</Checkbox>
      </ConfigProvider>,
    );
    const root = container.querySelector<HTMLElement>('.yakit-checkbox');

    expect(root?.getAttribute('data-theme')).toBe('dark');
    expect(root?.dir).toBe('rtl');
    expect(root?.style.getPropertyValue('--yakit-color-primary')).toBe('#123456');
    expect(root?.style.getPropertyValue('--yakit-checkbox-size-md')).toBe('18px');
    expect(root?.style.getPropertyValue('--yakit-checkbox-gap')).toBe('10px');
  });

  it('shows the check icon only when checked, and keeps checked ahead of indeterminate', async () => {
    const { container } = render(
      <ConfigProvider locale={{ Checkbox: { indeterminate: '半选' }, locale: 'zh-CN' }}>
        <Checkbox defaultChecked={false} />
        <Checkbox indeterminate />
        <Checkbox defaultChecked indeterminate>
          全选
        </Checkbox>
      </ConfigProvider>,
    );
    const roots = [...container.querySelectorAll<HTMLElement>('.yakit-checkbox')];
    const inputs = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];

    expect(iconBox(roots[0])).toEqual({ height: null, mark: null, width: null });
    expect(inputs[0].getAttribute('aria-checked')).toBe('false');

    expect(roots[1].classList.contains('yakit-checkbox-indeterminate')).toBe(true);
    expect(roots[1].classList.contains('yakit-checkbox-checked')).toBe(false);
    expect(iconBox(roots[1]).mark).not.toBeNull();
    expect(iconBox(roots[1]).width).toBeNull();
    expect(inputs[1].getAttribute('aria-checked')).toBe('mixed');
    expect(inputs[1].getAttribute('aria-label')).toBe('半选');

    expect(roots[2].classList.contains('yakit-checkbox-checked')).toBe(true);
    expect(roots[2].classList.contains('yakit-checkbox-indeterminate')).toBe(false);
    expect(iconBox(roots[2]).mark).toBeNull();
    expect(iconBox(roots[2]).width).toBe('12');
    expect(inputs[2].getAttribute('aria-checked')).toBe('true');
    expect(inputs[2].getAttribute('aria-label')).toBeNull();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(inputs[1].indeterminate).toBe(true);
    expect(inputs[2].indeterminate).toBe(false);
  });

  it('keeps className and rootClassName on the label', () => {
    const { container } = render(
      <Checkbox className="from-class" rootClassName="from-root">
        文案
      </Checkbox>,
    );
    const root = container.querySelector('.yakit-checkbox');

    expect(root?.classList.contains('from-class')).toBe(true);
    expect(root?.classList.contains('from-root')).toBe(true);
  });
});

describe('Checkbox disabled state and ref', () => {
  it('blocks its own change and inherits provider disabled unless explicitly enabled', () => {
    const onDisabled = vi.fn();
    const onEnabled = vi.fn();
    const { container } = render(
      <ConfigProvider componentDisabled>
        <Checkbox onChange={onDisabled}>继承禁用</Checkbox>
        <Checkbox disabled={false} onChange={onEnabled}>
          显式可用
        </Checkbox>
      </ConfigProvider>,
    );
    const roots = [...container.querySelectorAll<HTMLElement>('.yakit-checkbox')];
    const inputs = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];

    expect(roots[0].classList.contains('yakit-checkbox-disabled')).toBe(true);
    expect(inputs[0].disabled).toBe(true);
    expect(inputs[1].disabled).toBe(false);

    flushSync(() => inputs[0].click());
    flushSync(() => inputs[1].click());
    expect(onDisabled).not.toHaveBeenCalled();
    expect(inputs[0].checked).toBe(false);
    expect(onEnabled).toHaveBeenCalledTimes(1);
    expect(inputs[1].checked).toBe(true);
  });

  it('exposes the native input through ref', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(<Checkbox ref={ref}>同意</Checkbox>);

    expect(ref.current).toBe(checkboxInput(container));
    expect(ref.current?.tagName).toBe('INPUT');
  });
});

describe('Checkbox.Group option fields', () => {
  it('inherits group disabled and name, while an explicit enabled child stays usable', () => {
    const onEnabled = vi.fn();
    const { container } = render(
      <Checkbox.Group defaultValue={['a']} disabled name="letters">
        <Checkbox value="a">A</Checkbox>
        <Checkbox disabled={false} onChange={onEnabled} value="b">
          B
        </Checkbox>
      </Checkbox.Group>,
    );
    const inputs = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];

    expect(inputs.map((input) => input.disabled)).toEqual([true, false]);
    expect(inputs.map((input) => input.name)).toEqual(['letters', 'letters']);
    expect(inputs[0].checked).toBe(true);

    flushSync(() => inputs[1].click());
    expect(onEnabled).toHaveBeenCalledTimes(1);
    expect(inputs[1].checked).toBe(true);
  });

  it('forwards option title, className, style, disabled, and onChange', () => {
    const onDisabledOption = vi.fn();
    const onGroup = vi.fn();
    const { container } = render(
      <Checkbox.Group
        name="habits"
        onChange={onGroup}
        options={[
          {
            className: 'opt-a',
            disabled: true,
            label: 'A',
            onChange: onDisabledOption,
            style: { marginLeft: 4 },
            title: '提示 A',
            value: 'a',
          },
          { label: 'B', value: 'b' },
        ]}
      />,
    );
    const roots = [...container.querySelectorAll<HTMLLabelElement>('.yakit-checkbox')];
    const inputs = [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];

    expect(roots[0].classList.contains('opt-a')).toBe(true);
    expect(roots[0].classList.contains('yakit-checkbox-disabled')).toBe(true);
    expect(roots[0].getAttribute('title')).toBe('提示 A');
    expect(roots[0].style.marginLeft).toBe('4px');
    expect(inputs[0].disabled).toBe(true);
    expect(inputs.map((input) => input.name)).toEqual(['habits', 'habits']);

    flushSync(() => inputs[0].click());
    expect(onDisabledOption).not.toHaveBeenCalled();
    expect(onGroup).not.toHaveBeenCalled();
    expect(inputs[0].checked).toBe(false);

    flushSync(() => inputs[1].click());
    expect(onGroup).toHaveBeenCalledTimes(1);
    expect(onGroup.mock.calls[0][0]).toEqual(['b']);
    expect(inputs[1].checked).toBe(true);
  });
});

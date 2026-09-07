import { userEvent } from '@vitest/browser/context';
import React from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Button from '../../src/components/Button';
import ConfigProvider from '../../src/components/ConfigProvider';
import { cleanup, render } from '../helpers/render';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Button', () => {
  it('uses native button semantics without submitting a form by default', () => {
    const onSubmit = vi.fn<(event: React.FormEvent<HTMLFormElement>) => void>((event) =>
      event.preventDefault(),
    );
    const { container } = render(
      <form onSubmit={onSubmit}>
        <input defaultValue="initial" />
        <Button>Default</Button>
        <Button htmlType="submit">Submit</Button>
        <Button htmlType="reset">Reset</Button>
      </form>,
    );
    const input = container.querySelector('input');
    const [defaultButton, submitButton, resetButton] = [
      ...container.querySelectorAll<HTMLButtonElement>('button'),
    ];
    if (!input || !defaultButton || !submitButton || !resetButton) {
      throw new Error('expected the complete Button form fixture');
    }

    expect(defaultButton.type).toBe('button');
    defaultButton.click();
    expect(onSubmit).not.toHaveBeenCalled();

    submitButton.click();
    expect(onSubmit).toHaveBeenCalledOnce();

    input.value = 'changed';
    resetButton.click();
    expect(input.value).toBe('initial');
  });

  it('applies variants, provider defaults and explicit overrides', () => {
    const { container } = render(
      <ConfigProvider
        componentDisabled
        componentSize="large"
        direction="rtl"
        theme={{ mode: 'dark' }}
      >
        <Button type="outline1" color="success" shape="round">
          Inherited
        </Button>
        <Button disabled={false} error size="small">
          Overridden
        </Button>
      </ConfigProvider>,
    );
    const [inherited, overridden] = [...container.querySelectorAll<HTMLButtonElement>('button')];

    expect(inherited).toBeDisabled();
    expect(inherited).toHaveClass(
      'yakit-btn-outline1',
      'yakit-btn-large',
      'yakit-btn-round',
      'yakit-btn-color-success',
    );
    expect(inherited).toHaveAttribute('data-theme', 'dark');
    expect(inherited).toHaveAttribute('dir', 'rtl');

    expect(overridden).not.toBeDisabled();
    expect(overridden).toHaveClass('yakit-btn-small', 'yakit-btn-color-error');
    expect(overridden).not.toHaveClass('yakit-btn-color-primary');
    expect(overridden).toHaveAttribute('dir', 'rtl');
  });

  it('wraps string children but preserves ReactNode child structure', () => {
    const { container } = render(
      <>
        <Button animation={false}>String child</Button>
        <Button animation={false}>
          <strong>Strong</strong>
          <em>Emphasis</em>
        </Button>
      </>,
    );
    const [stringButton, nodeButton] = [...container.querySelectorAll<HTMLButtonElement>('button')];

    expect(stringButton?.children).toHaveLength(1);
    expect(stringButton?.firstElementChild?.tagName).toBe('SPAN');
    expect(stringButton?.firstElementChild).toHaveTextContent('String child');
    expect([...nodeButton.children].map((child) => child.tagName)).toEqual(['STRONG', 'EM']);
  });

  it('renders icon positions and preserves an icon-only accessible name', () => {
    const { container } = render(
      <>
        <Button aria-label="Refresh" icon={<span data-testid="refresh-icon" />} />
        <Button icon={<span data-testid="next-icon" />} iconPosition="end">
          Next
        </Button>
      </>,
    );
    const [iconOnly, iconEnd] = [...container.querySelectorAll<HTMLButtonElement>('button')];

    expect(iconOnly).toHaveClass('yakit-btn-icon-only');
    expect(iconOnly).toHaveAttribute('aria-label', 'Refresh');
    expect(iconOnly?.querySelector('.yakit-btn-icon [data-testid="refresh-icon"]')).not.toBeNull();
    expect(iconEnd).toHaveClass('yakit-btn-icon-end');
    expect(iconEnd?.querySelector('.yakit-btn-icon [data-testid="next-icon"]')).not.toBeNull();
    expect(iconEnd).toHaveTextContent('Next');
  });

  it('blocks disabled and loading pointer or keyboard activation without creating waves', async () => {
    const onDisabledClick = vi.fn();
    const onLoadingClick = vi.fn();
    const { container } = render(
      <>
        <Button disabled onClick={onDisabledClick}>
          Disabled
        </Button>
        <Button loading onClick={onLoadingClick}>
          Loading
        </Button>
      </>,
    );
    const [disabled, loading] = [...container.querySelectorAll<HTMLButtonElement>('button')];

    disabled?.click();
    loading?.click();
    disabled?.focus();
    await userEvent.keyboard('{Enter}{Space}');
    loading?.focus();
    await userEvent.keyboard('{Enter}{Space}');

    expect(disabled).toBeDisabled();
    expect(loading).toBeDisabled();
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading).toHaveClass('yakit-btn-loading');
    expect(loading?.querySelector('svg')).not.toBeNull();
    expect(disabled?.querySelector('.yakit-wave-holder')).toBeNull();
    expect(loading?.querySelector('.yakit-wave-holder')).toBeNull();
    expect(onDisabledClick).not.toHaveBeenCalled();
    expect(onLoadingClick).not.toHaveBeenCalled();
  });

  it('calls a normal click once and restores regular content after loading stops', () => {
    const onClick = vi.fn();
    const { container, root } = render(
      <Button icon={<span data-testid="ordinary-icon" />} loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = container.querySelector<HTMLButtonElement>('button');

    expect(button?.querySelector('[data-testid="ordinary-icon"]')).toBeNull();
    expect(button?.querySelector('svg')).not.toBeNull();

    flushSync(() =>
      root.render(
        <Button icon={<span data-testid="ordinary-icon" />} onClick={onClick}>
          Save
        </Button>,
      ),
    );
    button?.click();

    expect(button).not.toBeDisabled();
    expect(button).not.toHaveAttribute('aria-busy');
    expect(button?.querySelector('[data-testid="ordinary-icon"]')).not.toBeNull();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('reflects pointer and keyboard pressed state until release', async () => {
    const { container } = render(<Button animation={false}>Press</Button>);
    const button = container.querySelector<HTMLButtonElement>('button');
    if (!button) throw new Error('expected a button');

    flushSync(() => button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(button).toHaveClass('yakit-btn-primary-pressed');

    await userEvent.hover(button);
    await userEvent.unhover(button);
    expect(button).not.toHaveClass('yakit-btn-primary-pressed');

    flushSync(() => button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
    expect(button).toHaveClass('yakit-btn-primary-pressed');

    flushSync(() => window.dispatchEvent(new MouseEvent('mouseup')));
    expect(button).not.toHaveClass('yakit-btn-primary-pressed');

    flushSync(() =>
      button.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );
    expect(button).toHaveClass('yakit-btn-primary-pressed');

    flushSync(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' })));
    expect(button).not.toHaveClass('yakit-btn-primary-pressed');

    flushSync(() =>
      button.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' })),
    );
    expect(button).toHaveClass('yakit-btn-primary-pressed');
    flushSync(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' })));
    expect(button).not.toHaveClass('yakit-btn-primary-pressed');

    flushSync(() =>
      button.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })),
    );
    expect(button).not.toHaveClass('yakit-btn-primary-pressed');
  });

  it('removes its global pressed-state listeners on unmount', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener');
    const removeEventListener = vi.spyOn(window, 'removeEventListener');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Button animation={false}>Lifecycle</Button>);
    const mouseUpListener = addEventListener.mock.calls.find(([type]) => type === 'mouseup')?.[1];
    const keyUpListener = addEventListener.mock.calls.find(([type]) => type === 'keyup')?.[1];
    if (!mouseUpListener || !keyUpListener) {
      throw new Error('expected Button to register pressed-state release listeners');
    }

    cleanup();

    expect(removeEventListener).toHaveBeenCalledWith('mouseup', mouseUpListener);
    expect(removeEventListener).toHaveBeenCalledWith('keyup', keyUpListener);
    expect(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter' }));
    }).not.toThrow();
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it('merges classes and lets consumer styles override provider token variables', () => {
    const { container } = render(
      <ConfigProvider
        theme={{
          components: { YakitButton: { borderRadius: '9px', iconGap: '6px' } },
          token: { colorPrimary: '#123456' },
        }}
      >
        <Button
          className="consumer-class"
          rootClassName="consumer-root"
          style={{ '--yakit-color-primary': '#abcdef' } as React.CSSProperties}
        >
          Styled
        </Button>
      </ConfigProvider>,
    );
    const button = container.querySelector<HTMLElement>('button');

    expect(button).toHaveClass('consumer-class', 'consumer-root');
    expect(button?.style.getPropertyValue('--yakit-color-primary')).toBe('#abcdef');
    expect(button?.style.getPropertyValue('--yakit-btn-border-radius')).toBe('9px');
    expect(button?.style.getPropertyValue('--yakit-btn-icon-gap')).toBe('6px');
  });
});

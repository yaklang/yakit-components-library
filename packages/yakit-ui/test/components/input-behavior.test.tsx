import { userEvent } from '@vitest/browser/context';
import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfigProvider from '../../src/components/ConfigProvider';
import Input, { type InputRef, type OTPRef, type TextAreaRef } from '../../src/components/Input';
import { cleanup, render, setNativeInputValue } from '../helpers/render';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Input behavior', () => {
  it('initializes from defaultValue and reports uncontrolled user input', () => {
    const onChange = vi.fn();
    const { container } = render(<Input defaultValue="initial" onChange={onChange} />);
    const input = container.querySelector('input');
    if (!input) throw new Error('expected an input');

    expect(input.value).toBe('initial');
    flushSync(() => setNativeInputValue(input, 'edited'));
    expect(input.value).toBe('edited');
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0].target.value).toBe('edited');
  });

  it('clears an uncontrolled value and emits onClear', () => {
    const onClear = vi.fn();
    const { container } = render(<Input allowClear defaultValue="content" onClear={onClear} />);
    const input = container.querySelector('input');
    const clear = container.querySelector<HTMLButtonElement>('.yakit-input-control-clear-icon');

    if (!input || !clear) throw new Error('expected an input and clear button');
    flushSync(() => clear.click());

    expect(input.value).toBe('');
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('reports the current character count against maxLength', () => {
    const { container } = render(<Input defaultValue="abc" maxLength={5} showCount />);

    expect(container.querySelector('.yakit-input-control-show-count-suffix')?.textContent).toBe(
      '3 / 5',
    );
  });

  it('emits onPressEnter for the native Enter key', () => {
    const onPressEnter = vi.fn();
    const { container } = render(<Input onPressEnter={onPressEnter} />);
    const input = container.querySelector('input');

    if (!input) throw new Error('expected an input');
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));

    expect(onPressEnter).toHaveBeenCalledTimes(1);
  });

  it('suppresses onPressEnter while an IME composition is active', () => {
    const onPressEnter = vi.fn();
    const { container } = render(<Input onPressEnter={onPressEnter} />);
    const input = container.querySelector('input');

    if (!input) throw new Error('expected an input');
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '中' }));

    expect(onPressEnter).not.toHaveBeenCalled();
  });

  it('keeps a controlled value authoritative when clearing', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    const { container } = render(
      <Input allowClear onChange={onChange} onClear={onClear} value="controlled" />,
    );
    const input = container.querySelector('input');
    const clear = container.querySelector<HTMLButtonElement>('.yakit-input-control-clear-icon');

    if (!input || !clear) throw new Error('expected controlled input and clear button');
    flushSync(() => clear.click());

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(input.value).toBe('controlled');
  });

  it('forwards prefix and suffix content to semantic affix slots', () => {
    const { container } = render(<Input prefix="before" suffix="after" />);

    expect(container.querySelector('.yakit-input-control-prefix')?.textContent).toBe('before');
    expect(container.querySelector('.yakit-input-control-suffix')?.textContent).toBe('after');
  });

  it('exposes the native element through the Input ref', () => {
    const ref = createRef<InputRef>();
    render(<Input ref={ref} />);

    expect(ref.current?.input).toBeInstanceOf(HTMLInputElement);
  });

  it('exposes focus, blur, and selection through the owned Input ref', () => {
    const ref = createRef<InputRef>();
    render(<Input defaultValue="select me" ref={ref} />);

    ref.current?.focus();
    ref.current?.setSelectionRange(0, 6);
    expect(document.activeElement).toBe(ref.current?.input);
    expect(ref.current?.input?.selectionStart).toBe(0);
    expect(ref.current?.input?.selectionEnd).toBe(6);
    ref.current?.blur();
    expect(document.activeElement).not.toBe(ref.current?.input);
  });

  it('serializes and resets an uncontrolled value through its owning form', () => {
    const { container } = render(
      <form>
        <Input defaultValue="initial" name="query" />
      </form>,
    );
    const form = container.querySelector('form');
    const input = container.querySelector('input');
    if (!form || !input) throw new Error('expected an input form control');

    flushSync(() => setNativeInputValue(input, 'changed'));
    expect(new FormData(form).get('query')).toBe('changed');
    flushSync(() => form.reset());
    expect(input.value).toBe('initial');
  });

  it('keeps controlled values authoritative across form reset', () => {
    const onChange = vi.fn();
    const { container } = render(
      <form>
        <Input name="query" onChange={onChange} value="controlled" />
      </form>,
    );
    const form = container.querySelector('form');
    const input = container.querySelector('input');
    if (!form || !input) throw new Error('expected a controlled form input');

    flushSync(() => setNativeInputValue(input, 'edited'));
    expect(onChange).toHaveBeenCalledOnce();
    expect(input.value).toBe('controlled');
    flushSync(() => form.reset());
    expect(input.value).toBe('controlled');
  });

  it('excludes disabled inputs from native form serialization', () => {
    const { container } = render(
      <form>
        <Input defaultValue="hidden" disabled name="disabled-query" />
        <Input defaultValue="visible" name="query" />
      </form>,
    );
    const form = container.querySelector('form');
    if (!form) throw new Error('expected an input form');

    const data = new FormData(form);
    expect(data.has('disabled-query')).toBe(false);
    expect(data.get('query')).toBe('visible');
  });

  it('focuses after clear and emits an input change event with an empty target value', () => {
    const onChange = vi.fn();
    const { container } = render(<Input allowClear defaultValue="content" onChange={onChange} />);
    const input = container.querySelector('input');
    const clear = container.querySelector<HTMLButtonElement>('.yakit-input-control-clear-icon');
    if (!input || !clear) throw new Error('expected a clearable input');

    flushSync(() => clear.click());
    expect(document.activeElement).toBe(input);
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[0].target.value).toBe('');
  });

  it('normalizes the middle size alias and applies the requested variant', () => {
    const { container } = render(<Input size="middle" variant="filled" />);
    const input = container.querySelector('input');

    expect(input).toHaveClass('yakit-input-medium', 'yakit-input-control-medium');
    expect(input).not.toHaveClass('yakit-input-middle');
    expect(input).toHaveClass('yakit-input-filled');
  });

  it('uses Unicode-aware custom count strategy and formatter metadata', () => {
    const formatter = vi.fn(
      ({ count, value }: { count: number; maxLength?: number; value: string }) =>
        `${value}:${count}`,
    );
    const strategy = vi.fn((value: string) => Array.from(value).length);
    const { container } = render(
      <Input count={{ formatter, strategy }} defaultValue="A😀中" maxLength={5} showCount />,
    );

    expect(container.querySelector('.yakit-input-control-show-count-suffix')?.textContent).toBe(
      'A😀中:3',
    );
    expect(strategy).toHaveBeenCalledWith('A😀中');
    expect(formatter).toHaveBeenCalledWith({ count: 3, maxLength: 5, value: 'A😀中' });
  });

  it('applies semantic object classes and styles to every affix slot', () => {
    const { container } = render(
      <Input
        allowClear
        classNames={{
          clear: 'input-clear-slot',
          count: 'input-count-slot',
          input: 'input-field-slot',
          prefix: 'input-prefix-slot',
          root: 'input-root-slot',
          suffix: 'input-suffix-slot',
        }}
        defaultValue="value"
        prefix="before"
        showCount
        styles={{
          clear: { opacity: 0.6 },
          count: { fontWeight: 700 },
          input: { letterSpacing: 2 },
          prefix: { color: 'rgb(1, 2, 3)' },
          root: { borderWidth: 3 },
          suffix: { color: 'rgb(4, 5, 6)' },
        }}
        suffix="after"
      />,
    );

    for (const slot of ['root', 'field', 'prefix', 'suffix', 'clear', 'count']) {
      expect(container.querySelector(`.input-${slot}-slot`)).not.toBeNull();
      expect(container.querySelector(`.input-${slot}-slot`)?.getAttribute('style')).not.toBeNull();
    }
  });

  it('exposes the affix wrapper as nativeElement while retaining the native input handle', () => {
    const ref = createRef<InputRef>();
    const { container } = render(<Input prefix="before" ref={ref} />);

    expect(ref.current?.input).toBe(container.querySelector('input'));
    expect(ref.current?.nativeElement).toBe(container.querySelector('.yakit-input-slot-root'));
  });

  it('supports native Enter and Space clear activation with default and localized labels', async () => {
    const defaultInput = render(<Input allowClear defaultValue="first" />);
    const defaultClear = defaultInput.container.querySelector<HTMLButtonElement>(
      '.yakit-input-control-clear-icon',
    );
    expect(defaultClear).toHaveAttribute('aria-label', '清除');
    defaultClear?.focus();
    await userEvent.keyboard('{Enter}');
    expect(defaultInput.container.querySelector('input')?.value).toBe('');

    const localized = render(
      <ConfigProvider locale={{ Input: { clear: 'Erase input' }, locale: 'test' }}>
        <Input allowClear defaultValue="second" />
      </ConfigProvider>,
    );
    const localizedClear = localized.container.querySelector<HTMLButtonElement>(
      '.yakit-input-control-clear-icon',
    );
    expect(localizedClear).toHaveAttribute('aria-label', 'Erase input');
    localizedClear?.focus();
    await userEvent.keyboard('{Space}');
    expect(localized.container.querySelector('input')?.value).toBe('');
  });

  it('keeps native placeholder, autocomplete, data, and aria attributes on the input node', () => {
    const { container } = render(
      <Input
        aria-describedby="input-help"
        autoComplete="email"
        data-owner="field"
        placeholder="Email"
        prefix="before"
      />,
    );
    const input = container.querySelector('input');
    const root = container.querySelector('.yakit-input-slot-root');

    expect(input).toHaveAttribute('placeholder', 'Email');
    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).toHaveAttribute('data-owner', 'field');
    expect(input).toHaveAttribute('aria-describedby', 'input-help');
    expect(root).not.toHaveAttribute('placeholder');
    expect(root).not.toHaveAttribute('autocomplete');
    expect(root).not.toHaveAttribute('data-owner');
    expect(root).not.toHaveAttribute('aria-describedby');
  });

  it('maps error status to native invalid state and keeps clear keyboard-accessible', () => {
    const { container } = render(<Input allowClear defaultValue="value" error />);

    expect(container.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(
      container.querySelector<HTMLButtonElement>('.yakit-input-control-clear-icon')?.tabIndex,
    ).toBe(0);
  });

  it('renders a custom clear icon only while a value is editable', () => {
    const editable = render(
      <Input
        allowClear={{ clearIcon: <span data-testid="custom-clear">erase</span> }}
        defaultValue="value"
      />,
    );
    const disabled = render(<Input allowClear defaultValue="value" disabled />);
    const readOnly = render(<Input allowClear defaultValue="value" readOnly />);

    expect(editable.container.querySelector('[data-testid="custom-clear"]')?.textContent).toBe(
      'erase',
    );
    expect(disabled.container.querySelector('.yakit-input-control-clear-icon')).toBeNull();
    expect(readOnly.container.querySelector('.yakit-input-control-clear-icon')).toBeNull();
  });

  it('applies semantic callbacks and native accessibility attributes to their owned nodes', () => {
    const classNames = vi.fn(() => ({ input: 'semantic-input', root: 'semantic-root' }));
    const styles = vi.fn(() => ({ input: { color: 'rgb(1, 2, 3)' } }));
    const { container } = render(
      <Input
        aria-invalid="false"
        classNames={classNames}
        data-owner="native"
        defaultValue="value"
        error
        prefix="prefix"
        styles={styles}
      />,
    );
    const input = container.querySelector('input');

    expect(classNames).toHaveBeenLastCalledWith({
      disabled: false,
      focused: false,
      value: 'value',
    });
    expect(styles).toHaveBeenLastCalledWith({ disabled: false, focused: false, value: 'value' });
    expect(container.querySelector('.semantic-root')).not.toBeNull();
    expect(input).toHaveClass('semantic-input');
    expect(input?.style.color).toBe('rgb(1, 2, 3)');
    expect(input).toHaveAttribute('data-owner', 'native');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('Input.TextArea behavior', () => {
  it('preserves a controlled multiline value', () => {
    const { container } = render(<Input.TextArea value={'first\nsecond'} readOnly />);

    expect(container.querySelector('textarea')?.value).toBe('first\nsecond');
  });

  it('retains Yakit vertical resize styling when autoSize is enabled', () => {
    const { container } = render(
      <Input.TextArea autoSize={{ maxRows: 4, minRows: 2 }} defaultValue={'first\nsecond'} />,
    );
    const textarea = container.querySelector('textarea');

    if (!textarea) throw new Error('expected a textarea');
    expect(getComputedStyle(textarea).resize).toBe('vertical');
  });

  it('leaves inline height and overflow unset when autoSize is false', () => {
    const { container } = render(<Input.TextArea autoSize={false} defaultValue="one" />);
    const textarea = container.querySelector('textarea');

    expect(textarea?.style.height).toBe('');
    expect(textarea?.style.overflowY).toBe('');
  });

  it('remeasures deterministic layout changes from ResizeObserver and disconnects on unmount', async () => {
    type ObserverCallback = (
      entries: Array<{ contentRect: { width: number } }>,
      observer: { disconnect: () => void },
    ) => void;
    let callback: ObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    class ResizeObserverMock {
      constructor(next: ObserverCallback) {
        callback = next;
      }

      disconnect = disconnect;
      observe = observe;
      unobserve = vi.fn();
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    const { container } = render(
      <Input.TextArea autoSize={{ maxRows: 4, minRows: 2 }} defaultValue="one" />,
    );
    const textarea = container.querySelector('textarea');
    if (!textarea || !callback) throw new Error('expected an observed autosizing textarea');

    expect(observe).toHaveBeenCalledWith(textarea);
    textarea.style.lineHeight = '30px';
    callback([{ contentRect: { width: 200 } }], { disconnect });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(textarea.style.height).toBe('72px');

    cleanup();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('includes border and padding in autoSize row bounds and remeasures font changes', async () => {
    const { container } = render(
      <Input.TextArea autoSize={{ maxRows: 3, minRows: 2 }} defaultValue="one" />,
    );
    const textarea = container.querySelector('textarea');
    if (!textarea) throw new Error('expected an autosizing textarea');

    expect(textarea.style.height).toBe('52px');
    textarea.style.lineHeight = '30px';
    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(textarea.style.height).toBe('72px');

    flushSync(() => setNativeInputValue(textarea, '1\n2\n3\n4'));
    expect(Number.parseFloat(textarea.style.height)).toBeLessThanOrEqual(102);
    expect(textarea.style.overflowY).toBe('auto');
  });

  it('forwards disabled and readOnly states to the textarea', () => {
    const { container } = render(<Input.TextArea disabled readOnly />);
    const textarea = container.querySelector('textarea');

    expect(textarea?.disabled).toBe(true);
    expect(textarea?.readOnly).toBe(true);
  });

  it('restores an uncontrolled textarea when its owning form resets', () => {
    const { container } = render(
      <form>
        <Input.TextArea defaultValue="initial" name="notes" />
      </form>,
    );
    const form = container.querySelector('form');
    const textarea = container.querySelector('textarea');
    if (!form || !textarea) throw new Error('expected a textarea form control');

    flushSync(() => setNativeInputValue(textarea, 'changed'));
    flushSync(() => form.reset());
    expect(textarea.value).toBe('initial');
  });

  it('clears an editable value with a custom icon and emits onClear once', () => {
    const onClear = vi.fn();
    const { container } = render(
      <Input.TextArea
        allowClear={{ clearIcon: <span data-testid="textarea-clear">erase</span> }}
        defaultValue="content"
        onClear={onClear}
      />,
    );
    const textarea = container.querySelector('textarea');
    const clear = container.querySelector<HTMLButtonElement>('.yakit-input-control-clear-icon');
    if (!textarea || !clear) throw new Error('expected a clearable textarea');

    expect(clear.querySelector('[data-testid="textarea-clear"]')?.textContent).toBe('erase');
    flushSync(() => clear.click());
    expect(textarea.value).toBe('');
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('keeps a controlled value authoritative across edits and clear actions', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    const { container } = render(
      <Input.TextArea allowClear onChange={onChange} onClear={onClear} value="controlled" />,
    );
    const textarea = container.querySelector('textarea');
    const clear = container.querySelector<HTMLButtonElement>('.yakit-input-control-clear-icon');
    if (!textarea || !clear) throw new Error('expected a controlled clearable textarea');

    flushSync(() => setNativeInputValue(textarea, 'edited'));
    expect(onChange).toHaveBeenCalledOnce();
    expect(textarea.value).toBe('controlled');

    flushSync(() => clear.click());
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onClear).toHaveBeenCalledOnce();
    expect(textarea.value).toBe('controlled');
  });

  it('does not expose clear actions for disabled or readOnly textareas', () => {
    const disabled = render(<Input.TextArea allowClear defaultValue="value" disabled />);
    const readOnly = render(<Input.TextArea allowClear defaultValue="value" readOnly />);

    expect(disabled.container.querySelector('.yakit-input-control-clear-icon')).toBeNull();
    expect(readOnly.container.querySelector('.yakit-input-control-clear-icon')).toBeNull();
  });

  it('formats its count with the configured strategy and value metadata', () => {
    const formatter = vi.fn(
      ({ count, maxLength, value }: { count: number; maxLength?: number; value: string }) =>
        `${value}:${count}/${maxLength}`,
    );
    const { container } = render(
      <Input.TextArea
        count={{ strategy: (value) => Array.from(value).length }}
        defaultValue="A中"
        maxLength={4}
        showCount={{ formatter }}
      />,
    );

    expect(container.querySelector('.yakit-input-control-show-count-suffix')?.textContent).toBe(
      'A中:2/4',
    );
    expect(formatter).toHaveBeenCalledWith({ count: 2, maxLength: 4, value: 'A中' });
  });

  it('exposes its native textarea through the public ref', () => {
    const ref = createRef<TextAreaRef>();
    const { container } = render(<Input.TextArea ref={ref} />);
    const textarea = container.querySelector('textarea');

    expect(ref.current?.nativeElement).toBe(textarea);
    expect(ref.current?.resizableTextArea.textArea).toBe(textarea);
    ref.current?.focus();
    expect(document.activeElement).toBe(textarea);
    ref.current?.blur();
    expect(document.activeElement).not.toBe(textarea);
  });

  it('honors explicit aria-invalid and applies semantic textarea wrapper slots', () => {
    const classNames = vi.fn(() => ({
      clear: 'textarea-clear-slot',
      count: 'textarea-count-slot',
      root: 'textarea-root-slot',
      textarea: 'textarea-field-slot',
    }));
    const styles = vi.fn(() => ({
      clear: { color: 'rgb(4, 5, 6)' },
      count: { fontWeight: 700 },
      root: { borderWidth: 3 },
      textarea: { letterSpacing: 2 },
    }));
    const { container } = render(
      <Input.TextArea
        allowClear
        aria-invalid="false"
        classNames={classNames}
        defaultValue="value"
        error
        showCount
        styles={styles}
      />,
    );
    const textarea = container.querySelector('textarea');

    expect(classNames).toHaveBeenLastCalledWith({
      disabled: false,
      focused: false,
      value: 'value',
    });
    expect(styles).toHaveBeenLastCalledWith({ disabled: false, focused: false, value: 'value' });
    expect(container.querySelector('.textarea-root-slot')).not.toBeNull();
    expect(textarea).toHaveClass('textarea-field-slot');
    expect(textarea).toHaveAttribute('aria-invalid', 'false');
    expect(container.querySelector('.textarea-clear-slot')?.getAttribute('style')).toContain(
      'color',
    );
    expect(container.querySelector('.textarea-count-slot')?.getAttribute('style')).toContain(
      'font-weight',
    );
  });
});

describe('Input.Password behavior', () => {
  it('toggles exactly once through native keyboard activation and preserves focus and caret', async () => {
    const onVisibleChange = vi.fn();
    const { container } = render(
      <Input.Password defaultValue="secret" visibilityToggle={{ onVisibleChange, tabIndex: 3 }} />,
    );
    const input = container.querySelector('input');
    const toggle = container.querySelector<HTMLButtonElement>('.yakit-input-password-toggle');

    if (!input || !toggle) throw new Error('expected password input and visibility control');
    expect(input.type).toBe('password');
    expect(toggle.tabIndex).toBe(3);
    input.focus();
    input.setSelectionRange(1, 4);
    toggle.focus();

    await userEvent.keyboard('{Enter}');

    expect(input.type).toBe('text');
    expect(onVisibleChange).toHaveBeenCalledTimes(1);
    expect(onVisibleChange).toHaveBeenLastCalledWith(true);
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(4);

    toggle.focus();
    await userEvent.keyboard('{Space}');
    expect(input.type).toBe('password');
    expect(onVisibleChange).toHaveBeenCalledTimes(2);
    expect(onVisibleChange).toHaveBeenLastCalledWith(false);
  });

  it('removes the visibility control from tab order when disabled', () => {
    const { container } = render(<Input.Password disabled />);

    expect(container.querySelector<HTMLElement>('.yakit-input-password-toggle')?.tabIndex).toBe(-1);
  });

  it('does not submit its owning form when toggling visibility', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = render(
      <form onSubmit={onSubmit}>
        <Input.Password defaultValue="secret" />
      </form>,
    );
    const toggle = container.querySelector<HTMLButtonElement>('.yakit-input-password-toggle');

    expect(toggle?.type).toBe('button');
    flushSync(() => toggle?.click());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('keeps a disabled visibility control inert', () => {
    const onVisibleChange = vi.fn();
    const { container } = render(
      <Input.Password disabled visibilityToggle={{ onVisibleChange }} />,
    );
    const toggle = container.querySelector<HTMLButtonElement>('.yakit-input-password-toggle');

    toggle?.click();
    expect(toggle).toBeDisabled();
    expect(container.querySelector('input')?.type).toBe('password');
    expect(onVisibleChange).not.toHaveBeenCalled();
  });

  it('updates its accessible visibility label while preserving input aria attributes', () => {
    const { container } = render(
      <Input.Password aria-describedby="password-help" aria-label="Account password" />,
    );
    const input = container.querySelector('input');
    const toggle = container.querySelector<HTMLButtonElement>('.yakit-input-password-toggle');

    expect(toggle).toHaveAttribute('aria-label', '显示密码');
    expect(input).toHaveAttribute('aria-label', 'Account password');
    expect(input).toHaveAttribute('aria-describedby', 'password-help');
    flushSync(() => toggle?.click());
    expect(toggle).toHaveAttribute('aria-label', '隐藏密码');
    expect(input).toHaveAttribute('aria-label', 'Account password');
    expect(input).toHaveAttribute('aria-describedby', 'password-help');
  });

  it('keeps controlled visibility authoritative and reports the requested next state', () => {
    const onVisibleChange = vi.fn();
    const { container, root } = render(
      <Input.Password
        defaultValue="secret"
        visibilityToggle={{ onVisibleChange, visible: false }}
      />,
    );
    const toggle = container.querySelector<HTMLButtonElement>('.yakit-input-password-toggle');
    if (!toggle) throw new Error('expected a password visibility control');

    flushSync(() => toggle.click());
    expect(container.querySelector('input')?.type).toBe('password');
    expect(onVisibleChange).toHaveBeenCalledWith(true);

    flushSync(() =>
      root.render(
        <Input.Password
          defaultValue="secret"
          visibilityToggle={{ onVisibleChange, visible: true }}
        />,
      ),
    );
    expect(container.querySelector('input')?.type).toBe('text');
  });

  it('supports hiding the control and renders custom icons with the visible state', () => {
    const iconRender = vi.fn((visible: boolean) => (visible ? 'shown' : 'hidden'));
    const hiddenControl = render(<Input.Password visibilityToggle={false} />);
    const custom = render(<Input.Password iconRender={iconRender} />);
    const toggle = custom.container.querySelector<HTMLButtonElement>(
      '.yakit-input-password-toggle',
    );

    expect(hiddenControl.container.querySelector('.yakit-input-password-toggle')).toBeNull();
    expect(toggle?.textContent).toBe('hidden');
    expect(iconRender).toHaveBeenLastCalledWith(false);
    flushSync(() => toggle?.click());
    expect(toggle?.textContent).toBe('shown');
    expect(iconRender).toHaveBeenLastCalledWith(true);
  });
});

describe('Input.Select behavior', () => {
  it('is a non-submitting native button with label and decorative chevron slots', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const { container } = render(
      <form onSubmit={onSubmit}>
        <Input.Select>Scope</Input.Select>
      </form>,
    );
    const select = container.querySelector<HTMLButtonElement>('.yakit-input-select');

    expect(select?.type).toBe('button');
    expect(select?.querySelector('.yakit-input-select-label')?.textContent).toBe('Scope');
    expect(select?.querySelector('img')).toHaveAttribute('alt', '');
    flushSync(() => select?.click());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('forwards button props and ref while preserving the fixed class', () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    const { container } = render(
      <Input.Select
        aria-label="Choose scope"
        className="consumer-select"
        data-owner="search"
        onClick={onClick}
        ref={ref}
      >
        Scope
      </Input.Select>,
    );

    expect(ref.current).toBe(container.querySelector('button'));
    expect(ref.current).toHaveClass('yakit-input-select', 'consumer-select');
    expect(ref.current).toHaveAttribute('aria-label', 'Choose scope');
    expect(ref.current).toHaveAttribute('data-owner', 'search');
    ref.current?.click();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is inert while disabled and composes without nested buttons in an Input affix', () => {
    const onClick = vi.fn();
    const disabled = render(
      <Input.Select disabled onClick={onClick}>
        Scope
      </Input.Select>,
    );
    const composed = render(<Input prefix={<Input.Select>Scope</Input.Select>} />);

    disabled.container.querySelector<HTMLButtonElement>('button')?.click();
    expect(onClick).not.toHaveBeenCalled();
    expect(composed.container.querySelector('button button')).toBeNull();
    expect(composed.container.querySelector('.yakit-input-control-prefix > button')).not.toBeNull();
  });
});

describe('Input.OTP behavior', () => {
  it('renders six slots by default', () => {
    const { container } = render(<Input.OTP />);

    expect(container.querySelectorAll('input')).toHaveLength(6);
  });

  it('emits partial slot values through onInput', () => {
    const onInput = vi.fn();
    const { container } = render(<Input.OTP length={3} onInput={onInput} />);
    const first = container.querySelector('input');

    if (!first) throw new Error('expected OTP slots');
    setNativeInputValue(first, '1');

    expect(onInput).toHaveBeenLastCalledWith(['1']);
  });

  it('emits onChange only after every OTP slot is complete', () => {
    const onChange = vi.fn();
    const { container } = render(<Input.OTP length={3} onChange={onChange} />);
    const slots = Array.from(container.querySelectorAll('input'));

    slots.forEach((slot, index) => setNativeInputValue(slot, String(index + 1)));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('123');
  });

  it('automatically advances focus after a single-character input', () => {
    const { container } = render(<Input.OTP length={3} />);
    const slots = Array.from(container.querySelectorAll('input'));

    slots[0].focus();
    flushSync(() => setNativeInputValue(slots[0], '1'));
    expect(document.activeElement).toBe(slots[1]);
  });

  it('forwards OTP separator, mask, and autocomplete semantics', () => {
    const { container } = render(
      <Input.OTP autoComplete="one-time-code" defaultValue="12" length={2} mask separator="-" />,
    );
    const slots = Array.from(container.querySelectorAll('input'));

    expect(container.textContent).toContain('-');
    expect(slots.every((slot) => slot.autocomplete === 'one-time-code')).toBe(true);
    expect(slots.every((slot) => slot.type === 'password')).toBe(true);
  });

  it('supports OTP backspace navigation without collapsing partial slots', () => {
    const onInput = vi.fn();
    const { container } = render(<Input.OTP length={3} onInput={onInput} />);
    const slots = Array.from(container.querySelectorAll('input'));

    setNativeInputValue(slots[0], '1');
    setNativeInputValue(slots[1], '2');
    flushSync(() =>
      slots[1].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Backspace' })),
    );

    expect(slots[0].value).toBe('1');
    expect(slots[1].value).toBe('');
    expect(document.activeElement).toBe(slots[1]);
    expect(onInput).toHaveBeenLastCalledWith(['1']);
  });

  it('moves backward and clears the previous slot when Backspace starts on an empty slot', () => {
    const onInput = vi.fn();
    const { container } = render(<Input.OTP defaultValue="1" length={3} onInput={onInput} />);
    const slots = Array.from(container.querySelectorAll('input'));

    slots[1].focus();
    flushSync(() =>
      slots[1].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Backspace' })),
    );
    expect(document.activeElement).toBe(slots[0]);
    expect(slots.map((slot) => slot.value)).toEqual(['', '', '']);
    expect(onInput).toHaveBeenLastCalledWith([]);
  });

  it('renders separator callbacks and forwards inputMode to every slot', () => {
    const separator = vi.fn((index: number) => <span data-separator={index}>/{index}/</span>);
    const { container } = render(
      <Input.OTP inputMode="numeric" length={3} separator={separator} />,
    );
    const slots = Array.from(container.querySelectorAll('input'));

    expect(separator.mock.calls.map(([index]) => index)).toEqual([0, 1]);
    expect(container.querySelector('[data-separator="0"]')?.textContent).toBe('/0/');
    expect(container.querySelector('[data-separator="1"]')?.textContent).toBe('/1/');
    expect(slots.every((slot) => slot.inputMode === 'numeric')).toBe(true);
  });

  it('distributes an OTP paste from the active slot and truncates overflow', () => {
    const onChange = vi.fn();
    const { container } = render(<Input.OTP length={4} onChange={onChange} />);
    const first = container.querySelector('input');

    if (!first) throw new Error('expected OTP slots');
    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', {
      value: { getData: () => '12345' },
    });
    flushSync(() => first.dispatchEvent(paste));

    expect(Array.from(container.querySelectorAll('input')).map((slot) => slot.value)).toEqual([
      '1',
      '2',
      '3',
      '4',
    ]);
    expect(onChange).toHaveBeenCalledWith('1234');
  });

  it('resets uncontrolled OTP slots and exposes invalid state on every slot', () => {
    const { container } = render(
      <form>
        <Input.OTP defaultValue="12" length={2} name="code" status="error" />
      </form>,
    );
    const form = container.querySelector('form');
    const slots = Array.from(container.querySelectorAll('input'));
    if (!form) throw new Error('expected an OTP form');

    flushSync(() => setNativeInputValue(slots[0], '9'));
    flushSync(() => form.reset());
    expect(slots.map((slot) => slot.value)).toEqual(['1', '2']);
    expect(slots.every((slot) => slot.getAttribute('aria-invalid') === 'true')).toBe(true);
  });

  it('keeps controlled slot values authoritative across input and parent updates', () => {
    const onInput = vi.fn();
    const { container, root } = render(<Input.OTP length={3} onInput={onInput} value="123" />);
    const slots = Array.from(container.querySelectorAll('input'));

    flushSync(() => setNativeInputValue(slots[0], '9'));
    expect(onInput).toHaveBeenLastCalledWith(['9', '2', '3']);
    expect(slots.map((slot) => slot.value)).toEqual(['1', '2', '3']);

    flushSync(() => root.render(<Input.OTP length={3} onInput={onInput} value="456" />));
    expect(slots.map((slot) => slot.value)).toEqual(['4', '5', '6']);
  });

  it('applies its formatter before distributing controlled and pasted values', () => {
    const formatter = vi.fn((value: string) => value.replace(/\D/g, ''));
    const onChange = vi.fn();
    const { container } = render(
      <Input.OTP formatter={formatter} length={4} onChange={onChange} value="1-2" />,
    );
    const slots = Array.from(container.querySelectorAll('input'));
    expect(slots.map((slot) => slot.value)).toEqual(['1', '2', '', '']);

    const paste = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(paste, 'clipboardData', { value: { getData: () => '3-4-5-6' } });
    flushSync(() => slots[0].dispatchEvent(paste));
    expect(onChange).toHaveBeenCalledWith('3456');
    expect(formatter).toHaveBeenCalledWith('3-4-5-6');
  });

  it('navigates OTP slots with arrows, Home, and End without crossing boundaries', () => {
    const { container } = render(<Input.OTP length={3} />);
    const slots = Array.from(container.querySelectorAll('input'));
    const press = (slot: HTMLInputElement, key: string) =>
      slot.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }));

    slots[1].focus();
    press(slots[1], 'ArrowLeft');
    expect(document.activeElement).toBe(slots[0]);
    press(slots[0], 'ArrowLeft');
    expect(document.activeElement).toBe(slots[0]);
    press(slots[0], 'ArrowRight');
    expect(document.activeElement).toBe(slots[1]);
    press(slots[1], 'End');
    expect(document.activeElement).toBe(slots[2]);
    press(slots[2], 'ArrowRight');
    expect(document.activeElement).toBe(slots[2]);
    press(slots[2], 'Home');
    expect(document.activeElement).toBe(slots[0]);
  });

  it('exposes bounded focus, blur, and nativeElement through the OTP ref', () => {
    const ref = createRef<OTPRef>();
    const { container } = render(<Input.OTP length={3} ref={ref} />);
    const slots = Array.from(container.querySelectorAll('input'));

    expect(ref.current?.nativeElement).toBe(container.querySelector('.yakit-input-otp'));
    ref.current?.focus(99);
    expect(document.activeElement).toBe(slots[2]);
    ref.current?.focus(-1);
    expect(document.activeElement).toBe(slots[0]);
    ref.current?.blur();
    expect(document.activeElement).not.toBe(slots[0]);
  });

  it('defers OTP input while composing and distributes the composition result once', () => {
    const onInput = vi.fn();
    const { container } = render(<Input.OTP length={3} onInput={onInput} />);
    const first = container.querySelector('input');
    if (!first) throw new Error('expected OTP slots');

    first.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    flushSync(() => setNativeInputValue(first, '中'));
    expect(onInput).not.toHaveBeenCalled();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(first, '中');
    flushSync(() =>
      first.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '中' })),
    );
    expect(onInput).toHaveBeenCalledOnce();
    expect(onInput).toHaveBeenCalledWith(['中']);
  });

  it('applies semantic class and style callbacks to root, inputs, and separators', () => {
    const classNames = vi.fn(() => ({
      input: 'otp-input-slot',
      root: 'otp-root-slot',
      separator: 'otp-separator-slot',
    }));
    const styles = vi.fn(() => ({
      input: { color: 'rgb(1, 2, 3)' },
      root: { gap: 4 },
      separator: { opacity: 0.5 },
    }));
    const { container } = render(
      <Input.OTP
        classNames={classNames}
        disabled
        length={2}
        separator="-"
        styles={styles}
        value="12"
      />,
    );

    expect(classNames).toHaveBeenLastCalledWith({ disabled: true, value: '12' });
    expect(styles).toHaveBeenLastCalledWith({ disabled: true, value: '12' });
    expect(container.querySelector('.otp-root-slot')).not.toBeNull();
    expect(container.querySelectorAll('.otp-input-slot')).toHaveLength(2);
    expect(container.querySelector('.otp-input-slot')?.getAttribute('style')).toContain('color');
    expect(container.querySelector('.otp-separator-slot')?.getAttribute('style')).toContain(
      'opacity',
    );
  });

  it('forwards readOnly and explicit aria-invalid semantics to every OTP slot', () => {
    const { container } = render(
      <Input.OTP aria-invalid="false" length={2} readOnly status="error" />,
    );
    const slots = Array.from(container.querySelectorAll('input'));

    expect(slots.every((slot) => slot.readOnly)).toBe(true);
    expect(slots.every((slot) => slot.getAttribute('aria-invalid') === 'false')).toBe(true);
  });

  it('applies disabled and legacy error state to every OTP slot', () => {
    const { container } = render(<Input.OTP disabled error length={3} />);
    const slots = Array.from(container.querySelectorAll('input'));

    expect(container.querySelector('.yakit-input-error')).not.toBeNull();
    expect(slots.every((slot) => slot.disabled)).toBe(true);
    expect(slots.every((slot) => slot.getAttribute('aria-invalid') === 'true')).toBe(true);
  });

  it('applies object semantic classes and styles to OTP slots', () => {
    const { container } = render(
      <Input.OTP
        classNames={{
          input: 'otp-object-input',
          root: 'otp-object-root',
          separator: 'otp-object-separator',
        }}
        length={2}
        separator="-"
        styles={{
          input: { letterSpacing: 1 },
          root: { gap: 2 },
          separator: { opacity: 0.4 },
        }}
      />,
    );

    expect(container.querySelector('.otp-object-root')?.getAttribute('style')).toContain('gap');
    expect(container.querySelectorAll('.otp-object-input')).toHaveLength(2);
    expect(container.querySelector('.otp-object-input')?.getAttribute('style')).toContain(
      'letter-spacing',
    );
    expect(container.querySelector('.otp-object-separator')?.getAttribute('style')).toContain(
      'opacity',
    );
  });
});

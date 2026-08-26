import { userEvent } from '@vitest/browser/context';
import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Input, { type InputRef } from '../../src/components/Input';
import { cleanup, render, setNativeInputValue } from '../helpers/render';

afterEach(cleanup);

describe('Input behavior', () => {
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

  it('maps error status to native invalid state and keeps clear keyboard-accessible', () => {
    const { container } = render(<Input allowClear defaultValue="value" error />);

    expect(container.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(
      container.querySelector<HTMLButtonElement>('.yakit-input-control-clear-icon')?.tabIndex,
    ).toBe(0);
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
});

describe('Input.OTP behavior', () => {
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
});

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

  it('forwards disabled and readOnly states to the textarea', () => {
    const { container } = render(<Input.TextArea disabled readOnly />);
    const textarea = container.querySelector('textarea');

    expect(textarea?.disabled).toBe(true);
    expect(textarea?.readOnly).toBe(true);
  });
});

describe('Input.Password behavior', () => {
  it('toggles password visibility from the keyboard-accessible control', () => {
    const onVisibleChange = vi.fn();
    const { container } = render(
      <Input.Password defaultValue="secret" visibilityToggle={{ onVisibleChange, tabIndex: 3 }} />,
    );
    const input = container.querySelector('input');
    const toggle = container.querySelector<HTMLElement>('[role="button"]');

    if (!input || !toggle) throw new Error('expected password input and visibility control');
    expect(input.type).toBe('password');
    expect(toggle.tabIndex).toBe(3);

    flushSync(() =>
      toggle.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );

    expect(input.type).toBe('text');
    expect(onVisibleChange).toHaveBeenCalledWith(true);
  });

  it('removes the visibility control from tab order when disabled', () => {
    const { container } = render(<Input.Password disabled />);

    expect(container.querySelector<HTMLElement>('[role="button"]')?.tabIndex).toBe(-1);
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
});

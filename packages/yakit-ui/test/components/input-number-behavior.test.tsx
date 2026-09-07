import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfigProvider from '../../src/components/ConfigProvider';
import InputNumber, { type InputNumberRef } from '../../src/components/InputNumber';
import { cleanup, render, setNativeInputValue } from '../helpers/render';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const getSpinbutton = (container: HTMLElement) => {
  const input = container.querySelector<HTMLInputElement>('[role="spinbutton"]');
  if (!input) throw new Error('expected an InputNumber spinbutton');
  return input;
};

describe('InputNumber numeric behavior', () => {
  it('uses a native text input and preserves intermediate decimal edit states until commit', () => {
    const onChange = vi.fn();
    const { container } = render(<InputNumber onChange={onChange} />);
    const input = getSpinbutton(container);

    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('decimal');

    for (const intermediate of ['-', '+', '.', '1.', '1.00', '-0.']) {
      setNativeInputValue(input, intermediate);
      expect(input.value).toBe(intermediate);
      expect(onChange).not.toHaveBeenCalled();
    }
  });

  it('clamps a user keyboard step to max', () => {
    const onChange = vi.fn();
    const { container } = render(
      <InputNumber defaultValue={8} max={10} onChange={onChange} step={5} />,
    );
    const input = getSpinbutton(container);

    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' })),
    );

    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(input.value).toBe('10');
  });

  it('uses a ten-times step and reports keyboard metadata for Shift+ArrowUp', () => {
    const onStep = vi.fn();
    const { container } = render(<InputNumber defaultValue={1} onStep={onStep} step={2} />);

    getSpinbutton(container).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp', shiftKey: true }),
    );

    expect(onStep).toHaveBeenCalledWith(21, {
      emitter: 'keyboard',
      offset: '20',
      type: 'up',
    });
  });

  it('uses a one-tenth step for Ctrl+ArrowDown without floating-point drift', () => {
    const onStep = vi.fn();
    const { container } = render(
      <InputNumber defaultValue="1.01" onStep={onStep} step="0.1" stringMode />,
    );

    getSpinbutton(container).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, ctrlKey: true, key: 'ArrowDown' }),
    );

    expect(onStep).toHaveBeenCalledWith('1.00', {
      emitter: 'keyboard',
      offset: '0.01',
      type: 'down',
    });
  });

  it('does not step from the keyboard when keyboard is false', () => {
    const onChange = vi.fn();
    const { container } = render(
      <InputNumber defaultValue={2} keyboard={false} onChange={onChange} />,
    );

    getSpinbutton(container).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }),
    );

    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps readOnly values unchanged when a step control is pressed', () => {
    const onChange = vi.fn();
    const { container } = render(
      <InputNumber controls="horizontal" defaultValue={2} onChange={onChange} readOnly />,
    );
    const increase = container.querySelector<HTMLElement>('[aria-label="Increase Value"]');

    increase?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));

    expect(onChange).not.toHaveBeenCalled();
    expect(getSpinbutton(container).value).toBe('2');
  });

  it('parses edited display text and reapplies its formatter', () => {
    const onChange = vi.fn();
    const { container } = render(
      <InputNumber
        defaultValue={1200}
        formatter={(value) => `$ ${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`}
        onChange={onChange}
        parser={(value) => Number(value?.replace(/\$\s?|,/g, ''))}
      />,
    );
    const input = getSpinbutton(container);

    expect(input.value).toBe('$ 1,200');
    setNativeInputValue(input, '$ 2,500');
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );

    expect(onChange).toHaveBeenLastCalledWith(2500);
    expect(input.value).toBe('$ 2,500');
  });

  it('passes raw input and userTyping state to the formatter without formatting twice', () => {
    const formatter = vi.fn((value, info: { input: string; userTyping: boolean }) =>
      info.userTyping ? `[${info.input}]` : `{${String(value)}}`,
    );
    const parser = vi.fn(
      (value?: string) => value?.replace('[', '').replace(']', '').replace(/[{}]/g, '') ?? '',
    );
    const { container } = render(
      <InputNumber defaultValue={12} formatter={formatter} parser={parser} />,
    );
    const input = getSpinbutton(container);

    expect(input.value).toBe('{12}');
    formatter.mockClear();
    setNativeInputValue(input, '34');
    expect(formatter).toHaveBeenCalledOnce();
    expect(formatter).toHaveBeenCalledWith('34', { input: '34', userTyping: true });
    expect(input.value).toBe('[34]');

    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );
    expect(input.value).toBe('{34}');
    expect(formatter).toHaveBeenLastCalledWith(34, { input: '34', userTyping: false });
  });

  it('rejects Infinity parser output without publishing it', () => {
    const onChange = vi.fn();
    const { container } = render(
      <InputNumber defaultValue={3} onChange={onChange} parser={() => Number.POSITIVE_INFINITY} />,
    );
    const input = getSpinbutton(container);

    setNativeInputValue(input, 'infinity');
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('3');
  });

  it('rounds numberMode values to configured precision', () => {
    const onChange = vi.fn();
    const { container } = render(<InputNumber onChange={onChange} precision={2} />);
    const input = getSpinbutton(container);

    setNativeInputValue(input, '1.235');
    flushSync(() => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    expect(onChange).toHaveBeenLastCalledWith(1.24);
    expect(input.value).toBe('1.24');
  });

  it('uses a one-tenth step for Meta+ArrowUp', () => {
    const onStep = vi.fn();
    const { container } = render(<InputNumber defaultValue={1} onStep={onStep} step="0.2" />);

    getSpinbutton(container).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp', metaKey: true }),
    );

    expect(onStep).toHaveBeenCalledWith(1.02, {
      emitter: 'keyboard',
      offset: '0.02',
      type: 'up',
    });
  });

  it('keeps a controlled value authoritative after Enter validation', () => {
    const onChange = vi.fn();
    const { container } = render(<InputNumber onChange={onChange} value={4} />);
    const input = getSpinbutton(container);

    setNativeInputValue(input, '7');
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );

    expect(onChange).toHaveBeenCalledWith(7);
    expect(input.value).toBe('4');
  });

  it('reflects a controlled parent update after reporting an edited value', () => {
    const onChange = vi.fn();
    const { container, root } = render(<InputNumber onChange={onChange} value={4} />);
    const input = getSpinbutton(container);

    setNativeInputValue(input, '7');
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );
    expect(input.value).toBe('4');

    flushSync(() => root.render(<InputNumber onChange={onChange} value={7} />));
    expect(input.value).toBe('7');
  });

  it('commits exact stringMode decimals on blur without safe-integer coercion', () => {
    const onChange = vi.fn();
    const { container } = render(<InputNumber defaultValue="0" onChange={onChange} stringMode />);
    const input = getSpinbutton(container);

    setNativeInputValue(input, '9007199254740993.0100');
    flushSync(() => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));

    expect(onChange).toHaveBeenLastCalledWith('9007199254740993.0100');
    expect(input.value).toBe('9007199254740993.0100');
  });

  it('applies exact string precision, step, and range clamping', () => {
    const onChange = vi.fn();
    const { container } = render(
      <InputNumber
        defaultValue="9007199254740993.015"
        max="9007199254740993.02"
        onChange={onChange}
        precision={2}
        step="0.01"
        stringMode
      />,
    );

    flushSync(() =>
      getSpinbutton(container).dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }),
      ),
    );

    expect(onChange).toHaveBeenLastCalledWith('9007199254740993.02');
    expect(getSpinbutton(container).value).toBe('9007199254740993.02');
  });

  it('reverts invalid parser output and commits an empty field as null', () => {
    const onInvalidChange = vi.fn();
    const invalid = render(
      <InputNumber defaultValue={3} onChange={onInvalidChange} parser={() => Number.NaN} />,
    );
    const invalidInput = getSpinbutton(invalid.container);

    setNativeInputValue(invalidInput, 'bad');
    flushSync(() =>
      invalidInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );
    expect(onInvalidChange).not.toHaveBeenCalled();
    expect(invalidInput.value).toBe('3');

    const onEmptyChange = vi.fn();
    const empty = render(<InputNumber defaultValue={3} onChange={onEmptyChange} />);
    const emptyInput = getSpinbutton(empty.container);
    setNativeInputValue(emptyInput, '');
    flushSync(() =>
      emptyInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );
    expect(onEmptyChange).toHaveBeenLastCalledWith(null);
    expect(emptyInput.value).toBe('');
  });

  it('does not commit Enter while an IME composition is active', () => {
    const onChange = vi.fn();
    const { container } = render(<InputNumber onChange={onChange} />);
    const input = getSpinbutton(container);

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    setNativeInputValue(input, '12');
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    expect(onChange).not.toHaveBeenCalled();

    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );
    expect(onChange).toHaveBeenLastCalledWith(12);
  });
});

describe('InputNumber controls and native form behavior', () => {
  it('supports hidden and custom controls while preserving Yakit slot classes', () => {
    const hidden = render(<InputNumber controls={false} />);
    expect(hidden.container.querySelector('.yakit-input-number-action')).toBeNull();

    const custom = render(
      <InputNumber controls={{ downIcon: <span>minus</span>, upIcon: <span>plus</span> }} />,
    );
    expect(custom.container.querySelector('.yakit-input-number-slot-actions')?.textContent).toBe(
      'plusminus',
    );
    expect(custom.container.querySelectorAll('.yakit-input-number-action')).toHaveLength(2);
  });

  it('falls back to the default icon when only one custom control icon is supplied', () => {
    const { container } = render(
      <InputNumber controls={{ upIcon: <span data-testid="custom-up">plus</span> }} />,
    );
    const increment = container.querySelector('[aria-label="Increase Value"]');
    const decrement = container.querySelector('[aria-label="Decrease Value"]');

    expect(increment?.querySelector('[data-testid="custom-up"]')?.textContent).toBe('plus');
    expect(decrement?.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('repeats a held control after the delay and stops on mouseup', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<InputNumber defaultValue={0} onChange={onChange} />);
    const increment = container.querySelector<HTMLButtonElement>('[aria-label="Increase Value"]');
    if (!increment) throw new Error('expected an increment action');

    flushSync(() =>
      increment.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 })),
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(1);

    flushSync(() => vi.advanceTimersByTime(499));
    expect(onChange).toHaveBeenCalledTimes(1);
    flushSync(() => vi.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledTimes(1);
    flushSync(() => vi.advanceTimersByTime(150));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(2);

    increment.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    flushSync(() => vi.advanceTimersByTime(600));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('reports handler metadata and does not repeat the mousedown step on click', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const onStep = vi.fn();
    const { container } = render(
      <InputNumber defaultValue={2} onChange={onChange} onStep={onStep} step="0.5" />,
    );
    const increment = container.querySelector<HTMLButtonElement>('[aria-label="Increase Value"]');
    if (!increment) throw new Error('expected an increment action');

    flushSync(() =>
      increment.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 })),
    );
    increment.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    increment.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenCalledWith(2.5, {
      emitter: 'handler',
      offset: '0.5',
      type: 'up',
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not add another step when a held control emits click after mouseup', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<InputNumber defaultValue={0} onChange={onChange} />);
    const increment = container.querySelector<HTMLButtonElement>('[aria-label="Increase Value"]');
    if (!increment) throw new Error('expected an increment action');

    flushSync(() =>
      increment.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 })),
    );
    flushSync(() => vi.advanceTimersByTime(650));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(2);

    increment.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    increment.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not duplicate a pointer step after leaving and re-entering the control', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<InputNumber defaultValue={0} onChange={onChange} />);
    const increment = container.querySelector<HTMLButtonElement>('[aria-label="Increase Value"]');
    if (!increment) throw new Error('expected an increment action');

    flushSync(() =>
      increment.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 })),
    );
    increment.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
    );
    increment.dispatchEvent(
      new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }),
    );
    increment.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    increment.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('steps once for a programmatic control click without a preceding pointer gesture', () => {
    const onChange = vi.fn();
    const { container } = render(<InputNumber defaultValue={0} onChange={onChange} />);
    const increment = container.querySelector<HTMLButtonElement>('[aria-label="Increase Value"]');
    if (!increment) throw new Error('expected an increment action');

    increment.click();

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('does not publish or step again when a handler is already at a boundary', () => {
    const onChange = vi.fn();
    const onStep = vi.fn();
    const { container } = render(
      <InputNumber defaultValue={3} max={3} onChange={onChange} onStep={onStep} />,
    );
    const increment = container.querySelector<HTMLButtonElement>('[aria-label="Increase Value"]');

    expect(increment).toBeDisabled();
    increment?.click();
    expect(onChange).not.toHaveBeenCalled();
    expect(onStep).not.toHaveBeenCalled();
  });

  it('clears held-control timers on mouseleave and unmount', () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const { container } = render(<InputNumber defaultValue={0} onChange={onChange} />);
    const increment = container.querySelector<HTMLButtonElement>('[aria-label="Increase Value"]');
    if (!increment) throw new Error('expected an increment action');

    increment.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
    increment.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
    );
    vi.advanceTimersByTime(1_000);
    expect(onChange).toHaveBeenCalledTimes(1);

    increment.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
    expect(onChange).toHaveBeenCalledTimes(2);
    cleanup();
    vi.advanceTimersByTime(1_000);
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['disabled', 'readOnly'] as const)(
    'does not start held-control timers while %s',
    (state) => {
      vi.useFakeTimers();
      const onChange = vi.fn();
      const props = state === 'disabled' ? { disabled: true } : { readOnly: true };
      const { container } = render(<InputNumber defaultValue={2} onChange={onChange} {...props} />);
      const increment = container.querySelector<HTMLButtonElement>('[aria-label="Increase Value"]');

      increment?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
      vi.advanceTimersByTime(1_000);
      expect(onChange).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it('disables step actions exactly at configured bounds', () => {
    const atMin = render(<InputNumber defaultValue={1} max={3} min={1} />);
    const atMax = render(<InputNumber defaultValue={3} max={3} min={1} />);

    expect(atMin.container.querySelector('[aria-label="Decrease Value"]')).toBeDisabled();
    expect(atMin.container.querySelector('[aria-label="Increase Value"]')).not.toBeDisabled();
    expect(atMax.container.querySelector('[aria-label="Increase Value"]')).toBeDisabled();
    expect(atMax.container.querySelector('[aria-label="Decrease Value"]')).not.toBeDisabled();
  });

  it('serializes its committed value through a native form control', () => {
    const { container } = render(
      <form>
        <InputNumber defaultValue="2.50" name="amount" stringMode />
      </form>,
    );
    const form = container.querySelector('form');
    if (!form) throw new Error('expected a form');

    expect(new FormData(form).get('amount')).toBe('2.50');
  });

  it('restores its uncontrolled default when the owning form resets', () => {
    const { container } = render(
      <form>
        <InputNumber defaultValue={2} name="amount" />
      </form>,
    );
    const form = container.querySelector('form');
    const input = getSpinbutton(container);
    if (!form) throw new Error('expected a form');

    setNativeInputValue(input, '5');
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );
    expect(input.value).toBe('5');

    flushSync(() => form.reset());
    expect(input.value).toBe('2');
  });

  it('keeps a controlled value authoritative when its owning form resets', () => {
    const onChange = vi.fn();
    const { container } = render(
      <form>
        <InputNumber name="amount" onChange={onChange} value={2} />
      </form>,
    );
    const form = container.querySelector('form');
    const input = getSpinbutton(container);
    if (!form) throw new Error('expected a form');

    setNativeInputValue(input, '5');
    flushSync(() =>
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })),
    );
    expect(onChange).toHaveBeenCalledWith(5);
    expect(input.value).toBe('2');

    flushSync(() => form.reset());
    expect(input.value).toBe('2');
    expect(onChange).toHaveBeenCalledOnce();
  });
});

describe('InputNumber accessibility and ref behavior', () => {
  it('renders stable Yakit classes without injecting runtime styles or hash classes', () => {
    const styleCount = document.head.querySelectorAll('style').length;
    const { container } = render(<InputNumber className="consumer-root" />);
    const root = container.querySelector('.yakit-input-number');

    expect(document.head.querySelectorAll('style')).toHaveLength(styleCount);
    expect(root?.classList.contains('consumer-root')).toBe(true);
    expect(Array.from(root?.classList ?? []).some((name) => name.includes('css-dev-only'))).toBe(
      false,
    );
  });

  it('exposes spinbutton range and current-value ARIA metadata', () => {
    const { container } = render(<InputNumber defaultValue={4} max={10} min={1} />);
    const input = getSpinbutton(container);

    expect(input.getAttribute('aria-valuemin')).toBe('1');
    expect(input.getAttribute('aria-valuemax')).toBe('10');
    expect(input.getAttribute('aria-valuenow')).toBe('4');
    expect(input.getAttribute('aria-valuetext')).toBe('4');
  });

  it('uses the formatted display as aria-valuetext unless explicitly overridden', () => {
    const formatted = render(
      <InputNumber defaultValue={12} formatter={(value) => `$${String(value)}`} />,
    );
    const explicit = render(<InputNumber aria-valuetext="twelve" defaultValue={12} />);

    expect(getSpinbutton(formatted.container)).toHaveAttribute('aria-valuetext', '$12');
    expect(getSpinbutton(explicit.container)).toHaveAttribute('aria-valuetext', 'twelve');
  });

  it('exposes error status through the Yakit root and native invalid state', () => {
    const { container } = render(<InputNumber error />);

    expect(container.querySelector('.yakit-input-number-error')).not.toBeNull();
    expect(getSpinbutton(container).getAttribute('aria-invalid')).toBe('true');
  });

  it('lets explicit aria-invalid override error status and omits aria-valuenow when empty', () => {
    const explicit = render(<InputNumber aria-invalid="false" error />);
    const empty = render(<InputNumber value={null} />);

    expect(getSpinbutton(explicit.container)).toHaveAttribute('aria-invalid', 'false');
    expect(getSpinbutton(empty.container)).not.toHaveAttribute('aria-valuenow');
    expect(getSpinbutton(empty.container)).not.toHaveAttribute('aria-valuetext');
  });

  it('provides readable labels for both numeric actions', () => {
    const { container } = render(<InputNumber />);

    expect(container.querySelector('[aria-label="Increase Value"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Decrease Value"]')).not.toBeNull();
  });

  it('removes actions from tab order and disables them for readOnly input', () => {
    const { container } = render(<InputNumber defaultValue={2} readOnly />);
    const actions = [
      ...container.querySelectorAll<HTMLButtonElement>('.yakit-input-number-action'),
    ];

    expect(actions).toHaveLength(2);
    expect(actions.every((action) => action.tabIndex === -1)).toBe(true);
    expect(actions.every((action) => action.disabled)).toBe(true);
  });

  it('keeps default action labels stable through a no-op provider', () => {
    const bare = render(<InputNumber />).container;
    const provided = render(
      <ConfigProvider>
        <InputNumber />
      </ConfigProvider>,
    ).container;

    const labels = (container: HTMLElement) =>
      [...container.querySelectorAll('.yakit-input-number-action')].map((action) =>
        action.getAttribute('aria-label'),
      );
    expect(labels(provided)).toEqual(labels(bare));
  });

  it('forwards disabled state to the spinbutton and prevents changes', () => {
    const onChange = vi.fn();
    const { container } = render(<InputNumber defaultValue={2} disabled onChange={onChange} />);
    const input = getSpinbutton(container);

    expect(input.disabled).toBe(true);
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('exposes focus, blur, and nativeElement through the public ref', () => {
    const ref = createRef<InputNumberRef>();
    const { container } = render(<InputNumber defaultValue={123} ref={ref} />);
    const input = getSpinbutton(container);

    const focus = vi.spyOn(input, 'focus');
    ref.current?.focus({ cursor: 'start', preventScroll: true });
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(0);

    ref.current?.focus({ cursor: 'end' });
    expect(input.selectionStart).toBe(3);
    expect(input.selectionEnd).toBe(3);

    ref.current?.focus({ cursor: 'all' });
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(3);
    expect(ref.current?.nativeElement).toBe(container.querySelector('.yakit-input-number'));

    ref.current?.blur();
    expect(document.activeElement).not.toBe(input);
  });

  it('inherits native provider size, disabled, direction, locale, mode, and token variables', () => {
    const { container } = render(
      <ConfigProvider
        componentDisabled
        componentSize="small"
        direction="rtl"
        locale={{
          locale: 'test',
          InputNumber: { decrement: 'minus localized', increment: 'plus localized' },
        }}
        theme={{ mode: 'dark', token: { colorPrimary: '#123456' } }}
      >
        <InputNumber />
      </ConfigProvider>,
    );
    const root = container.querySelector<HTMLElement>('.yakit-input-number');

    expect(root?.classList.contains('yakit-input-number-small')).toBe(true);
    expect(root?.getAttribute('dir')).toBe('rtl');
    expect(root?.dataset.theme).toBe('dark');
    expect(root?.style.getPropertyValue('--yakit-color-primary')).toBe('#123456');
    expect(getSpinbutton(container).disabled).toBe(true);
    expect(container.querySelector('[aria-label="plus localized"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="minus localized"]')).not.toBeNull();
  });

  it('lets explicit size and disabled props override provider defaults', () => {
    const { container } = render(
      <ConfigProvider componentDisabled componentSize="small">
        <InputNumber disabled={false} size="large" />
      </ConfigProvider>,
    );

    expect(container.querySelector('.yakit-input-number-large')).not.toBeNull();
    expect(getSpinbutton(container)).not.toBeDisabled();
    expect(container.querySelector('[aria-label="Increase Value"]')).not.toBeDisabled();
  });
});

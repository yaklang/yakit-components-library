import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfigProvider from '../../src/components/ConfigProvider';
import InputNumber, { type InputNumberRef } from '../../src/components/InputNumber';
import { cleanup, render, setNativeInputValue } from '../helpers/render';

afterEach(cleanup);

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

    for (const intermediate of ['-', '+', '.', '1.', '-0.']) {
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
  });

  it('exposes error status through the Yakit root and native invalid state', () => {
    const { container } = render(<InputNumber error />);

    expect(container.querySelector('.yakit-input-number-error')).not.toBeNull();
    expect(getSpinbutton(container).getAttribute('aria-invalid')).toBe('true');
  });

  it('provides readable labels for both numeric actions', () => {
    const { container } = render(<InputNumber />);

    expect(container.querySelector('[aria-label="Increase Value"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Decrease Value"]')).not.toBeNull();
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

    ref.current?.focus({ cursor: 'all' });
    expect(document.activeElement).toBe(input);
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
});

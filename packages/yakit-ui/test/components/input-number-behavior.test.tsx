import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import InputNumber, { type InputNumberRef } from '../../src/components/InputNumber';
import { cleanup, render, setNativeInputValue } from '../helpers/render';

afterEach(cleanup);

const getSpinbutton = (container: HTMLElement) => {
  const input = container.querySelector<HTMLInputElement>('[role="spinbutton"]');
  if (!input) throw new Error('expected an InputNumber spinbutton');
  return input;
};

describe('InputNumber numeric behavior', () => {
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
});

describe('InputNumber accessibility and ref behavior', () => {
  it('exposes spinbutton range and current-value ARIA metadata', () => {
    const { container } = render(<InputNumber defaultValue={4} max={10} min={1} />);
    const input = getSpinbutton(container);

    expect(input.getAttribute('aria-valuemin')).toBe('1');
    expect(input.getAttribute('aria-valuemax')).toBe('10');
    expect(input.getAttribute('aria-valuenow')).toBe('4');
  });

  it('provides readable labels for both numeric actions', () => {
    const { container } = render(<InputNumber />);

    expect(container.querySelector('[aria-label="Increase Value"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Decrease Value"]')).not.toBeNull();
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
    const { container } = render(<InputNumber ref={ref} />);
    const input = getSpinbutton(container);

    ref.current?.focus();
    expect(document.activeElement).toBe(input);
    expect(ref.current?.nativeElement).toBe(container.querySelector('.yakit-input-number'));

    ref.current?.blur();
    expect(document.activeElement).not.toBe(input);
  });
});

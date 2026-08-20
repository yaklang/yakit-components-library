import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Input from '../../src/components/Input';
import InputNumber from '../../src/components/InputNumber';

const roots: Root[] = [];

const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  flushSync(() => root.render(node));
  return container;
};

const setNativeInputValue = (input: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.replaceChildren();
});

describe('Input public composition', () => {
  it('exposes only the declared compound siblings', () => {
    expect(Input.TextArea).toBeTypeOf('object');
    expect(Input.Search).toBeTypeOf('object');
    expect(Input.Password).toBeTypeOf('object');
    expect(Input.OTP).toBeTypeOf('object');
    expect(Input.SearchTrigger).toBeTypeOf('object');
    expect(Input.Select).toBeTypeOf('object');
    expect('Number' in Input).toBe(false);
    expect('Group' in Input).toBe(false);
  });

  it('maps the legacy error alias only when status is absent', () => {
    const errorOnly = render(<Input error />).querySelector('.yakit-input-control-status-error');
    const statusWins = render(<Input error status="warning" />);

    expect(errorOnly).not.toBeNull();
    expect(statusWins.querySelector('.yakit-input-control-status-warning')).not.toBeNull();
    expect(statusWins.querySelector('.yakit-input-control-status-error')).toBeNull();
  });

  it('provides a labelled, focusable dropdown segment through prefix or suffix composition', () => {
    const container = render(
      <Input
        prefix={<Input.Select aria-label="协议">https://</Input.Select>}
        suffix={<Input.Select aria-label="币种">USD</Input.Select>}
      />,
    );
    const selectors = container.querySelectorAll<HTMLButtonElement>('.yakit-input-select');

    expect(selectors).toHaveLength(2);
    expect(selectors[0].getAttribute('aria-label')).toBe('协议');
    expect(selectors[1].getAttribute('aria-label')).toBe('币种');
  });

  it('matches the supplied Figma sizes and light-theme field tokens', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    const small = render(<Input size="small" />).querySelector('input');
    const medium = render(<Input size="medium" />).querySelector('input');
    const large = render(<Input size="large" />).querySelector('input');
    const error = render(<Input error />).querySelector('input');
    const disabled = render(<Input disabled />).querySelector('input');
    const search = render(<Input.Search size="huge" />).querySelector('.yakit-search-input');

    if (!small || !medium || !large || !error || !disabled || !search) {
      throw new Error('expected Input and Search controls');
    }

    expect(getComputedStyle(small).height).toBe('24px');
    expect(getComputedStyle(medium).height).toBe('28px');
    expect(getComputedStyle(large).height).toBe('32px');
    expect(getComputedStyle(large).borderTopColor).toBe('rgb(230, 232, 237)');
    expect(getComputedStyle(error).borderTopColor).toBe('rgb(248, 171, 171)');
    expect(getComputedStyle(disabled).backgroundColor).toBe('rgb(238, 240, 243)');
    expect(getComputedStyle(search).height).toBe('32px');
  });

  it('keeps InputNumber standalone and makes huge horizontal controls visible', () => {
    const container = render(<InputNumber controls="horizontal" defaultValue={1} size="huge" />);

    expect(container.querySelector('.yakit-input-number-mode-spinner')).not.toBeNull();
    expect(container.querySelectorAll('.yakit-input-number-action')).toHaveLength(2);
  });

  it('keeps editable Search selector changes separate from onSearch', () => {
    const onSearch = vi.fn();
    const onSelectorChange = vi.fn();
    const container = render(
      <Input.Search
        onSearch={onSearch}
        selector={{
          onChange: onSelectorChange,
          options: [
            { label: '关键词', value: 'keyword' },
            { label: '标题', value: 'title' },
          ],
        }}
        variant="dropdown"
      />,
    );
    const selector = container.querySelector('select');

    if (!selector) throw new Error('expected the dropdown selector');
    selector.value = 'title';
    selector.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onSelectorChange).toHaveBeenCalledTimes(1);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('searches the current value with the Ant Design input source on Enter', () => {
    const onSearch = vi.fn();
    const container = render(<Input.Search onSearch={onSearch} />);
    const input = container.querySelector('input');

    if (!input) throw new Error('expected a search input');
    setNativeInputValue(input, 'needle');
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));

    expect(onSearch).toHaveBeenCalledWith(
      'needle',
      expect.anything(),
      expect.objectContaining({ source: 'input' }),
    );
  });

  it('preserves InputNumber intermediate numeric text without Number coercion', () => {
    const container = render(<InputNumber />);
    const input = container.querySelector('input');

    if (!input) throw new Error('expected a numeric input');
    setNativeInputValue(input, '-');
    expect(input.value).toBe('-');
    setNativeInputValue(input, '1.');
    expect(input.value).toBe('1.');
  });

  it('keeps stringMode precision and applies steps through its standalone controls', () => {
    const onChange = vi.fn();
    const container = render(
      <InputNumber
        controls="horizontal"
        defaultValue="9007199254740993.01"
        onChange={onChange}
        stringMode
      />,
    );
    const increment = container.querySelector('.yakit-input-number-action-up');

    if (!increment) throw new Error('expected an increment control');
    increment.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, buttons: 1 }));
    increment.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(onChange).toHaveBeenLastCalledWith('9007199254740994.01');
  });
});

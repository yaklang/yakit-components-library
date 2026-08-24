import React, { createRef } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Input from '../../src/components/Input';
import SearchInput from '../../src/components/SearchInput';
import { cleanup, render } from '../helpers/render';

afterEach(cleanup);

describe('Input.Search behavior', () => {
  it('reports clear actions with the clear source', () => {
    const onSearch = vi.fn();
    const { container } = render(
      <Input.Search allowClear defaultValue="needle" onSearch={onSearch} />,
    );
    const clear = container.querySelector<HTMLButtonElement>(
      '.yakit-search-input-field-clear-icon',
    );

    if (!clear) throw new Error('expected a search clear button');
    clear.click();

    expect(onSearch).toHaveBeenCalledWith('', expect.anything(), { source: 'clear' });
  });

  it('reports action-button searches with the input source', () => {
    const onSearch = vi.fn();
    const { container } = render(
      <Input.Search defaultValue="needle" enterButton="Go" onSearch={onSearch} />,
    );
    const action = container.querySelector<HTMLButtonElement>('.yakit-search-input-search-btn');

    if (!action) throw new Error('expected a search action');
    action.click();

    expect(onSearch).toHaveBeenCalledWith('needle', expect.anything(), { source: 'input' });
  });

  it('labels the default Figma composition action for assistive technology', () => {
    const { container } = render(<Input.Search variant="main-bg" />);
    const action = container.querySelector<HTMLButtonElement>('.yakit-search-input-slot-button');

    expect(action?.getAttribute('aria-label')).toBe('搜索');
  });

  it('keeps a controlled dropdown selector value', () => {
    const { container, root } = render(
      <Input.Search
        selector={{ options: [{ label: 'A', value: 'a' }], value: 'a' }}
        variant="dropdown"
      />,
    );

    flushSync(() =>
      root.render(
        <Input.Search
          selector={{
            options: [
              { label: 'A', value: 'a' },
              { label: 'B', value: 'b' },
            ],
            value: 'b',
          }}
          variant="dropdown"
        />,
      ),
    );

    expect(container.querySelector('select')?.value).toBe('b');
  });

  it('disables both the selector and editable search field', () => {
    const { container } = render(
      <Input.Search
        disabled
        selector={{ options: [{ label: 'A', value: 'a' }] }}
        variant="dropdown"
      />,
    );

    expect(container.querySelector('select')?.disabled).toBe(true);
    expect(container.querySelector('input')?.disabled).toBe(true);
  });
});

describe('Input.SearchTrigger behavior', () => {
  it('provides a labelled button ref and emits onPress with its click event', () => {
    const ref = createRef<HTMLButtonElement>();
    const onPress = vi.fn();
    const { container } = render(
      <Input.SearchTrigger aria-label="Run search" onPress={onPress} ref={ref} />,
    );
    const button = container.querySelector('button');

    button?.click();

    expect(ref.current).toBe(button);
    expect(button?.getAttribute('aria-label')).toBe('Run search');
    expect(onPress).toHaveBeenCalledOnce();
    expect(onPress.mock.calls[0]?.[0].nativeEvent).toBeInstanceOf(PointerEvent);
  });

  it('does not emit onPress while disabled', () => {
    const onPress = vi.fn();
    const { container } = render(<Input.SearchTrigger disabled onPress={onPress} />);

    container.querySelector('button')?.click();

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('SearchInput compatibility behavior', () => {
  it('forwards editable searches to the canonical Input.Search DOM', () => {
    const canonical = render(<Input.Search defaultValue="needle" />).container;
    const legacy = render(<SearchInput defaultValue="needle" />).container;

    expect(legacy.querySelector('.yakit-search-input-box')).not.toBeNull();
    expect(legacy.querySelector('input')?.value).toBe(canonical.querySelector('input')?.value);
  });

  it('pins the legacy icon-only callback to an empty input-source search', () => {
    const onSearch = vi.fn();
    const { container } = render(<SearchInput onSearch={onSearch} variant="icon-only" />);

    container.querySelector('button')?.click();

    expect(onSearch).toHaveBeenCalledWith('', expect.anything(), { source: 'input' });
  });
});

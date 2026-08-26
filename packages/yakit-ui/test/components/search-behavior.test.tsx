import React, { createRef, forwardRef, memo } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import SearchInput from '../../src/components/SearchInput';
import { cleanup, render, setNativeInputValue } from '../helpers/render';

afterEach(cleanup);

describe('Input.Search behavior', () => {
  const ForwardedAction = forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
    (props, ref) => <button {...props} ref={ref} />,
  );
  const MemoAction = memo(ForwardedAction);

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

  it.each([
    ['native', <button type="button">Native</button>],
    ['Yakit', <Button>Yakit</Button>],
    ['anchor', <a href="#search">Anchor</a>],
    ['forwardRef', <ForwardedAction type="button">Forwarded</ForwardedAction>],
    ['memo', <MemoAction type="button">Memo</MemoAction>],
    [
      'fragment',
      <>
        <button type="button">Fragment button</button>
      </>,
    ],
  ])(
    'uses a custom %s button as the action without nesting interactive controls',
    (label, action) => {
      const onSearch = vi.fn();
      const { container } = render(
        <Input.Search defaultValue="needle" enterButton={action} onSearch={onSearch} />,
      );
      const button = container.querySelector<HTMLButtonElement>('.yakit-search-input-slot-button');

      expect(container.querySelector('button button')).toBeNull();
      expect(container.querySelector('[role="button"] button')).toBeNull();
      if (label === 'fragment') expect(container).not.toHaveTextContent('Fragment button');
      button?.click();
      expect(onSearch).toHaveBeenCalledWith('needle', expect.anything(), { source: 'input' });
    },
  );

  it('makes a disabled custom anchor inert', () => {
    const onAction = vi.fn();
    const onSearch = vi.fn();
    const { container } = render(
      <Input.Search
        disabled
        enterButton={
          <a href="#search" onClick={onAction}>
            Anchor
          </a>
        }
        onSearch={onSearch}
      />,
    );
    const action = container.querySelector<HTMLAnchorElement>('.yakit-search-input-slot-button');

    action?.click();
    expect(action).toHaveAttribute('aria-disabled', 'true');
    expect(action).toHaveAttribute('tabindex', '-1');
    expect(onAction).not.toHaveBeenCalled();
    expect(onSearch).not.toHaveBeenCalled();
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

  it('does not search on Enter while an IME composition is active', () => {
    const onSearch = vi.fn();
    const { container } = render(<Input.Search defaultValue="中" onSearch={onSearch} />);
    const input = container.querySelector('input');

    if (!input) throw new Error('expected a search input');
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '中' }));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('resets an uncontrolled search value through its owning form', () => {
    const { container } = render(
      <form>
        <Input.Search defaultValue="initial" name="query" />
      </form>,
    );
    const form = container.querySelector('form');
    const input = container.querySelector('input');
    if (!form || !input) throw new Error('expected a search form control');

    flushSync(() => setNativeInputValue(input, 'changed'));
    flushSync(() => form.reset());
    expect(input.value).toBe('initial');
  });

  it('maps error state to aria-invalid and keeps clear keyboard-accessible', () => {
    const { container } = render(<Input.Search allowClear defaultValue="value" error />);

    expect(container.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(
      container.querySelector<HTMLButtonElement>('.yakit-search-input-field-clear-icon')?.tabIndex,
    ).toBe(0);
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

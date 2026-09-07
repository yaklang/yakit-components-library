import React, { createRef, forwardRef, memo } from 'react';
import { flushSync } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Button from '../../src/components/Button';
import Input, { type InputRef } from '../../src/components/Input';
import SearchInput from '../../src/components/SearchInput';
import { cleanup, render, setNativeInputValue } from '../helpers/render';

afterEach(cleanup);

describe('Input.Search behavior', () => {
  const ForwardedAction = forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
    (props, ref) => <button {...props} ref={ref} />,
  );
  const MemoAction = memo(ForwardedAction);

  it('keeps controlled values authoritative across edits, clears, and parent rerenders', () => {
    const onChange = vi.fn();
    const onClear = vi.fn();
    const onSearch = vi.fn();
    const { container, root } = render(
      <Input.Search
        allowClear
        onChange={onChange}
        onClear={onClear}
        onSearch={onSearch}
        value="one"
      />,
    );
    const input = container.querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('expected a search input');

    flushSync(() => setNativeInputValue(input, 'edited'));
    expect(onChange).toHaveBeenCalledOnce();
    expect(input.value).toBe('one');

    container.querySelector<HTMLButtonElement>('.yakit-search-input-field-clear-icon')?.click();
    expect(onClear).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenLastCalledWith('', expect.anything(), { source: 'clear' });
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(input.value).toBe('one');

    flushSync(() =>
      root.render(
        <Input.Search
          allowClear
          onChange={onChange}
          onClear={onClear}
          onSearch={onSearch}
          value="two"
        />,
      ),
    );
    expect(input.value).toBe('two');
  });

  it('emits successful Enter callbacks once with the keyboard event and input source', () => {
    const onPressEnter = vi.fn();
    const onSearch = vi.fn();
    const { container } = render(
      <Input.Search defaultValue="needle" onPressEnter={onPressEnter} onSearch={onSearch} />,
    );
    const input = container.querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('expected a search input');

    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));

    expect(onPressEnter).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledOnce();
    expect(onSearch).toHaveBeenCalledWith('needle', onPressEnter.mock.calls[0]?.[0], {
      source: 'input',
    });
  });

  it('forwards change, focus, and blur exactly once', () => {
    const onBlur = vi.fn();
    const onChange = vi.fn();
    const onFocus = vi.fn();
    const { container } = render(
      <Input.Search onBlur={onBlur} onChange={onChange} onFocus={onFocus} />,
    );
    const input = container.querySelector<HTMLInputElement>('input');
    if (!input) throw new Error('expected a search input');

    input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    setNativeInputValue(input, 'x');
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

    expect(onFocus).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledOnce();
    expect(onBlur).toHaveBeenCalledOnce();
  });

  it.each([
    ['default', 'box'],
    ['primary', 'main-bg'],
    ['outlined', 'outlined'],
    ['borderless', 'borderless'],
    ['filled', 'filled'],
    ['underlined', 'underlined'],
  ] as const)('normalizes the %s variant to %s', (variant, expected) => {
    const { container } = render(<Input.Search variant={variant} />);
    expect(container.querySelector(`.yakit-search-input-${expected}`)).not.toBeNull();
  });

  it('normalizes middle size and renders representative icon-position combinations', () => {
    const front = render(<Input.Search icon={<span data-icon="front" />} size="middle" />);
    const both = render(
      <Input.Search icon={<span data-icon="both" />} iconPosition="both" variant="filled" />,
    );
    const none = render(<Input.Search icon={false} variant="main-bg" />);

    expect(front.container.querySelector('.yakit-search-input-medium')).not.toBeNull();
    expect(front.container.querySelectorAll('[data-icon="front"]')).toHaveLength(1);
    expect(both.container.querySelectorAll('[data-icon="both"]')).toHaveLength(2);
    expect(none.container.querySelectorAll('.yakit-search-input-slot-button')).toHaveLength(1);
    expect(none.container.querySelector('.yakit-search-input-slot-button img')).not.toBeNull();
  });

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

  it.each([
    ['button', <button>Button</button>],
    ['summary', <summary>Summary</summary>],
  ] as const)('makes a disabled custom %s action inert', (kind, enterButton) => {
    const onSearch = vi.fn();
    const { container } = render(
      <Input.Search disabled enterButton={enterButton} onSearch={onSearch} />,
    );
    const action = container.querySelector<HTMLElement>('.yakit-search-input-slot-button');

    action?.click();
    if (kind === 'button') expect(action).toBeDisabled();
    else {
      expect(action).toHaveAttribute('aria-disabled', 'true');
      expect(action).toHaveAttribute('tabindex', '-1');
    }
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

  it('marks disabled selector options and reports programmatic changes', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Input.Search
        selector={{
          defaultValue: 'a',
          onChange,
          options: [
            { label: 'A', value: 'a' },
            { disabled: true, label: 'B', value: 'b' },
          ],
        }}
        variant="dropdown"
      />,
    );
    const select = container.querySelector<HTMLSelectElement>('select');
    if (!select) throw new Error('expected a search selector');

    expect(select.value).toBe('a');
    expect(select.options[1]).toBeDisabled();
    select.value = 'b';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith('b', expect.anything());
  });

  it.each([
    ['true', true, ''],
    ['string', 'Run', 'Run'],
    ['non-interactive element', <span>Ignored child</span>, ''],
  ] as const)(
    'renders the %s enterButton branch without nested controls',
    (_label, enterButton, text) => {
      const { container } = render(<Input.Search enterButton={enterButton} />);
      const action = container.querySelector<HTMLButtonElement>('.yakit-search-input-slot-button');

      expect(action).not.toBeNull();
      expect(action?.textContent).toBe(text);
      expect(container.querySelector('button button')).toBeNull();
    },
  );

  it.each(['a', 'summary'] as const)(
    'keeps a custom %s callback and lets preventDefault cancel search',
    (element) => {
      const onAction = vi.fn((event: React.MouseEvent<HTMLElement>) => event.preventDefault());
      const onSearch = vi.fn();
      const action =
        element === 'a' ? (
          <a href="#search" onClick={onAction}>
            Go
          </a>
        ) : (
          <summary onClick={onAction}>Go</summary>
        );
      const { container } = render(
        <Input.Search defaultValue="needle" enterButton={action} onSearch={onSearch} />,
      );

      container.querySelector<HTMLElement>(element)?.click();
      expect(onAction).toHaveBeenCalledOnce();
      expect(onSearch).not.toHaveBeenCalled();
    },
  );

  it('does not submit its owning form from a custom action button', () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    const { container } = render(
      <form onSubmit={onSubmit}>
        <Input.Search defaultValue="needle" enterButton={<button>Go</button>} />
      </form>,
    );
    const action = container.querySelector<HTMLButtonElement>('.yakit-search-input-slot-button');

    expect(action?.type).toBe('button');
    action?.click();
    expect(onSubmit).not.toHaveBeenCalled();
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

  it('does not let form reset override a controlled search value', () => {
    const { container } = render(
      <form>
        <Input.Search name="query" value="controlled" />
      </form>,
    );
    const form = container.querySelector('form');
    const input = container.querySelector<HTMLInputElement>('input');
    if (!form || !input) throw new Error('expected a search form control');

    flushSync(() => form.reset());
    expect(input.value).toBe('controlled');
  });

  it('maps error state to aria-invalid and keeps clear keyboard-accessible', () => {
    const { container } = render(<Input.Search allowClear defaultValue="value" error />);

    expect(container.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(
      container.querySelector<HTMLButtonElement>('.yakit-search-input-field-clear-icon')?.tabIndex,
    ).toBe(0);
  });

  it('honors explicit aria state, readOnly behavior, clear labels, and decorative alt text', () => {
    const { container } = render(
      <Input.Search
        allowClear
        aria-invalid="false"
        defaultValue="value"
        readOnly
        status="error"
        variant="dropdown"
      />,
    );

    expect(container.querySelector('input')).toHaveAttribute('aria-invalid', 'false');
    expect(container.querySelector('input')).toHaveAttribute('readonly');
    expect(container.querySelector('.yakit-search-input-field-clear-icon')).toBeNull();
    expect([...container.querySelectorAll('img')].every((image) => image.alt === '')).toBe(true);

    const editable = render(<Input.Search allowClear defaultValue="value" />);
    expect(
      editable.container.querySelector('.yakit-search-input-field-clear-icon'),
    ).toHaveAttribute('aria-label', '清除');
  });

  it('applies semantic classes and styles to every implemented Search slot', () => {
    const semantic = vi.fn(() => ({
      button: { icon: 'button-icon', root: 'button-root' },
      clear: 'clear-slot',
      input: 'input-slot',
      prefix: 'prefix-slot',
      root: 'root-slot',
      suffix: 'suffix-slot',
    }));
    const { container } = render(
      <Input.Search
        allowClear
        classNames={semantic}
        defaultValue="value"
        enterButton
        prefix="prefix"
        styles={{
          button: { icon: { opacity: 0.5 }, root: { color: 'rgb(1, 2, 3)' } },
          clear: { opacity: 0.6 },
          input: { opacity: 0.7 },
          prefix: { opacity: 0.8 },
          root: { opacity: 0.9 },
          suffix: { opacity: 1 },
        }}
        suffix="suffix"
      />,
    );

    expect(semantic).toHaveBeenCalledWith({ disabled: false, focused: false, value: 'value' });
    expect(container.querySelector('.root-slot')).toHaveStyle({ opacity: '0.9' });
    expect(container.querySelector('.input-slot')).toHaveStyle({ opacity: '0.7' });
    expect(container.querySelector('.prefix-slot')).toHaveStyle({ opacity: '0.8' });
    expect(container.querySelector('.suffix-slot')).toHaveStyle({ opacity: '1' });
    expect(container.querySelector('.clear-slot')).toHaveStyle({ opacity: '0.6' });
    expect(container.querySelector('.button-root')).toHaveStyle({ color: 'rgb(1, 2, 3)' });
    expect(container.querySelector('.button-icon')).toHaveStyle({ opacity: '0.5' });
  });

  it('honors keydown preventDefault before press-enter and search callbacks', () => {
    const onKeyDown = vi.fn((event: React.KeyboardEvent<HTMLInputElement>) =>
      event.preventDefault(),
    );
    const onPressEnter = vi.fn();
    const onSearch = vi.fn();
    const { container } = render(
      <Input.Search
        defaultValue="needle"
        onKeyDown={onKeyDown}
        onPressEnter={onPressEnter}
        onSearch={onSearch}
      />,
    );

    container
      .querySelector('input')
      ?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
      );

    expect(onKeyDown).toHaveBeenCalledOnce();
    expect(onPressEnter).not.toHaveBeenCalled();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('preserves a custom action callback and lets it cancel the search', () => {
    const calls: string[] = [];
    const onSearch = vi.fn(() => calls.push('search'));
    const onAction = vi.fn((event: React.MouseEvent<HTMLButtonElement>) => {
      calls.push('action');
      event.preventDefault();
    });
    const { container } = render(
      <Input.Search
        defaultValue="needle"
        enterButton={<button onClick={onAction}>Go</button>}
        onSearch={onSearch}
      />,
    );
    const action = container.querySelector<HTMLButtonElement>('.yakit-search-input-slot-button');

    expect(action?.type).toBe('button');
    action?.click();
    expect(calls).toEqual(['action']);
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('exposes the editable input and root through the Search ref', () => {
    const ref = createRef<InputRef>();
    const { container } = render(<Input.Search defaultValue="needle" ref={ref} />);

    expect(ref.current?.input).toBe(container.querySelector('input'));
    expect(ref.current?.nativeElement).toBe(container.querySelector('.yakit-search-input'));
    ref.current?.focus();
    ref.current?.select();
    expect(document.activeElement).toBe(ref.current?.input);
    expect(ref.current?.input?.selectionStart).toBe(0);
    expect(ref.current?.input?.selectionEnd).toBe(6);
    ref.current?.setSelectionRange(1, 4);
    expect(ref.current?.input?.selectionStart).toBe(1);
    expect(ref.current?.input?.selectionEnd).toBe(4);
    ref.current?.blur();
    expect(document.activeElement).not.toBe(ref.current?.input);
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

  it('runs onClick first and respects its preventDefault before onPress', () => {
    const calls: string[] = [];
    const onClick = vi.fn((event: React.MouseEvent<HTMLButtonElement>) => {
      calls.push('click');
      event.preventDefault();
    });
    const onPress = vi.fn(() => calls.push('press'));
    const { container } = render(<Input.SearchTrigger onClick={onClick} onPress={onPress} />);

    container.querySelector('button')?.click();
    expect(calls).toEqual(['click']);
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
    expect(container.querySelector('button')).toHaveAttribute('aria-label', '搜索');
  });

  it('forwards an explicit icon through the icon-only compatibility route', () => {
    const { container } = render(
      <SearchInput icon={<span data-testid="legacy-icon">custom</span>} variant="icon-only" />,
    );

    expect(container.querySelector('[data-testid="legacy-icon"]')).toHaveTextContent('custom');
  });

  it('routes iconPosition=only to a labelled trigger without a textbox', () => {
    const onSearch = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    const { container } = render(
      <SearchInput
        aria-label="Open search"
        icon={false}
        iconPosition="only"
        onSearch={onSearch}
        ref={ref as React.Ref<InputRef | HTMLButtonElement>}
      />,
    );

    expect(container.querySelector('input')).toBeNull();
    expect(ref.current).toBe(container.querySelector('button'));
    expect(ref.current).toHaveAttribute('aria-label', 'Open search');
    expect(ref.current?.querySelector('.yakit-search-input-icon')?.textContent).toBe('');
    ref.current?.click();
    expect(onSearch).toHaveBeenCalledWith('', expect.anything(), { source: 'input' });
  });

  it('forwards editable props and InputRef through the canonical route', () => {
    const onSearch = vi.fn();
    const ref = createRef<InputRef>();
    const { container } = render(
      <SearchInput
        data-owner="legacy"
        defaultValue="needle"
        iconPosition="back"
        onSearch={onSearch}
        ref={ref as React.Ref<InputRef | HTMLButtonElement>}
        variant="filled"
      />,
    );

    expect(container.querySelector('.yakit-search-input-filled')).not.toBeNull();
    expect(container.querySelector('input')).toHaveAttribute('data-owner', 'legacy');
    expect(ref.current?.input).toBe(container.querySelector('input'));
    container.querySelector<HTMLButtonElement>('.yakit-search-input-slot-button')?.click();
    expect(onSearch).toHaveBeenCalledWith('needle', expect.anything(), { source: 'input' });
  });

  it('keeps the icon-only compatibility route inert while disabled', () => {
    const onSearch = vi.fn();
    const { container } = render(<SearchInput disabled onSearch={onSearch} variant="icon-only" />);

    container.querySelector('button')?.click();
    expect(container.querySelector('button')).toBeDisabled();
    expect(onSearch).not.toHaveBeenCalled();
  });
});

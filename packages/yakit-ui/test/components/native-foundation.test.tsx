import React from 'react';
import { flushSync } from 'react-dom';
import { hydrateRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Wave from '../../src/components/Animation/Wave';
import Button from '../../src/components/Button';
import ConfigProvider from '../../src/components/ConfigProvider';
import Tag from '../../src/components/Tag';
import useYakitConfig from '../../src/hooks/useYakitConfig';
import { NativeComponentsFixture } from '../fixtures/native-components';
import { cleanup, render } from '../helpers/render';

const hydrationRoots: Root[] = [];

afterEach(() => {
  hydrationRoots.splice(0).forEach((root) => root.unmount());
  cleanup();
});

const ConfigProbe = () => {
  const config = useYakitConfig();
  return (
    <output
      data-disabled={String(config.componentDisabled)}
      data-locale={config.locale.locale}
      data-mode={config.mode}
      data-primary={config.token.colorPrimary}
      data-search={config.locale.Search?.search}
      dir={config.direction}
    />
  );
};

describe('native configuration foundation', () => {
  it('merges nested native provider values without adding DOM wrappers', () => {
    const { container } = render(
      <ConfigProvider
        componentDisabled
        direction="rtl"
        locale={{ locale: 'en-US', Search: { search: 'Search' } }}
        theme={{ mode: 'dark', token: { colorPrimary: '#123456' } }}
      >
        <ConfigProvider locale={{ locale: 'en-GB', Search: { search: undefined } }}>
          <ConfigProbe />
        </ConfigProvider>
      </ConfigProvider>,
    );
    const probe = container.querySelector('output');

    expect(container.childElementCount).toBe(1);
    expect(probe?.dataset.disabled).toBe('true');
    expect(probe?.dataset.locale).toBe('en-GB');
    expect(probe?.dataset.mode).toBe('dark');
    expect(probe?.dataset.primary).toBe('#123456');
    expect(probe?.dataset.search).toBe('Search');
    expect(probe?.dir).toBe('rtl');
  });

  it('applies provider size, disabled state and token variables to native Button', () => {
    const { container } = render(
      <ConfigProvider
        componentDisabled
        componentSize="large"
        theme={{ token: { colorPrimary: '#654321' } }}
      >
        <Button>Submit</Button>
      </ConfigProvider>,
    );
    const button = container.querySelector('button');

    expect(button?.disabled).toBe(true);
    expect(button?.classList.contains('yakit-btn-large')).toBe(true);
    expect(button?.style.getPropertyValue('--yakit-color-primary')).toBe('#654321');
  });

  it('ignores undefined nested token overrides and preserves component tokens', () => {
    const { container } = render(
      <ConfigProvider
        theme={{
          components: { YakitButton: { borderRadius: '9px' } },
          token: { colorPrimary: '#654321' },
        }}
      >
        <ConfigProvider
          theme={{
            components: { YakitButton: { borderRadius: undefined } },
            token: { colorPrimary: undefined },
          }}
        >
          <Button>Inherited</Button>
        </ConfigProvider>
      </ConfigProvider>,
    );
    const button = container.querySelector<HTMLElement>('button');

    expect(button?.style.getPropertyValue('--yakit-color-primary')).toBe('#654321');
    expect(button?.style.getPropertyValue('--yakit-btn-border-radius')).toBe('9px');
  });

  it('does not inject runtime style nodes when native components mount', () => {
    const before = document.head.querySelectorAll('style').length;
    const { root } = render(
      <>
        <Button>Button</Button>
        <Tag>Tag</Tag>
      </>,
    );

    flushSync(() => root.render(<Button type="outline1">Updated</Button>));
    expect(document.head.querySelectorAll('style').length).toBe(before);
  });
});

describe('native Button behavior', () => {
  it('defaults to a non-submitting button and preserves native submit/reset behavior', () => {
    const onSubmit = vi.fn<(event: React.FormEvent<HTMLFormElement>) => void>((event) =>
      event.preventDefault(),
    );
    const { container } = render(
      <form onSubmit={onSubmit}>
        <input defaultValue="initial" />
        <Button>Default</Button>
        <Button htmlType="submit">Submit</Button>
        <Button htmlType="reset">Reset</Button>
      </form>,
    );
    const input = container.querySelector('input');
    const [defaultButton, submitButton, resetButton] = [
      ...container.querySelectorAll<HTMLButtonElement>('button'),
    ];
    if (!input || !defaultButton || !submitButton || !resetButton) {
      throw new Error('expected a complete native button form fixture');
    }

    expect(defaultButton.type).toBe('button');
    defaultButton.click();
    expect(onSubmit).not.toHaveBeenCalled();
    submitButton.click();
    expect(onSubmit).toHaveBeenCalledOnce();
    input.value = 'changed';
    resetButton.click();
    expect(input.value).toBe('initial');
  });

  it('blocks loading and disabled clicks while preserving busy and icon-position state', () => {
    const onLoadingClick = vi.fn();
    const onDisabledClick = vi.fn();
    const { container } = render(
      <>
        <Button icon={<span data-icon />} iconPosition="end" loading onClick={onLoadingClick}>
          Loading
        </Button>
        <Button disabled onClick={onDisabledClick}>
          Disabled
        </Button>
      </>,
    );
    const [loadingButton, disabledButton] = [
      ...container.querySelectorAll<HTMLButtonElement>('button'),
    ];

    loadingButton?.click();
    disabledButton?.click();
    expect(loadingButton).toBeDisabled();
    expect(loadingButton).toHaveAttribute('aria-busy', 'true');
    expect(loadingButton).toHaveClass('yakit-btn-icon-end');
    expect(disabledButton).toBeDisabled();
    expect(onLoadingClick).not.toHaveBeenCalled();
    expect(onDisabledClick).not.toHaveBeenCalled();
  });
});

describe('native Wave behavior', () => {
  it('preserves child handlers and removes its transition holder', () => {
    const onMouseUp = vi.fn();
    const { container } = render(
      <Wave animation="wave">
        <button onMouseUp={onMouseUp}>Wave</button>
      </Wave>,
    );
    const button = container.querySelector('button');

    if (!button) throw new Error('expected a button');
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(onMouseUp).toHaveBeenCalledOnce();

    const effect = button.querySelector<HTMLElement>('.yakit-wave-effect');
    expect(effect).not.toBeNull();
    effect?.dispatchEvent(new Event('transitionend'));
    expect(button.querySelector('.yakit-wave-holder')).toBeNull();
  });

  it('does not leave a holder behind when reduced motion is requested', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList);
    const { container } = render(
      <Wave animation="wave">
        <button>Reduced motion</button>
      </Wave>,
    );
    const button = container.querySelector('button');

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
    matchMedia.mockRestore();
  });

  it.each(['Enter', ' '])('runs the %s keyboard wave and child handler exactly once', (key) => {
    const onKeyUp = vi.fn();
    const { container } = render(
      <Wave animation="wave">
        <button onKeyUp={onKeyUp}>Keyboard wave</button>
      </Wave>,
    );
    const button = container.querySelector('button');

    button?.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key }));
    expect(onKeyUp).toHaveBeenCalledOnce();
    expect(button?.querySelectorAll('.yakit-wave-holder')).toHaveLength(1);
  });

  it('removes active holders when Wave unmounts', () => {
    const { container } = render(
      <Wave animation="wave">
        <button>Unmount wave</button>
      </Wave>,
    );
    const button = container.querySelector('button');

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(button?.querySelector('.yakit-wave-holder')).not.toBeNull();
    cleanup();
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
  });

  it('uses its bounded timer when transitionend is not delivered', async () => {
    const { container } = render(
      <Wave animation="wave">
        <button>Timed wave</button>
      </Wave>,
    );
    const button = container.querySelector('button');

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(button?.querySelector('.yakit-wave-holder')).not.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 550));
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull();
  });
});

describe('native Tag characterization', () => {
  it('preserves size, color and bordered classes', () => {
    const { container } = render(
      <>
        <Tag color="yellow" size="large">
          Bordered
        </Tag>
        <Tag bordered={false} color="success" size="small">
          Borderless
        </Tag>
      </>,
    );
    const [bordered, borderless] = [...container.querySelectorAll<HTMLElement>('.yakit-tag')];

    expect(bordered).toHaveClass('yakit-tag-large', 'yakit-tag-yellow');
    expect(bordered).not.toHaveClass('yakit-tag-bordered');
    expect(borderless).toHaveClass('yakit-tag-bordered', 'yakit-tag-small', 'yakit-tag-success');
  });

  it('keeps closeIcon and onClose as characterized no-ops', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Tag closeIcon={<button type="button">Close</button>} onClose={onClose}>
        Stable
      </Tag>,
    );
    const tag = container.querySelector('.yakit-tag');

    tag?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(tag).toHaveTextContent('Stable');
    expect(tag?.querySelector('button')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('native component hydration', () => {
  it('hydrates the complete family without warnings, hash classes, or dynamic styles', async () => {
    const response = await fetch('/test-results/components/native-components-ssr.json');
    if (!response.ok) throw new Error(`SSR fixture unavailable: ${response.status}`);
    const fixture = (await response.json()) as { markup: string };
    const container = document.createElement('div');
    container.innerHTML = fixture.markup;
    document.body.append(container);
    const styleCount = document.head.querySelectorAll('style').length;
    const recoverableErrors: unknown[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const root = hydrateRoot(container, <NativeComponentsFixture />, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    });
    hydrationRoots.push(root);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(recoverableErrors).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(document.head.querySelectorAll('style')).toHaveLength(styleCount);
    expect(container.querySelector('button button')).toBeNull();
    expect(
      [...container.querySelectorAll<HTMLElement>('[class]')].some((element) =>
        [...element.classList].some((name) => /(?:css-dev-only|ant-)/.test(name)),
      ),
    ).toBe(false);

    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });
});

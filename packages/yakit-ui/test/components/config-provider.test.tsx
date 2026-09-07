import React from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ConfigProvider from '../../src/components/ConfigProvider';
import useYakitConfig from '../../src/hooks/useYakitConfig';
import { cleanup, render } from '../helpers/render';

const hydrationRoots: Root[] = [];

const ConfigProbe = () => {
  const config = useYakitConfig();

  return (
    <output
      data-button-radius={config.token.YakitButton?.borderRadius}
      data-disabled={String(config.componentDisabled)}
      data-locale={config.locale.locale}
      data-mode={config.mode}
      data-primary={config.token.colorPrimary}
      data-search={config.locale.Search?.search}
      data-size={config.componentSize}
      data-tag-padding={config.token.YakitTag?.paddingMD}
      dir={config.direction}
    />
  );
};

afterEach(() => {
  hydrationRoots.splice(0).forEach((root) => root.unmount());
  cleanup();
  vi.restoreAllMocks();
});

describe('ConfigProvider', () => {
  it('exposes stable defaults without a provider', () => {
    const { container } = render(<ConfigProbe />);
    const probe = container.querySelector('output');

    expect(probe).toHaveAttribute('dir', 'ltr');
    expect(probe).toHaveAttribute('data-disabled', 'undefined');
    expect(probe).toHaveAttribute('data-locale', 'zh-CN');
    expect(probe).toHaveAttribute('data-mode', 'light');
    expect(probe).toHaveAttribute('data-primary', 'var(--Colors-Use-Main-Primary)');
    expect(probe).toHaveAttribute('data-search', '搜索');
    expect(probe).not.toHaveAttribute('data-size');
    expect(probe).not.toHaveAttribute('data-button-radius');
    expect(probe).not.toHaveAttribute('data-tag-padding');
  });

  it('deeply merges locale, global tokens and component tokens', () => {
    const { container } = render(
      <ConfigProvider
        componentDisabled
        componentSize="large"
        direction="rtl"
        locale={{ locale: 'en-US', Search: { scope: 'Scope', search: 'Search' } }}
        theme={{
          components: {
            YakitButton: { borderRadius: '8px', iconGap: '4px' },
            YakitTag: { paddingMD: '10px' },
          },
          mode: 'dark',
          token: { colorPrimary: '#123456' },
        }}
      >
        <ConfigProvider
          locale={{ locale: 'en-GB', Search: { search: undefined } }}
          theme={{
            components: {
              YakitButton: { borderRadius: undefined, fontSizeMD: '14px' },
              YakitTag: { paddingMD: undefined },
            },
            token: { colorPrimary: undefined },
          }}
        >
          <ConfigProbe />
        </ConfigProvider>
      </ConfigProvider>,
    );
    const probe = container.querySelector('output');

    expect(container.childElementCount).toBe(1);
    expect(probe).toHaveAttribute('dir', 'rtl');
    expect(probe).toHaveAttribute('data-disabled', 'true');
    expect(probe).toHaveAttribute('data-size', 'large');
    expect(probe).toHaveAttribute('data-locale', 'en-GB');
    expect(probe).toHaveAttribute('data-search', 'Search');
    expect(probe).toHaveAttribute('data-mode', 'dark');
    expect(probe).toHaveAttribute('data-primary', '#123456');
    expect(probe).toHaveAttribute('data-button-radius', '8px');
    expect(probe).toHaveAttribute('data-tag-padding', '10px');
  });

  it('honors explicit false and child scalar values over inherited configuration', () => {
    const { container } = render(
      <ConfigProvider
        componentDisabled
        componentSize="huge"
        direction="rtl"
        theme={{ components: { YakitTag: { paddingMD: '8px' } }, token: { colorPrimary: 'red' } }}
      >
        <ConfigProvider
          componentDisabled={false}
          componentSize="small"
          direction="ltr"
          theme={{ components: { YakitTag: { paddingMD: '0' } }, token: { colorPrimary: '' } }}
        >
          <ConfigProbe />
        </ConfigProvider>
      </ConfigProvider>,
    );
    const probe = container.querySelector('output');

    expect(probe).toHaveAttribute('data-disabled', 'false');
    expect(probe).toHaveAttribute('data-size', 'small');
    expect(probe).toHaveAttribute('dir', 'ltr');
    expect(probe).toHaveAttribute('data-primary', '');
    expect(probe).toHaveAttribute('data-tag-padding', '0');
  });

  it('keeps sibling providers isolated', () => {
    const { container } = render(
      <>
        <ConfigProvider direction="rtl" theme={{ mode: 'dark' }}>
          <ConfigProbe />
        </ConfigProvider>
        <ConfigProvider locale={{ locale: 'en-US' }}>
          <ConfigProbe />
        </ConfigProvider>
      </>,
    );
    const [first, second] = [...container.querySelectorAll('output')];

    expect(first).toHaveAttribute('dir', 'rtl');
    expect(first).toHaveAttribute('data-mode', 'dark');
    expect(first).toHaveAttribute('data-locale', 'zh-CN');

    expect(second).toHaveAttribute('dir', 'ltr');
    expect(second).toHaveAttribute('data-mode', 'light');
    expect(second).toHaveAttribute('data-locale', 'en-US');
  });

  it('does not mutate parent locale or token input objects', () => {
    const locale = { locale: 'en-US', Search: { scope: 'Scope', search: 'Search' } };
    const token = { colorPrimary: '#123456' };
    const buttonToken = { borderRadius: '8px' };
    const localeBefore = structuredClone(locale);
    const tokenBefore = structuredClone(token);
    const buttonTokenBefore = structuredClone(buttonToken);

    render(
      <ConfigProvider locale={locale} theme={{ components: { YakitButton: buttonToken }, token }}>
        <ConfigProvider
          locale={{ locale: 'en-GB', Search: { search: undefined } }}
          theme={{ components: { YakitButton: { borderRadius: undefined } } }}
        >
          <ConfigProbe />
        </ConfigProvider>
      </ConfigProvider>,
    );

    expect(locale).toEqual(localeBefore);
    expect(token).toEqual(tokenBefore);
    expect(buttonToken).toEqual(buttonTokenBefore);
  });

  it('preserves multiple children and Fragment structure without a wrapper', () => {
    const { container } = render(
      <ConfigProvider>
        <>
          <span data-child="first">First</span>
          <span data-child="second">Second</span>
        </>
      </ConfigProvider>,
    );

    expect(container.children).toHaveLength(2);
    expect([...container.children].map((child) => child.getAttribute('data-child'))).toEqual([
      'first',
      'second',
    ]);
  });

  it.each([
    {
      name: 'default',
      tree: (
        <ConfigProvider>
          <ConfigProbe />
        </ConfigProvider>
      ),
    },
    {
      name: 'nested',
      tree: (
        <ConfigProvider direction="rtl" locale={{ locale: 'en-US' }} theme={{ mode: 'dark' }}>
          <ConfigProvider locale={{ locale: 'en-GB' }}>
            <ConfigProbe />
          </ConfigProvider>
        </ConfigProvider>
      ),
    },
  ])('hydrates $name provider markup without warnings or structural changes', async ({ tree }) => {
    const markup = renderToString(tree);
    const container = document.createElement('div');
    container.innerHTML = markup;
    document.body.append(container);
    const recoverableErrors: unknown[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const root = hydrateRoot(container, tree, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    });
    hydrationRoots.push(root);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.innerHTML).toBe(markup);
    expect(recoverableErrors).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});

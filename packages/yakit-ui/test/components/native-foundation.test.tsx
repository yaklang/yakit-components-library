import React from 'react';
import { flushSync } from 'react-dom';
import { hydrateRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Button from '../../src/components/Button';
import ConfigProvider from '../../src/components/ConfigProvider';
import Tag from '../../src/components/Tag';
import { NativeComponentsFixture } from '../fixtures/native-components';
import { cleanup, render } from '../helpers/render';

const hydrationRoots: Root[] = [];

afterEach(() => {
  hydrationRoots.splice(0).forEach((root) => root.unmount());
  cleanup();
});

describe('native configuration foundation', () => {
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

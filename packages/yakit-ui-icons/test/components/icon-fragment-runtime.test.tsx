import React, { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AddPayloadOutlined,
  DataComparisonOutlined,
  Goal2Outlined,
  LogoOutlined,
  RocketOffOutlined,
  StarOffOutlined,
  Wrench1Outlined,
} from '../../src';

const roots: Root[] = [];

const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  flushSync(() => root.render(node));
  return container;
};

const fragmentReferences = (svg: SVGSVGElement) =>
  [...svg.querySelectorAll<SVGElement>('*')].flatMap((element) =>
    [...element.attributes].flatMap(({ name, value }) => {
      const urlReferences = [...value.matchAll(/url\(\s*#([^)'"\s]+)\s*\)/g)].map(
        (match) => match[1],
      );
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) {
        urlReferences.push(value.slice(1));
      }
      if (name === 'aria-labelledby' || name === 'aria-describedby') {
        urlReferences.push(...value.trim().split(/\s+/).filter(Boolean));
      }
      return urlReferences;
    }),
  );

const expectOwnedFragments = (container: HTMLElement) => {
  const ids = [...container.querySelectorAll<SVGElement>('svg [id]')].map(({ id }) => id);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
  for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
    for (const reference of fragmentReferences(svg)) {
      expect(svg.querySelector(`[id="${CSS.escape(reference)}"]`)).not.toBeNull();
    }
  }
};

const repeatedFragments = (
  <>
    <LogoOutlined />
    <LogoOutlined />
    <StarOffOutlined />
  </>
);

interface SsrFixture {
  identifierPrefix?: string;
  markup: string;
  serverIds: string[];
}

const hydrate = async (fixtureName: 'custom' | 'default') => {
  const response = await fetch('/test-results/icons/ssr-fragment-fixtures.json');
  if (!response.ok) throw new Error(`SSR fixture unavailable: ${response.status}`);
  const fixtures = (await response.json()) as Record<'custom' | 'default', SsrFixture>;
  const fixture = fixtures[fixtureName];
  const container = document.createElement('div');
  document.body.append(container);
  container.innerHTML = fixture.markup;
  const options = fixture.identifierPrefix
    ? { identifierPrefix: fixture.identifierPrefix }
    : undefined;
  const errors: unknown[] = [];
  const root = hydrateRoot(container, repeatedFragments, {
    ...options,
    onRecoverableError: (error) => errors.push(error),
  });
  roots.push(root);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { container, errors, serverIds: fixture.serverIds };
};

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.replaceChildren();
});

describe('Outline icon fragment runtime', () => {
  it('keeps the reconstructed clips local to each instance', () => {
    const container = render(
      <>
        <DataComparisonOutlined svgProps={{ strokeWidth: 1 }} />
        <DataComparisonOutlined svgProps={{ strokeWidth: 3 }} />
        <RocketOffOutlined svgProps={{ strokeWidth: 1 }} />
        <RocketOffOutlined svgProps={{ strokeWidth: 3 }} />
      </>,
    );
    expect(container.querySelectorAll('clipPath')).toHaveLength(4);
    expectOwnedFragments(container);
  });
  it('assigns unique definition IDs to repeated instances', () => {
    const container = render(
      <>
        <LogoOutlined />
        <LogoOutlined />
      </>,
    );
    expectOwnedFragments(container);
  });

  it('resolves every fragment reference inside its owning SVG instance', () => {
    const container = render(
      <StrictMode>
        <AddPayloadOutlined />
        <Goal2Outlined />
        <LogoOutlined />
        <StarOffOutlined />
        <Wrench1Outlined />
      </StrictMode>,
    );

    expectOwnedFragments(container);
  });

  it('hydrates default React identifiers without warnings or fragment drift', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container, errors, serverIds } = await hydrate('default');

    expect(errors).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect([...container.querySelectorAll<SVGElement>('svg [id]')].map(({ id }) => id)).toEqual(
      serverIds,
    );
    expectOwnedFragments(container);
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('hydrates an identical custom identifierPrefix without warnings or fragment drift', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container, errors, serverIds } = await hydrate('custom');

    expect(errors).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect([...container.querySelectorAll<SVGElement>('svg [id]')].map(({ id }) => id)).toEqual(
      serverIds,
    );
    expectOwnedFragments(container);
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('preserves fragment ownership across StrictMode mount and unmount cycles', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);
      flushSync(() => root.render(<StrictMode>{repeatedFragments}</StrictMode>));
      expectOwnedFragments(container);
      flushSync(() => root.unmount());
      container.remove();
    }
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

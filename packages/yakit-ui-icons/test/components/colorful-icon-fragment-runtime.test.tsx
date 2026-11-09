import React, { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { colorfulIconRegistry } from '../../src/registry';

const roots: Root[] = [];

const render = (node: React.ReactNode, identifierPrefix?: string) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container, identifierPrefix ? { identifierPrefix } : undefined);
  roots.push(root);
  flushSync(() => root.render(node));
  return container;
};

const fragmentReferences = (svg: SVGSVGElement) =>
  [svg, ...svg.querySelectorAll<SVGElement>('*')].flatMap((element) => {
    const attributeReferences = [...element.attributes].flatMap(({ name, value }) => {
      const references = [...value.matchAll(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g)].map(
        (match) => match[2],
      );
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) {
        references.push(value.slice(1));
      }
      if (name === 'aria-labelledby' || name === 'aria-describedby') {
        references.push(...value.trim().split(/\s+/).filter(Boolean));
      }
      return references;
    });
    const styleReferences =
      element.tagName.toLowerCase() === 'style'
        ? [...(element.textContent ?? '').matchAll(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g)].map(
            (match) => match[2],
          )
        : [];
    return [...attributeReferences, ...styleReferences];
  });

const fragmentComponents = () =>
  colorfulIconRegistry.flatMap(({ Component }, index) => {
    const markup = renderToString(<Component />, { identifierPrefix: `fragment-scan-${index}-` });
    const svg = new DOMParser()
      .parseFromString(markup, 'text/html')
      .querySelector<SVGSVGElement>('svg');
    return svg && fragmentReferences(svg).length > 0 ? [Component] : [];
  });

const findFragmentComponent = () => fragmentComponents()[0];

const expectOwnedFragments = (container: HTMLElement) => {
  const ids = [...container.querySelectorAll<SVGElement>('svg [id]')].map(({ id }) => id);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);

  for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
    for (const reference of fragmentReferences(svg)) {
      expect(svg.querySelector(`[id="${CSS.escape(reference)}"]`), reference).not.toBeNull();
      expect(document.querySelectorAll(`[id="${CSS.escape(reference)}"]`)).toHaveLength(1);
    }
  }
};

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.replaceChildren();
});

describe('Colorful fragment runtime ownership', () => {
  it('isolates owner IDs when every fragment-bearing icon is mounted repeatedly', () => {
    const Components = fragmentComponents();
    expect(Components.length).toBeGreaterThan(0);
    Components.forEach((Component, index) => {
      expectOwnedFragments(
        render(
          <>
            <Component />
            <Component />
          </>,
          `colorful-all-${index}-`,
        ),
      );
    });
  });

  it('keeps references isolated across roots with distinct identifier prefixes', () => {
    const Component = findFragmentComponent();
    expect(Component).toBeTruthy();
    if (!Component) return;

    const first = render(<Component />, 'colorful-first-');
    const second = render(<Component />, 'colorful-second-');
    expectOwnedFragments(first);
    expectOwnedFragments(second);

    const firstIds = new Set(
      [...first.querySelectorAll<SVGElement>('svg [id]')].map(({ id }) => id),
    );
    const secondIds = [...second.querySelectorAll<SVGElement>('svg [id]')].map(({ id }) => id);
    expect(secondIds.every((id) => !firstIds.has(id))).toBe(true);
  });

  it('hydrates matching server and client prefixes without fragment drift', async () => {
    const Component = findFragmentComponent();
    expect(Component).toBeTruthy();
    if (!Component) return;
    const tree = (
      <StrictMode>
        <Component />
        <Component />
      </StrictMode>
    );
    const identifierPrefix = 'colorful-hydration-';
    const markup = renderToString(tree, { identifierPrefix });
    const serverIds = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const container = document.createElement('div');
    document.body.append(container);
    container.innerHTML = markup;
    const errors: unknown[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    roots.push(
      hydrateRoot(container, tree, {
        identifierPrefix,
        onRecoverableError: (error) => errors.push(error),
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

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

  it('proves independent SSR roots require distinct identifier prefixes', () => {
    const Component = findFragmentComponent();
    expect(Component).toBeTruthy();
    if (!Component) return;
    const tree = <Component />;
    const ids = (markup: string) =>
      new Set([...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
    const first = ids(renderToString(tree, { identifierPrefix: 'root-one-' }));
    const distinct = ids(renderToString(tree, { identifierPrefix: 'root-two-' }));
    const repeated = ids(renderToString(tree, { identifierPrefix: 'root-one-' }));

    expect([...distinct].every((id) => !first.has(id))).toBe(true);
    expect([...repeated].some((id) => first.has(id))).toBe(true);
  });

  it('preserves owner-local fragments across StrictMode mount cycles', () => {
    const Component = findFragmentComponent();
    expect(Component).toBeTruthy();
    if (!Component) return;
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const container = render(
        <StrictMode>
          <Component />
          <Component />
        </StrictMode>,
      );
      expectOwnedFragments(container);
      const root = roots.pop();
      flushSync(() => root?.unmount());
      container.remove();
    }
  });
});

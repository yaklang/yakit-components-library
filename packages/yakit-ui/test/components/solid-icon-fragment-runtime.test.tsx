import React, { StrictMode } from 'react';
import { flushSync } from 'react-dom';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FloatingSolid,
  ParkAboveSolid,
  ParkBelowSolid,
  ParkRightSolid,
  ParkLeftSolid,
  PaintbrushSolid,
  PaperAirplaneSolid,
  PillSolid,
} from '../../src/icons';
import { solidIconRegistry } from '../../src/icons/registry';

const roots: Root[] = [];
const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  flushSync(() => root.render(node));
  return container;
};
const fragmentIcons = [
  PaperAirplaneSolid,
  PaintbrushSolid,
  PillSolid,
  FloatingSolid,
  ParkLeftSolid,
  ParkRightSolid,
  ParkAboveSolid,
  ParkBelowSolid,
];
const repeatedFragments = (
  <>
    {fragmentIcons.flatMap((Component, index) => [
      <Component key={`${index}-first`} />,
      <Component key={`${index}-second`} />,
    ])}
  </>
);

const fragmentReferences = (svg: SVGSVGElement) =>
  [...svg.querySelectorAll<SVGElement>('*')].flatMap((element) =>
    [...element.attributes].flatMap(({ name, value }) => {
      const result = [...value.matchAll(/url\(\s*#([^)'"\s]+)\s*\)/g)].map((match) => match[1]);
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) {
        result.push(value.slice(1));
      }
      if (name === 'aria-labelledby' || name === 'aria-describedby') {
        result.push(...value.trim().split(/\s+/).filter(Boolean));
      }
      return result;
    }),
  );

const expectOwnedFragments = (container: HTMLElement, expectedIds?: number) => {
  const ids = [...container.querySelectorAll<SVGElement>('svg [id]')].map(({ id }) => id);
  if (expectedIds !== undefined) expect(ids).toHaveLength(expectedIds);
  expect(new Set(ids).size).toBe(ids.length);
  for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
    for (const reference of fragmentReferences(svg)) {
      expect(svg.querySelector(`[id="${CSS.escape(reference)}"]`), reference).not.toBeNull();
      expect(document.querySelectorAll(`[id="${CSS.escape(reference)}"]`)).toHaveLength(1);
    }
  }
};

const renderFixture = (identifierPrefix?: string) => {
  const markup = renderToString(
    repeatedFragments,
    identifierPrefix ? { identifierPrefix } : undefined,
  );
  return {
    identifierPrefix,
    markup,
    serverIds: [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]),
  };
};

const hydrate = async (fixtureName: 'custom' | 'default') => {
  const fixture = fixtureName === 'custom' ? renderFixture('solid-audit-') : renderFixture();
  const container = document.createElement('div');
  document.body.append(container);
  container.innerHTML = fixture.markup;
  const errors: unknown[] = [];
  roots.push(
    hydrateRoot(container, repeatedFragments, {
      ...(fixture.identifierPrefix ? { identifierPrefix: fixture.identifierPrefix } : {}),
      onRecoverableError: (error) => errors.push(error),
    }),
  );
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { container, errors, serverIds: fixture.serverIds };
};

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.replaceChildren();
});

describe('Solid fragment runtime ownership', () => {
  it('assigns unique IDs to repeated and adversarial mixed fragment icons', () => {
    expectOwnedFragments(render(repeatedFragments), 8);
  });

  it('keeps all 256 registry sources owner-local when the whole family is mounted twice', () => {
    const container = render(
      <StrictMode>
        {[0, 1].flatMap((copy) =>
          solidIconRegistry.map(({ Component, exportName }) => (
            <Component key={`${copy}-${exportName}`} />
          )),
        )}
      </StrictMode>,
    );
    expect(container.querySelectorAll('svg')).toHaveLength(512);
    expectOwnedFragments(container, 8);
  });

  it.each(['default', 'custom'] as const)(
    'hydrates %s identifiers without warnings or fragment drift',
    async (fixtureName) => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { container, errors, serverIds } = await hydrate(fixtureName);

      expect(errors).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      expect([...container.querySelectorAll<SVGElement>('svg [id]')].map(({ id }) => id)).toEqual(
        serverIds,
      );
      expectOwnedFragments(container, 8);
      consoleError.mockRestore();
      consoleWarn.mockRestore();
    },
  );

  it('preserves ownership across StrictMode mount/unmount cycles', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);
      flushSync(() => root.render(<StrictMode>{repeatedFragments}</StrictMode>));
      expectOwnedFragments(container, 8);
      flushSync(() => root.unmount());
      container.remove();
    }
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import * as PackageApi from '../../src';
import { solidIconNameCatalog } from '../../src/icons/figmaNameCatalog';
import { solidIconRegistry } from '../../src/icons/registry';
import prechange from '../fixtures/icons/reference/solid-local-prechange-controls-v1.json';

const roots: Root[] = [];
const render = (node: React.ReactNode) => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  flushSync(() => root.render(node));
  return container;
};
const renderRegistry = (props: Record<string, unknown> = {}) =>
  render(
    <>
      {solidIconRegistry.map(({ Component, exportName }) => (
        <Component data-icon-name={exportName} key={exportName} {...props} />
      ))}
    </>,
  );
const clearRenders = () => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.replaceChildren();
};

const expectPrimaryPaint = (container: HTMLElement, expectedColor: string) => {
  const svgs = [...container.querySelectorAll<SVGSVGElement>('svg')];
  expect(svgs).toHaveLength(255);
  for (const svg of svgs) {
    const primary = [
      ...svg.querySelectorAll<SVGElement>('[fill="currentColor"], [stroke="currentColor"]'),
    ];
    expect(primary.length, svg.dataset.iconName).toBeGreaterThan(0);
    for (const element of primary) {
      if (element.getAttribute('fill') === 'currentColor') {
        expect(getComputedStyle(element).fill, svg.dataset.iconName).toBe(expectedColor);
      }
      if (element.getAttribute('stroke') === 'currentColor') {
        expect(getComputedStyle(element).stroke, svg.dataset.iconName).toBe(expectedColor);
      }
    }
  }
};

afterEach(clearRenders);

describe('Solid public component API', () => {
  it('preserves all 255 frozen names through the registry and package root', () => {
    const expectedNames = prechange.records.map(({ exportName }) => exportName).sort();
    const registryNames = solidIconRegistry.map(({ exportName }) => exportName).sort();

    expect(expectedNames).toHaveLength(255);
    expect(registryNames).toEqual(expectedNames);
    expect(registryNames).toContain('DownloadFigma12825Filled');
    expect(registryNames).toContain('FigmaIcon2281144183Filled');
    expect(
      solidIconRegistry.every(
        ({ Component, exportName }) =>
          (PackageApi as Record<string, unknown>)[exportName] === Component &&
          Component.displayName === exportName,
      ),
    ).toBe(true);
  });

  it('uses complete Figma names as registry names in catalog order', () => {
    expect(
      solidIconRegistry.map(({ Component: _Component, name, ...metadata }) => ({
        ...metadata,
        name,
      })),
    ).toEqual(
      solidIconNameCatalog.map((entry) => ({
        ...entry,
        name: entry.figmaName ?? entry.exportName,
      })),
    );
    expect(solidIconRegistry.every(({ figmaName, name }) => name === figmaName)).toBe(true);
  });

  it('applies the default color to the actual primary glyph of every export', () => {
    expectPrimaryPaint(renderRegistry(), 'rgb(53, 54, 57)');
  });

  it('applies color, style precedence, and explicit inheritance to every primary glyph', () => {
    expectPrimaryPaint(renderRegistry({ color: '#123456' }), 'rgb(18, 52, 86)');
    clearRenders();

    expectPrimaryPaint(
      renderRegistry({ color: '#123456', style: { color: '#654321' } }),
      'rgb(101, 67, 33)',
    );
    clearRenders();

    const inherited = render(
      <div style={{ color: '#2468ac' }}>
        {solidIconRegistry.map(({ Component, exportName }) => (
          <Component color="inherit" data-icon-name={exportName} key={exportName} />
        ))}
      </div>,
    );
    expectPrimaryPaint(inherited, 'rgb(36, 104, 172)');
  });

  it('keeps size, accessibility, and intentional literal paints intact', () => {
    const container = renderRegistry({ 'aria-label': 'Solid icon', size: 32 });
    for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
      expect(svg.getAttribute('width')).toBe('32');
      expect(svg.getAttribute('height')).toBe('32');
      expect(svg.getAttribute('aria-hidden')).toBeNull();
      expect(svg.getAttribute('focusable')).toBe('false');
    }
    expect(container.querySelector('[fill="#9CA3B1"]')).not.toBeNull();
    expect(container.querySelector('[stroke="white"]')).not.toBeNull();
  });
});

import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import manifest from '../../scripts/figma-outline-icons-inventory.json';
import * as PackageApi from '../../src';
import { outlineIconNameCatalog } from '../../src/icons/figmaNameCatalog';
import { outlineIconRegistry } from '../../src/icons/registry';

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
      {outlineIconRegistry.map(({ Component, exportName }) => (
        <Component data-icon-name={exportName} key={exportName} {...props} />
      ))}
    </>,
  );
const expectedDefaultColor = (name: string) =>
  name === 'EarOutlined' || name === 'SunOutlined' ? 'rgb(10, 10, 10)' : 'rgb(53, 54, 57)';

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.replaceChildren();
});

describe('Outline public component API', () => {
  it('exposes exactly 341 current Figma names plus legacy Notebook from the package root', () => {
    const currentNames = manifest.symbols.map(({ exportName }) => exportName).sort();
    const registryNames = outlineIconRegistry.map(({ exportName }) => exportName).sort();

    expect(currentNames).toHaveLength(341);
    expect(currentNames).toContain('LandPlotOutlined');
    expect(currentNames).not.toContain('NotebookOutlined');
    expect(registryNames).toEqual([...currentNames, 'NotebookOutlined'].sort());
    expect(
      outlineIconRegistry.every(
        ({ Component, exportName }) =>
          (PackageApi as Record<string, unknown>)[exportName] === Component &&
          Component.displayName === exportName,
      ),
    ).toBe(true);
  });

  it('uses complete Figma names as registry names without changing public exports', () => {
    expect(
      outlineIconRegistry.map(({ Component: _Component, name, ...metadata }) => ({
        ...metadata,
        name,
      })),
    ).toEqual(
      outlineIconNameCatalog.map((entry) => ({
        ...entry,
        name: entry.figmaName ?? entry.exportName,
      })),
    );

    expect(
      outlineIconRegistry.find(({ exportName }) => exportName === 'SpeechToText2Outlined'),
    ).toMatchObject({
      exportName: 'SpeechToText2Outlined',
      figmaName: 'Outline/Speech-to-text2',
      name: 'Outline/Speech-to-text2',
      sourceStatus: 'current',
    });
    expect(
      outlineIconRegistry.find(({ exportName }) => exportName === 'CommandOutlined'),
    ).toMatchObject({
      exportName: 'CommandOutlined',
      figmaName: null,
      name: 'CommandOutlined',
      sourceStatus: 'unnamed-in-figma',
    });
    expect(
      outlineIconRegistry.find(({ exportName }) => exportName === 'NotebookOutlined'),
    ).toMatchObject({
      exportName: 'NotebookOutlined',
      figmaName: null,
      name: 'NotebookOutlined',
      sourceStatus: 'legacy-non-current-figma',
    });
  });

  it('renders every Outline export with its frozen public default color', () => {
    const container = renderRegistry();
    const svgs = [...container.querySelectorAll<SVGSVGElement>('svg')];

    expect(svgs).toHaveLength(342);
    for (const svg of svgs) {
      expect(getComputedStyle(svg).color).toBe(expectedDefaultColor(svg.dataset.iconName ?? ''));
    }
  });

  it('applies an explicit color prop to every Outline export', () => {
    const container = renderRegistry({ color: '#123456' });

    for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
      expect(getComputedStyle(svg).color).toBe('rgb(18, 52, 86)');
    }
  });

  it('keeps style.color precedence over the color prop for every Outline export', () => {
    const container = renderRegistry({ color: '#123456', style: { color: '#654321' } });

    for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
      expect(getComputedStyle(svg).color).toBe('rgb(101, 67, 33)');
    }
  });

  it('inherits parent color only when every Outline export receives color="inherit"', () => {
    const container = render(
      <div style={{ color: '#2468ac' }}>
        {outlineIconRegistry.map(({ Component, exportName }) => (
          <Component color="inherit" data-icon-name={exportName} key={exportName} />
        ))}
      </div>,
    );

    for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
      expect(getComputedStyle(svg).color).toBe('rgb(36, 104, 172)');
    }
  });

  it('inherits parent color when every Outline export receives style.color="inherit"', () => {
    const container = render(
      <div style={{ color: '#2468ac' }}>
        {outlineIconRegistry.map(({ Component, exportName }) => (
          <Component data-icon-name={exportName} key={exportName} style={{ color: 'inherit' }} />
        ))}
      </div>,
    );

    for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
      expect(getComputedStyle(svg).color).toBe('rgb(36, 104, 172)');
    }
  });
});

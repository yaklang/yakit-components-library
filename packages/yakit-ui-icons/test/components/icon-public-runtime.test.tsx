import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import * as PackageApi from '../../src';
import { DEFAULT_ICON_COLOR } from '../../src/createIcon';
import { outlineIconNameCatalog } from '../../src/figmaNameCatalog';
import { outlineIconRegistry } from '../../src/registry';
import { outline as outlineSource } from '../helpers/sources';
import { iconCounts } from '../icons/icon-inventory';

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
const expectedDefaultToken = (name: string) =>
  name === 'EarOutlined' || name === 'SunOutlined' ? '#0A0A0A' : DEFAULT_ICON_COLOR;
const notebookGroupExports = [
  'NotebookOutlined',
  'Notebook2Outlined',
  'RotateCcwOutlined',
  'FeatherOutlined',
  'HardDriveDownloadOutlined',
  'RotateCcwSquareOutlined',
  'BookMarkedOutlined',
  'BookMarked2Outlined',
  'TimerOutlined',
] as const;

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount());
  document.body.replaceChildren();
});

describe('Outline public component API', () => {
  it('exposes every inventoried current Figma icon from the package root', () => {
    const currentNames = outlineSource.records.map(({ exportName }) => exportName).sort();
    const registryNames = outlineIconRegistry.map(({ exportName }) => exportName).sort();

    expect(currentNames).toHaveLength(iconCounts.outline);
    expect(currentNames).toContain('LandPlotOutlined');
    expect(currentNames).toEqual(expect.arrayContaining([...notebookGroupExports]));
    expect(registryNames).toEqual(currentNames);
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
      figmaName: 'Outline/Command',
      name: 'Outline/Command',
      sourceStatus: 'current',
    });
    expect(
      outlineIconRegistry.find(({ exportName }) => exportName === 'NotebookOutlined'),
    ).toMatchObject({
      exportName: 'NotebookOutlined',
      figmaName: 'Outline/Notebook',
      name: 'Outline/Notebook',
      sourceStatus: 'current',
    });
  });

  it('renders every Outline export with its frozen public default color', () => {
    const container = renderRegistry();
    const svgs = [...container.querySelectorAll<SVGSVGElement>('svg')];

    expect(svgs).toHaveLength(iconCounts.outline);
    for (const svg of svgs) {
      const root = svg.parentElement as HTMLSpanElement;
      const name = root.dataset.iconName ?? '';
      expect(getComputedStyle(svg).color).toBe(expectedDefaultColor(name));
      expect(svg.style.color).toBe('');
      expect(root.style.getPropertyValue('--yakit-icon-default-color')).toBe(
        expectedDefaultToken(name),
      );
    }
  });

  it('lets consumers override the shared Figma token on a local container', () => {
    const container = renderRegistry();
    container.style.setProperty('--Colors-Use-Neutral-Text-1-Title', '#2468ac');

    for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
      const name = (svg.parentElement as HTMLSpanElement).dataset.iconName ?? '';
      expect(getComputedStyle(svg).color).toBe(
        name === 'EarOutlined' || name === 'SunOutlined' ? 'rgb(10, 10, 10)' : 'rgb(36, 104, 172)',
      );
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

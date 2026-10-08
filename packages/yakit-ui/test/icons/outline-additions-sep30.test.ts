import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import * as Icons from '../../src/icons';
import { outlineIconRegistry } from '../../src/icons/registry';
import additions from '../fixtures/icons/reference/outline-additions-sep30.json';

describe('September 30 outline additions', () => {
  it('includes the newly discovered Figma component', () => {
    expect(additions.updates.map(({ exportName }) => exportName)).toEqual([
      'ArrowUpToLineOutlined',
    ]);
  });

  it.each(additions.updates)('preserves Figma geometry and metadata for $exportName', (icon) => {
    const source = readFileSync(resolve('src/icons/outline', icon.file), 'utf8');
    expect(source).toBe(
      icon.svg
        .replaceAll('#353639', 'currentColor')
        .replaceAll('stroke-width="2"', 'stroke-width="1"'),
    );
    const entry = outlineIconRegistry.find(({ sourceNodeId }) => sourceNodeId === icon.nodeId);
    expect(entry).toMatchObject({
      exportName: icon.exportName,
      figmaName: icon.figmaName,
      sourceStatus: 'current',
      Component: Icons[icon.exportName as keyof typeof Icons],
    });
    expect(source).toContain('viewBox="0 0 24 24"');
  });

  it.each(additions.updates)('supports public SVG stroke overrides for $exportName', (icon) => {
    const Component = Icons[icon.exportName as keyof typeof Icons];
    for (const strokeWidth of [undefined, 0, 1.5, 2, 3]) {
      const markup = renderToStaticMarkup(createElement(Component, { svgProps: { strokeWidth } }));
      const widths = [...markup.matchAll(/stroke-width="([^"]*)"/g)].map((match) => match[1]);
      expect(widths.length).toBeGreaterThan(0);
      expect(new Set(widths)).toEqual(new Set([String(strokeWidth ?? 1)]));
      expect(markup).toContain('stroke="currentColor"');
    }
  });
});
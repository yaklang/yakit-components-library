import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import colorfulSource from '../../config/icon-sources/colorful.json';
import solidSource from '../../config/icon-sources/solid.json';
import { readIconInputSync } from '../../scripts/icon-source-documents.mjs';
import * as Icons from '../../src';
import * as OldIcons from '../../src/oldicon';

import { iconCounts, iconExports } from './icon-inventory';

describe('family-specific server rendered stroke widths without CSS', () => {
  it('normalizes only Outline and preserves other SVG source widths', () => {
    const oldManifest = JSON.parse(
      readIconInputSync(
        new URL('../../config/icon-sources/oldicon.json#manifest', import.meta.url),
        'utf8',
      ),
    );
    const icons = [...Object.entries(Icons), ...Object.entries(OldIcons)];
    expect(icons).toHaveLength(iconCounts.all);
    expect(icons.map(([name]) => name).sort()).toEqual([...iconExports.all].sort());
    for (const [name, Icon] of icons) {
      const markup = renderToStaticMarkup(createElement(Icon, { 'aria-label': name }));
      expect(markup, name).toContain('<svg');
      const solid = solidSource.records.find((record) => record.exportName === name);
      if (solid) {
        const widths = (svg: string) =>
          [...svg.matchAll(/stroke-width="([^"]+)"/g)].map((m) => m[1]);
        expect(widths(markup), name).toEqual(widths(solid.raw.svg));
        continue;
      }
      if (!iconExports.outline.includes(name)) {
        if (name === 'Loading') continue;
        const colorful = colorfulSource.records.find((r) => r.exportName === name);
        const old = oldManifest.exports.find((r: { exportName: string }) => r.exportName === name);
        const file = colorful?.localFile ?? (old ? `oldicon/${old.assetFile}` : undefined);
        expect(file, name).toBeDefined();
        const source = readFileSync(resolve(import.meta.dirname, '../../src', file!), 'utf8');
        const widths = (svg: string) =>
          [...svg.matchAll(/stroke-width="([^"]+)"/g)].map((m) => m[1]);
        expect(widths(markup), name).toEqual(widths(source));
        continue;
      }
      for (const match of markup.matchAll(/stroke-width="([^"]+)"/g))
        expect(match[1], name).toBe('1.5');
    }
  });
});

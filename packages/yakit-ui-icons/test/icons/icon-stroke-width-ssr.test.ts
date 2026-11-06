import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import solidSource from '../../config/icon-sources/solid.json';
import * as Icons from '../../src';
import * as OldIcons from '../../src/oldicon';

import { iconCounts, iconExports } from './icon-inventory';

describe('family-specific server rendered stroke widths without CSS', () => {
  it('preserves Solid source widths and normalizes other families', () => {
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
      for (const match of markup.matchAll(/stroke-width="([^"]+)"/g))
        expect(match[1], name).toBe('1.5');
    }
  });
});

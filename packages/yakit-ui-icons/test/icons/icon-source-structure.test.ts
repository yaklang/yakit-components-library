import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import outline from '../../config/icon-sources/outline.json';
import solid from '../../config/icon-sources/solid.json';
import { parseSvg } from '../../scripts/audit-icons.mjs';

import {
  expectCurrentFigmaSource,
  importedMonochromeSources,
  svgStructure,
} from './helpers/current-figma-source';

describe('imported Figma SVG structure', () => {
  it.each([outline, solid])('$family checks every registered icon', (source) => {
    for (const record of source.records) {
      const local = readFileSync(
        new URL(`../../src/${source.family}/${record.file}`, import.meta.url),
        'utf8',
      );
      expect(svgStructure(parseSvg(local)), record.exportName).toEqual(
        svgStructure(parseSvg(record.raw.svg)),
      );
    }
  });
  it.each(importedMonochromeSources)('$name preserves source tags and nesting', (source) => {
    const svg = readFileSync(
      new URL(`../../src/${source.family}/${source.file}`, import.meta.url),
      'utf8',
    );
    expectCurrentFigmaSource(source, svg);
  });

  it('BookOpenText contains one path directly under the SVG', () => {
    const svg = readFileSync(new URL('../../src/outline/39320-7452.svg', import.meta.url), 'utf8');
    expect(svg).not.toMatch(/<g\b/);
    expect(svg.match(/<path\b/g)).toHaveLength(1);
  });
});

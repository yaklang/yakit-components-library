import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import outline from '../../config/icon-sources/outline.json';
import solid from '../../config/icon-sources/solid.json';
import { parseIconIndexMapping } from '../../scripts/icon-name-catalog-core.mjs';
import { figmaIconNameCatalog } from '../../src/figmaNameCatalog';

describe('current English Figma icon names', () => {
  it.each([outline, solid])('$family maps every source to its public export', (source) => {
    const mapping = parseIconIndexMapping(
      readFileSync(new URL(`../../src/${source.family}/index.tsx`, import.meta.url), 'utf8'),
    );
    for (const row of source.records) {
      expect(mapping.get(row.exportName)?.sourceNodeId).toBe(row.nodeId);
      expect(
        figmaIconNameCatalog.find(
          ({ sourceNodeId, family }) => sourceNodeId === row.nodeId && family === source.family,
        ),
      ).toMatchObject({ exportName: row.exportName, figmaName: row.name.trim() });
      expect(row.exportName).toMatch(/^[A-Za-z][A-Za-z0-9]*(Outlined|Solid)$/);
    }
    expect(mapping.size).toBe(source.records.length);
  });
});

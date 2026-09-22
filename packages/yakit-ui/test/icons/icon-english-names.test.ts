import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseIconIndexMapping } from '../../scripts/icon-name-catalog-core.mjs';
import { figmaIconNameCatalog } from '../../src/icons/figmaNameCatalog';
import migration from '../fixtures/icons/english-name-migration.json';

describe('English Figma icon names', () => {
  it('uses the verified English names for all 32 formerly Chinese icons', () => {
    expect(migration.rows).toHaveLength(32);
    for (const row of migration.rows) {
      expect(
        figmaIconNameCatalog.find(({ sourceNodeId }) => sourceNodeId === row.sourceNodeId),
      ).toMatchObject({
        exportName: row.exportName,
        figmaName: row.figmaName,
        family: row.family,
      });
    }
    expect(
      figmaIconNameCatalog.every(({ figmaName }) => !/\p{Script=Han}/u.test(figmaName ?? '')),
    ).toBe(true);
    expect(
      figmaIconNameCatalog.every(
        ({ exportName }) => !/FigmaIcon\d+|MinusFigma\d+/.test(exportName),
      ),
    ).toBe(true);
  });

  it.each(['outline', 'solid'])('preserves the SVG source of each renamed %s export', (family) => {
    const source = readFileSync(
      new URL(`../../src/icons/${family}/index.tsx`, import.meta.url),
      'utf8',
    );
    const mapping = parseIconIndexMapping(source);
    for (const row of migration.rows.filter((entry) => entry.family === family)) {
      expect(mapping.get(row.exportName)?.sourceNodeId).toBe(row.sourceNodeId);
      expect(mapping.has(row.previousExportName)).toBe(false);
    }
  });
});

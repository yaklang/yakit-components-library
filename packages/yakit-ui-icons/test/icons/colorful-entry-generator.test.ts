import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  renderColorfulBarrel,
  renderColorfulCatalog,
  runColorfulEntryGenerator,
} from '../../scripts/colorful-entry-generator.mjs';

const inventory = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../fixtures/icons/colorful/contract-sample.json'),
    'utf8',
  ),
);

describe('colorful public entry generator', () => {
  it('rejects the retired standalone write command before reading or writing files', async () => {
    await expect(
      runColorfulEntryGenerator(['--write', '--manifest', 'missing.json']),
    ).rejects.toThrow(/COLORFUL_ENTRY_WRITE_RETIRED/);
  });
  it('imports canonical assets once and emits aliases without duplicate SVGs', () => {
    const output = renderColorfulBarrel(inventory);
    expect(output.match(/\.svg\?react/g)).toHaveLength(1);
    expect(output).toContain("import YakitPrimaryMenuColorfulSvg from './37373-59879.svg?react';");
    expect(output).toContain(
      "export const YakitMenuColorful = createIcon(\n  YakitPrimaryMenuColorfulSvg,\n  'YakitMenuColorful',\n);",
    );
  });

  it('emits required colorful-only registry metadata for canonical and alias rows', () => {
    const output = renderColorfulCatalog(inventory);
    expect(output.match(/family: 'colorful'/g)).toHaveLength(3);
    expect(output.match(/category: 'primary-function-menu'/g)).toHaveLength(2);
    expect(output.match(/paintMode: 'literal'/g)).toHaveLength(2);
    expect(output).toContain('export const colorfulIconNameCatalog = [');
  });
});

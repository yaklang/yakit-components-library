import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  COLORFUL_SCHEMA_VERSION,
  validateColorfulInventory,
  validateColorfulRow,
} from '../../scripts/colorful-icon-contracts.mjs';
import { classifyColorfulDuplicates } from '../../scripts/colorful-inventory-merge.mjs';

const sample = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../fixtures/icons/colorful/contract-sample.json'),
    'utf8',
  ),
);

const penetraXBackgroundPath =
  'M0 16C0 7.16344 7.16344 0 16 0V0C24.8366 0 32 7.16344 32 16V16C32 24.8366 24.8366 32 16 32V32C7.16344 32 0 24.8366 0 16V16Z';
const yakitBackgroundPath =
  'M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32Z';
const yakitVerticalBackgroundPath =
  'M12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24Z';

const logNodeBackgroundColors = {
  BugLogColorful: '#F15757',
  ChartLogColorful: '#8862F8',
  CommentLogColorful: '#EEF0F3',
  CreatedLogColorful: '#EEF0F3',
  DeletedLogColorful: '#EEF0F3',
  ErrorLogColorful: '#F15757',
  FileFailedLogColorful: '#F15757',
  FileLogColorful: '#EEF0F3',
  FolderFailedLogColorful: '#F15757',
  FolderLogColorful: '#EEF0F3',
  InfoLogColorful: '#EEF0F3',
  MarkdownLogColorful: '#4493FF',
  ModifiedLogColorful: '#EEF0F3',
  RestoredLogColorful: '#EEF0F3',
  ReviewApprovedLogColorful: '#28C08E',
  ReviewRejectedLogColorful: '#F15757',
  SuccessLogColorful: '#28C08E',
  TextOutputLogColorful: '#353639',
  WarningLogColorful: '#F6A823',
} as const;

const readColorfulIcon = (name: string) =>
  readFileSync(resolve(import.meta.dirname, `../../src/icons/colorful/${name}.svg`), 'utf8');

describe('colorful inventory contracts', () => {
  it('validates the independent disposition and exposure axes', () => {
    const summary = validateColorfulInventory(sample, {
      expectedGroupCount: 1,
      expectedRowCount: 2,
    });
    expect(COLORFUL_SCHEMA_VERSION).toBe('colorful-inventory-v1');
    expect(summary.colorfulCanonicalAssetCount).toBe(1);
    expect(summary.colorfulPublicExportCount).toBe(2);
    expect(summary.rowDispositionCounts).toEqual({
      'canonical-new': 1,
      'duplicate-colorful': 1,
      excluded: 0,
      'reuse-existing': 0,
    });
  });

  it('rejects every unapproved state pair', () => {
    expect(() =>
      validateColorfulRow({
        ...sample.rows[0],
        publicExposure: 'provenance-only',
      }),
    ).toThrow(/ROW_EXPOSURE_STATE_INVALID/);
  });

  it('does not let provenance-only rows accidentally create public API', () => {
    expect(() =>
      validateColorfulRow({
        ...sample.rows[1],
        exportName: 'UnexpectedColorful',
        publicExposure: 'provenance-only',
      }),
    ).toThrow(/must not declare exportName/);
  });

  it('rejects categories outside the frozen 16-group vocabulary', () => {
    expect(() => validateColorfulRow({ ...sample.rows[0], category: 'logo' })).toThrow(
      /unknown category/,
    );
  });

  it('classifies structurally identical assets as semantic aliases', async () => {
    const first = {
      ...sample.rows[0],
      componentNodeId: '1:1',
      exportName: 'FirstColorful',
      localFile: 'colorful/first.svg',
      rowId: '1:100/1:1',
    };
    const second = {
      ...sample.rows[0],
      componentNodeId: '1:2',
      exportName: 'SecondColorful',
      localFile: 'colorful/second.svg',
      rowId: '1:100/1:2',
    };
    const sources = new Map([
      ['colorful/first.svg', '<svg><defs><clipPath id="icon_11__clip_0" /></defs></svg>'],
      ['colorful/second.svg', '<svg>\n<defs><clipPath id="icon_12__clip_0" /></defs>\n</svg>'],
    ]);
    const rows = await classifyColorfulDuplicates(
      [first, second],
      async (localFile) => sources.get(localFile) ?? '',
    );

    expect(rows[0]).toMatchObject({ publicExposure: 'canonical' });
    expect(rows[1]).toMatchObject({
      canonicalComponentNodeId: '1:1',
      publicExposure: 'semantic-alias',
      rowDisposition: 'duplicate-colorful',
    });
    expect(rows[1]).not.toHaveProperty('localFile');
    expect(rows[1]).not.toHaveProperty('paintMode');
  });

  it('preserves the Figma blue backgrounds and foreground geometry for PenetraX', () => {
    const justIcon = readColorfulIcon('PenetraXLogoWithBackgroundColorful');
    const vertical = readColorfulIcon('PenetraXLogoVerticalWithBackgroundColorful');

    expect(justIcon).toContain(`<path d="${penetraXBackgroundPath}" fill="#084DB2"/>`);
    expect(vertical).toContain(
      `<g transform="translate(10 5) scale(0.75)">\n<path d="${penetraXBackgroundPath}" fill="#084DB2"/>`,
    );
    expect(vertical).toContain('<g transform="translate(15.24985 8.75)">');
    expect(vertical).not.toContain('scale(0.5453555609875337 0.5454999999999998)');
  });

  it('preserves the composed Yakit and Memfit background-logo geometry', () => {
    const yakitHorizontal = readColorfulIcon('YakitLogoHorizontalWithBackgroundColorful');
    const yakitVertical = readColorfulIcon('YakitLogoVerticalWithBackgroundColorful');
    const memfitJustIcon = readColorfulIcon('MemfitLogoWithBackgroundColorful');
    const memfitVertical = readColorfulIcon('MemfitLogoVerticalWithBackgroundColorful');

    expect(
      yakitHorizontal.match(
        new RegExp(`<path\\s+d="${yakitBackgroundPath}"\\s+fill="#F28C45"/>`, 'g'),
      ),
    ).toHaveLength(1);
    expect(yakitHorizontal).not.toContain('scale(2.75 1)');
    expect(yakitHorizontal).not.toContain('scale(2.0625 0.7498000133333335)');

    expect(
      yakitVertical.match(
        new RegExp(`<path\\s+d="${yakitVerticalBackgroundPath}"\\s+fill="#F28C45"/>`, 'g'),
      ),
    ).toHaveLength(1);
    expect(yakitVertical).not.toContain('scale(1.375 1.375)');
    expect(yakitVertical).not.toContain('scale(1.03125 1.030975018333333)');

    expect(memfitJustIcon).toContain('<circle cx="16" cy="16" r="16" fill="#4373BB"/>');
    expect(memfitVertical).toContain('<circle cx="22" cy="17" r="12" fill="#4373BB"/>');
    expect(memfitVertical).toContain('<g transform="translate(15.24985 8.75)">');
    expect(memfitVertical).not.toContain('scale(0.49578641290410536 0.42137627599930644)');
  });

  it('preserves every 24px log-node parent background from Figma', () => {
    for (const [exportName, color] of Object.entries(logNodeBackgroundColors)) {
      expect(readColorfulIcon(exportName), exportName).toContain(
        `<circle cx="12" cy="12" r="12" fill="${color}"/>`,
      );
    }
  });
});

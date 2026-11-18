import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  COLORFUL_SCHEMA_VERSION,
  classifyColorfulDuplicates,
  validateColorfulInventory,
  validateColorfulRow,
} from '../../scripts/colorful-icon-contracts.mjs';
import { colorful as colorfulSource } from '../helpers/sources';

const sample = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, '../fixtures/icons/colorful/contract-sample.json'),
    'utf8',
  ),
);

const penetraXBackgroundPath =
  'M0 16C0 7.16344 7.16344 0 16 0V0C24.8366 0 32 7.16344 32 16V16C32 24.8366 24.8366 32 16 32V32C7.16344 32 0 24.8366 0 16V16Z';
const verticalBackgroundPath =
  'M10 17C10 10.3726 15.3726 5 22 5V5C28.6274 5 34 10.3726 34 17V17C34 23.6274 28.6274 29 22 29V29C15.3726 29 10 23.6274 10 17V17Z';
const yakitBackgroundPath =
  'M19 32C27.8366 32 35 24.8366 35 16C35 7.16344 27.8366 0 19 0C10.1634 0 3 7.16344 3 16C3 24.8366 10.1634 32 19 32Z';
const yakitVerticalBackgroundPath =
  'M22 28C28.6274 28 34 22.6274 34 16C34 9.37258 28.6274 4 22 4C15.3726 4 10 9.37258 10 16C10 22.6274 15.3726 28 22 28Z';

const logNodeBackgroundColors = {
  BugLogColorful: 'var(--Colors-Use-Error-Primary, #F15757)',
  ChartLogColorful: 'var(--Colors-Use-Purple-Primary, #8862F8)',
  CommentLogColorful: 'var(--Colors-Use-Neutral-Bg-Hover, #EEF0F3)',
  CreatedLogColorful: 'var(--Colors-Use-Neutral-Bg-Hover, #EEF0F3)',
  DeletedLogColorful: 'var(--Colors-Use-Neutral-Bg-Hover, #EEF0F3)',
  ErrorLogColorful: 'var(--Colors-Use-Error-Primary, #F15757)',
  FileFailedLogColorful: 'var(--Colors-Use-Error-Primary, #F15757)',
  FileLogColorful: 'var(--Colors-Use-Neutral-Bg-Hover, #EEF0F3)',
  FolderFailedLogColorful: 'var(--Colors-Use-Error-Primary, #F15757)',
  FolderLogColorful: 'var(--Colors-Use-Neutral-Bg-Hover, #EEF0F3)',
  InfoLogColorful: 'var(--Colors-Use-Neutral-Bg-Hover, #EEF0F3)',
  MarkdownLogColorful: 'var(--Colors-Use-Blue-Primary, #4493FF)',
  ModifiedLogColorful: 'var(--Colors-Use-Neutral-Bg-Hover, #EEF0F3)',
  RestoredLogColorful: 'var(--Colors-Use-Neutral-Bg-Hover, #EEF0F3)',
  ReviewApprovedLogColorful: 'var(--Colors-Use-Status-Safe, #28C08E)',
  ReviewRejectedLogColorful: 'var(--Colors-Use-Error-Primary, #F15757)',
  SuccessLogColorful: 'var(--Colors-Use-Success-Primary, #28C08E)',
  TextOutputLogColorful: 'var(--Colors-Use-Neutral-Text-1-Title, #353639)',
  WarningLogColorful: 'var(--Colors-Use-Warning-Primary, #F6A823)',
} as const;

const readColorfulIcon = (name: string) => {
  const record = colorfulSource.records.find((row) => row.exportName === name);
  if (!record?.localFile) throw new Error(`Missing Colorful source for ${name}`);
  return readFileSync(resolve(import.meta.dirname, '../../src', record.localFile), 'utf8');
};

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
      [
        'colorful/first.svg',
        '<svg><path stroke="black" stroke-width="2"/><defs><clipPath id="icon_11__clip_0" /></defs></svg>',
      ],
      [
        'colorful/second.svg',
        '<svg>\n<path stroke="black" stroke-width="2"/><defs><clipPath id="icon_12__clip_0" /></defs>\n</svg>',
      ],
    ]);
    const rows = await classifyColorfulDuplicates(
      [first, second],
      async (localFile: string) => sources.get(localFile) ?? '',
    );

    expect(rows[0]).toMatchObject({ publicExposure: 'canonical' });
    expect(rows[1]).toMatchObject({
      canonicalComponentNodeId: '1:1',
      publicExposure: 'semantic-alias',
      rowDisposition: 'duplicate-colorful',
    });
    expect(rows[1]).not.toHaveProperty('localFile');
    expect(rows[1]).not.toHaveProperty('paintMode');
    sources.set(
      'colorful/second.svg',
      sources.get('colorful/second.svg')!.replace('stroke-width="2"', 'stroke-width="3"'),
    );
    const differentWidths = await classifyColorfulDuplicates(
      [first, second],
      async (file: string) => sources.get(file) ?? '',
    );
    expect(differentWidths.map((row) => row.publicExposure)).toEqual(['canonical', 'canonical']);
  });

  it('preserves the Figma blue backgrounds and foreground geometry for PenetraX', () => {
    const justIcon = readColorfulIcon('PenetraXLogoWithBackgroundColorful');
    const vertical = readColorfulIcon('PenetraXLogoVerticalWithBackgroundColorful');

    expect(justIcon).toContain(`<path d="${penetraXBackgroundPath}" fill="#084DB2"/>`);
    expect(vertical).toContain(`<path d="${verticalBackgroundPath}" fill="#084DB2"/>`);
    expect(vertical).toContain(
      'M22.4576 17.1223L21.9879 17.2175L22.4589 15.0475L22.1017 14.7008L21.0924 15.442L21.076 17.4025L20.4142 17.5368L19.4913 25.1679L22.4576 17.1223Z',
    );
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

    expect(memfitJustIcon).toContain(`<path d="${penetraXBackgroundPath}" fill="#4373BB"/>`);
    expect(memfitVertical).toContain(`<path d="${verticalBackgroundPath}" fill="#4373BB"/>`);
    expect(memfitVertical).toContain('M16.6565 15.1732H15.2539V22.3382H16.6565V15.1732Z');
    expect(memfitVertical).not.toContain('scale(0.49578641290410536 0.42137627599930644)');
  });

  it('preserves every 24px log-node parent background from Figma', () => {
    for (const [exportName, color] of Object.entries(logNodeBackgroundColors)) {
      expect(readColorfulIcon(exportName), exportName).toContain(
        `<rect width="24" height="24" rx="12" fill="${color}"/>`,
      );
    }
  });
});

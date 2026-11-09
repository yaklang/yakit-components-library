import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { auditColorfulInputs, canonicalJson } from '../../scripts/colorful-audit.mjs';
import { ICON_STROKE_WIDTH } from '../../scripts/icon-audit-contracts.mjs';

const fixtureRoot = resolve(import.meta.dirname, '../fixtures/icons/colorful');
const inventory = JSON.parse(readFileSync(resolve(fixtureRoot, 'contract-sample.json'), 'utf8'));
const canonicalOnlyInventory = {
  ...inventory,
  rows: inventory.rows.slice(0, 1),
};
const sources = [
  {
    path: 'colorful/37373-59879.svg',
    svg: readFileSync(resolve(fixtureRoot, 'sources/colorful/37373-59879.svg'), 'utf8'),
  },
];

describe('colorful offline audit', () => {
  it('is deterministic and accepts exact token-with-hex fallback paint', () => {
    const first = auditColorfulInputs(
      { inventory: canonicalOnlyInventory, sources },
      { expectedGroupCount: 1, expectedRowCount: 1 },
    );
    const second = auditColorfulInputs(
      { inventory: canonicalOnlyInventory, sources },
      { expectedGroupCount: 1, expectedRowCount: 1 },
    );
    expect(canonicalJson(second)).toBe(canonicalJson(first));
    expect(first).toMatchObject({
      colorfulCanonicalAssetCount: 1,
      colorfulPublicExportCount: 1,
      fragmentBaseCount: 0,
      fragmentFileCount: 1,
    });
  });

  it('fails closed on missing, undeclared, and unsupported sources', () => {
    expect(() =>
      auditColorfulInputs(
        { inventory: canonicalOnlyInventory, sources: [] },
        { expectedGroupCount: 1, expectedRowCount: 1 },
      ),
    ).toThrow(/CANONICAL_SOURCE_MISSING/);
    expect(() =>
      auditColorfulInputs(
        {
          inventory: canonicalOnlyInventory,
          sources: [...sources, { path: 'colorful/extra.svg', svg: '<svg />' }],
        },
        { expectedGroupCount: 1, expectedRowCount: 1 },
      ),
    ).toThrow(/CANONICAL_SOURCE_UNDECLARED/);
    expect(() =>
      auditColorfulInputs(
        {
          inventory: canonicalOnlyInventory,
          sources: [
            {
              ...sources[0],
              svg: '<svg preserveAspectRatio="xMidYMid meet"><path fill="not-a-color" /></svg>',
            },
          ],
        },
        { expectedGroupCount: 1, expectedRowCount: 1 },
      ),
    ).toThrow(/COLOR_FORMAT_UNSUPPORTED/);
    expect(() =>
      auditColorfulInputs(
        {
          inventory: canonicalOnlyInventory,
          sources: [
            {
              ...sources[0],
              svg: '<svg width="24" height="24" preserveAspectRatio="none"><svg preserveAspectRatio="xMidYMid meet" /></svg>',
            },
          ],
        },
        { expectedGroupCount: 1, expectedRowCount: 1 },
      ),
    ).toThrow(/PRESERVE_ASPECT_RATIO_INVALID/);
    expect(() =>
      auditColorfulInputs(
        {
          inventory: canonicalOnlyInventory,
          sources: [
            {
              ...sources[0],
              svg: '<svg width="24" height="24" preserveAspectRatio="xMidYMid meet"><g></svg>',
            },
          ],
        },
        { expectedGroupCount: 1, expectedRowCount: 1 },
      ),
    ).toThrow(/SVG_STRUCTURE_INVALID/);
  });

  it('preserves attribute and inline-style stroke widths without a uniform policy', () => {
    const svg = (attribute: string) =>
      `<svg width="24" height="24" preserveAspectRatio="xMidYMid meet"><path d="M0 0L1 1" stroke="#000000" ${attribute}/></svg>`;
    const audit = (sourceSvg: string) =>
      auditColorfulInputs(
        { inventory: canonicalOnlyInventory, sources: [{ ...sources[0], svg: sourceSvg }] },
        { expectedGroupCount: 1, expectedRowCount: 1 },
      );

    for (const width of ['1', '2']) {
      expect(() => audit(svg(`stroke-width="${width}"`))).not.toThrow();
      expect(() => audit(svg(`style="stroke-width: ${width}"`))).not.toThrow();
    }
    expect(() => audit(svg(`stroke-width="${ICON_STROKE_WIDTH}"`))).not.toThrow();
    expect(() => audit(svg(`style="stroke-width: ${ICON_STROKE_WIDTH}"`))).not.toThrow();
  });

  it('accepts only pinned tokens whose light and dark values equal the Figma fallback', () => {
    const tokenCatalog = [
      { dark: '#FFFFFF', light: '#FFFFFF', name: '--fixed-white' },
      { dark: '#DB752E', light: '#F28C45', name: '--theme-orange' },
    ];
    const svg = (paint: string) =>
      `<svg width="24" height="24" preserveAspectRatio="xMidYMid meet"><path fill="${paint}" /></svg>`;
    const options = { expectedGroupCount: 1, expectedRowCount: 1, tokenCatalog };

    expect(() =>
      auditColorfulInputs(
        {
          inventory: canonicalOnlyInventory,
          sources: [{ ...sources[0], svg: svg('var(--fixed-white, #FFFFFF)') }],
        },
        options,
      ),
    ).not.toThrow();
    expect(() =>
      auditColorfulInputs(
        {
          inventory: canonicalOnlyInventory,
          sources: [{ ...sources[0], svg: svg('var(--missing, #FFFFFF)') }],
        },
        options,
      ),
    ).toThrow(/COLOR_TOKEN_UNKNOWN/);
    expect(() =>
      auditColorfulInputs(
        {
          inventory: canonicalOnlyInventory,
          sources: [{ ...sources[0], svg: svg('var(--theme-orange, #F28C45)') }],
        },
        options,
      ),
    ).toThrow(/COLOR_TOKEN_FALLBACK_MISMATCH/);
  });

  it('allows a theme-changing token only with matching Figma binding evidence', () => {
    const binding = {
      token: '--theme-orange',
      fallbackHex: '#F28C45',
      figmaVariableId: 'VariableID:34624:51344',
      sourceNodeIds: ['44683:1983'],
    };
    const audit = (bindings: object[], fallback = '#F28C45') =>
      auditColorfulInputs(
        {
          inventory: {
            ...canonicalOnlyInventory,
            rows: [{ ...canonicalOnlyInventory.rows[0], themePaintBindings: bindings }],
          },
          sources: [
            {
              ...sources[0],
              svg: `<svg width="24" height="24" preserveAspectRatio="xMidYMid meet"><path d="M0 0L1 1" fill="var(--theme-orange, ${fallback})"/></svg>`,
            },
          ],
        },
        {
          expectedGroupCount: 1,
          expectedRowCount: 1,
          tokenCatalog: [{ name: '--theme-orange', light: '#F28C45', dark: '#DB752E' }],
        },
      );
    expect(() => audit([binding])).not.toThrow();
    expect(() => audit([])).toThrow(/COLOR_TOKEN_FALLBACK_MISMATCH/);
    expect(() => audit([{ ...binding, sourceNodeIds: [] }])).toThrow(
      /COLOR_TOKEN_FALLBACK_MISMATCH/,
    );
    expect(() => audit([{ ...binding, token: '--other' }])).toThrow(
      /COLOR_TOKEN_FALLBACK_MISMATCH/,
    );
    expect(() => audit([binding], '#FFFFFF')).toThrow(/COLOR_TOKEN_FALLBACK_MISMATCH/);
  });

  it('fails closed on invalid or non-finite path data', () => {
    const svg = (data: string) =>
      `<svg width="24" height="24" preserveAspectRatio="xMidYMid meet"><path d="${data}" /></svg>`;
    const auditSvg = (sourceSvg: string) =>
      auditColorfulInputs(
        { inventory: canonicalOnlyInventory, sources: [{ ...sources[0], svg: sourceSvg }] },
        { expectedGroupCount: 1, expectedRowCount: 1 },
      );
    const audit = (data: string) => auditSvg(svg(data));

    for (const invalid of [
      'M0 0L-nan -nanZ',
      'M0 0L-nan\n-nanZ',
      'M0 0LInfinity 1Z',
      'M0 0L-Infinity 1Z',
      'M0 0L1e9999 1Z',
      'M0 0L--1 2Z',
      'M0 0L. 2Z',
      'M0 0L1e 2Z',
      'L1 2',
      '0 0L1 2',
      'M0 0L1,Z',
      'M0 0L1 2 3Z',
      'M0 0Z1 2',
      'M0,,0Z',
      'M0 0A1 1 0 2 0 3 4Z',
    ])
      expect(() => audit(invalid), invalid).toThrow(/SVG_PATH_DATA_INVALID/);

    for (const valid of ['M.5,1e-2L2-3Z', 'M0 0 1 1L2 3 4 5Z', 'M0 0A1 1 0 1 0 3 4Z'])
      expect(() => audit(valid), valid).not.toThrow();

    for (const attributes of [
      'data-d="M0 0" d="M0 0L-nan -nanZ"',
      'd="M0 0" d="M0 0L-nan -nanZ"',
      'd="M0 0L-nan > -nanZ"',
      'data-note=">" d="M0 0L-nan -nanZ"',
    ])
      expect(() =>
        auditSvg(
          `<svg width="24" height="24" preserveAspectRatio="xMidYMid meet"><path ${attributes}></path></svg>`,
        ),
      ).toThrow(/SVG_PATH_DATA_INVALID/);
  });
});

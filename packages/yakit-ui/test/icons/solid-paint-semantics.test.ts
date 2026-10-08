import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  auditIcons,
  collectPaintSemantics,
  paintSemanticsSha256,
} from '../../scripts/audit-icons.mjs';
import manifest from '../../scripts/figma-solid-icons-inventory.json';
import { ICON_STROKE_WIDTH } from '../../scripts/icon-audit-contracts.mjs';
import raw from '../fixtures/icons/reference/figma-solid-raw-provenance-v1.json';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const solidRoot = resolve(packageRoot, 'src/icons/solid');
const outlineRoot = resolve(packageRoot, 'src/icons/outline');
const files = readdirSync(solidRoot)
  .filter((file) => file.endsWith('.svg'))
  .sort();
const source = (file: string) => readFileSync(resolve(solidRoot, file), 'utf8');
const rawByNodeId = new Map(
  [...raw.components, ...raw.supplementalComponents].map((entry) => [entry.nodeId, entry.svg]),
);
const roles = new Set([
  'primary-currentColor',
  'secondary-literal',
  'foreground-cutout-literal',
  'definition-semantic-literal',
]);

const auditSourceMutation = async (file: string, mutate: (source: string) => string) => {
  const temporaryRoot = mkdtempSync(resolve(tmpdir(), 'yakit-solid-paint-'));
  const iconRoot = resolve(temporaryRoot, 'icons');
  try {
    cpSync(solidRoot, resolve(iconRoot, 'solid'), { recursive: true });
    const target = resolve(iconRoot, 'solid', file);
    writeFileSync(target, mutate(readFileSync(target, 'utf8')));
    const result = await auditIcons({
      figmaRawProvenancePath: resolve(
        packageRoot,
        'test/fixtures/icons/reference/figma-solid-raw-provenance-v1.json',
      ),
      indexPath: resolve(packageRoot, 'src/icons/solid/index.tsx'),
      manifestPath: resolve(packageRoot, 'scripts/figma-solid-icons-inventory.json'),
      placementProvenancePath: resolve(
        packageRoot,
        'test/fixtures/icons/reference/figma-solid-placement-provenance-v1.json',
      ),
      policyId: 'solid-v1',
      root: iconRoot,
    });
    return result.failures.map(({ token }) => token);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

describe('Solid paint semantics', () => {
  it('uses the exact 1.5 stroke-width policy across Outline and Solid sources', () => {
    const roots = [outlineRoot, solidRoot];
    const values = roots.flatMap((root) =>
      readdirSync(root)
        .filter((file) => file.endsWith('.svg'))
        .flatMap((file) => [
          ...readFileSync(resolve(root, file), 'utf8').matchAll(/\bstroke-width=["']([^"']+)["']/g),
        ]),
    );

    // The four refreshed layout glyphs no longer need mask strokes.
    expect(values).toHaveLength(498);
    expect([...new Set(values.map((match) => match[1]))]).toEqual([ICON_STROKE_WIDTH]);
  });

  it('uses currentColor for every primary glyph and removes the legacy literal everywhere', () => {
    expect(files).toHaveLength(256);
    for (const file of files) {
      const svg = source(file);
      const rows = collectPaintSemantics(svg);
      expect(svg, file).not.toMatch(/\b(?:fill|stroke|color)=["']#353639["']/i);
      expect(
        rows.some(({ role, value }) => role === 'primary-currentColor' && value === 'currentColor'),
        file,
      ).toBe(true);
      expect(
        rows.every(({ role }) => roles.has(role)),
        file,
      ).toBe(true);
    }
  });

  it('allows only the reviewed secondary, cutout, and definition literals', () => {
    const exceptional = files.flatMap((file) =>
      collectPaintSemantics(source(file))
        .filter(({ role }) => role !== 'primary-currentColor')
        .map(({ paintAttribute, role, value }) => ({ file, paintAttribute, role, value })),
    );

    expect(exceptional.filter(({ role }) => role === 'secondary-literal')).toEqual([
      {
        file: '37831-7379.svg',
        paintAttribute: 'fill',
        role: 'secondary-literal',
        value: '#9CA3B1',
      },
    ]);
    expect(exceptional.filter(({ role }) => role === 'foreground-cutout-literal')).toEqual([
      {
        file: '16035-380989.svg',
        paintAttribute: 'stroke',
        role: 'foreground-cutout-literal',
        value: 'white',
      },
      {
        file: '37831-7379.svg',
        paintAttribute: 'fill',
        role: 'foreground-cutout-literal',
        value: 'white',
      },
    ]);
    expect(
      exceptional
        .filter(({ role }) => role === 'definition-semantic-literal')
        .map(({ file, value }) => ({ file, value })),
    ).toEqual([
      { file: '1-2967.svg', value: 'white' },
      { file: '22425-254718.svg', value: 'white' },
      { file: '37831-7379.svg', value: 'white' },
      { file: '37831-7379.svg', value: 'white' },
    ]);
  });

  it('preserves the exact special-structure paint contracts', () => {
    expect(source('16035-380989.svg')).toMatch(
      /fill="currentColor" stroke="white" stroke-width="1.5"/,
    );
    expect(source('37831-7379.svg')).toContain('fill="#9CA3B1"');
    expect(source('37831-7379.svg')).toContain('fill="white"');
    for (const file of ['1-2967.svg', '22425-254718.svg']) {
      expect(source(file), file).toMatch(/<(?:clipPath|mask)\b/);
      expect(source(file), file).toMatch(/(?:fill|stroke)="currentColor"/);
    }
  });

  it('freezes independently recomputed Figma and local paint semantics', () => {
    for (const record of [...manifest.symbols, ...manifest.supplementalSources]) {
      const options = { normalizeFigmaPrimary: true, normalizeStrokeWidth: true };
      expect(record.figmaPaintSemanticsSha256, record.nodeId).toBe(
        paintSemanticsSha256(rawByNodeId.get(record.nodeId)!, options),
      );
      expect(record.localPaintSemanticsSha256, record.nodeId).toBe(
        paintSemanticsSha256(source(record.localFile.replace('solid/', '')), options),
      );
      expect(record.figmaPaintSemanticsSha256, record.nodeId).toBe(
        record.localPaintSemanticsSha256,
      );
    }
  });

  it.each([
    ['secondary paint', '37831-7379.svg', (svg: string) => svg.replace('#9CA3B1', '#9CA3B2')],
    [
      'foreground cutout',
      '16035-380989.svg',
      (svg: string) => svg.replace('stroke="white"', 'stroke="black"'),
    ],
    [
      'definition paint',
      '1-2967.svg',
      (svg: string) => svg.replace('fill="white"', 'fill="black"'),
    ],
  ])('rejects mutated %s with a stable paint token', async (_label, file, mutate) => {
    expect(await auditSourceMutation(file, mutate)).toContain('PAINT_SEMANTICS_MISMATCH');
  });

  it('rejects a stroke-width regression with a stable policy token', async () => {
    expect(
      await auditSourceMutation('16035-380989.svg', (svg) =>
        svg.replace('stroke-width="1.5"', 'stroke-width="2"'),
      ),
    ).toContain('STROKE_WIDTH_INVALID');
  });

  it.each([
    ['presentation ID', 'id="Basic Icons"'],
    ['retained unreferenced ID', 'id="icon_1_2539__semantic_0"'],
  ])('rejects an unreferenced %s', async (_label, attribute) => {
    expect(
      await auditSourceMutation('1-2539.svg', (svg) =>
        svg.replace('<path ', `<path ${attribute} `),
      ),
    ).toContain('FRAGMENT_UNUSED_ID');
  });
});

import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  auditIcons,
  collectPaintSemantics,
  paintSemanticsSha256,
} from '../../scripts/audit-icons.mjs';
import { ICON_STROKE_WIDTH } from '../../scripts/icon-audit-contracts.mjs';
import { readIconInputSync } from '../../scripts/icon-source-documents.mjs';

import { iconCounts } from './icon-inventory';

const manifest = JSON.parse(
  readIconInputSync(
    new URL('../../config/icon-sources/solid.json#manifest', import.meta.url),
    'utf8',
  ),
);
const raw = JSON.parse(
  readIconInputSync(new URL('../../config/icon-sources/solid.json#raw', import.meta.url), 'utf8'),
);

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const solidRoot = resolve(packageRoot, 'src/solid');
const outlineRoot = resolve(packageRoot, 'src/outline');
const files = readdirSync(solidRoot)
  .filter((file) => file.endsWith('.svg'))
  .sort();
const source = (file: string) => readIconInputSync(resolve(solidRoot, file), 'utf8');
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
    writeFileSync(target, mutate(readIconInputSync(target, 'utf8')));
    const result = await auditIcons({
      figmaRawProvenancePath: resolve(packageRoot, 'config/icon-sources/solid.json#raw'),
      indexPath: resolve(packageRoot, 'src/solid/index.tsx'),
      manifestPath: resolve(packageRoot, 'config/icon-sources/solid.json#manifest'),
      placementProvenancePath: resolve(packageRoot, 'config/icon-sources/solid.json#placement'),
      policyId: 'solid-v1',
      root: iconRoot,
    });
    return result.failures.map(({ token }) => token);
  } finally {
    rmSync(temporaryRoot, { force: true, recursive: true });
  }
};

describe('Solid paint semantics', () => {
  it('keeps the uniform width policy limited to Outline sources', () => {
    const roots = [outlineRoot];
    const values = roots.flatMap((root) =>
      readdirSync(root)
        .filter((file) => file.endsWith('.svg'))
        .flatMap((file) => [
          ...readIconInputSync(resolve(root, file), 'utf8').matchAll(
            /\bstroke-width=["']([^"']+)["']/g,
          ),
        ]),
    );

    // Coverage is checked against source records; every encountered width must follow the policy.
    expect(values.length).toBeGreaterThan(0);
    expect([...new Set(values.map((match) => match[1]))]).toEqual([ICON_STROKE_WIDTH]);
  });

  it('uses currentColor for every primary glyph and removes the legacy literal everywhere', () => {
    expect(files).toHaveLength(iconCounts.solid);
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

    expect(exceptional.filter(({ role }) => role === 'secondary-literal')).toEqual([]);
    expect(exceptional.filter(({ role }) => role === 'foreground-cutout-literal')).toEqual([]);
    expect(
      exceptional
        .filter(({ role }) => role === 'definition-semantic-literal')
        .map(({ file, value }) => ({ file, value })),
    ).toEqual([
      { file: '1-2967.svg', value: 'white' },
      { file: '22425-254718.svg', value: 'white' },
    ]);
  });

  it('preserves the exact special-structure paint contracts', () => {
    for (const file of ['16035-380989.svg', '37831-7379.svg']) {
      expect(source(file)).not.toMatch(/<(?:mask|clipPath|defs)\b/);
      expect(source(file).match(/fill="currentColor"/g)).toHaveLength(2);
    }
    expect(source('37831-7379.svg')).toContain('opacity="0.5"');
    expect(source('37831-7379.svg')).not.toMatch(/#9CA3B1|fill="white"/);
    for (const file of ['1-2967.svg', '22425-254718.svg']) {
      expect(source(file), file).toMatch(/<(?:clipPath|mask)\b/);
      expect(source(file), file).toMatch(/(?:fill|stroke)="currentColor"/);
    }
  });

  it('freezes independently recomputed Figma and local paint semantics', () => {
    for (const record of [...manifest.symbols, ...manifest.supplementalSources]) {
      const options = { normalizeFigmaPrimary: true, normalizeStrokeWidth: false };
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
    [
      'primary paint',
      '37831-7379.svg',
      (svg: string) => svg.replace('fill="currentColor"', 'fill="#9CA3B1"'),
    ],
    [
      'foreground paint',
      '16035-380989.svg',
      (svg: string) => svg.replace('fill="currentColor"', 'fill="white"'),
    ],
    [
      'definition paint',
      '1-2967.svg',
      (svg: string) => svg.replace('fill="white"', 'fill="black"'),
    ],
  ])('rejects mutated %s with a stable paint token', async (_label, file, mutate) => {
    expect(await auditSourceMutation(file, mutate)).toContain('PAINT_SEMANTICS_MISMATCH');
  });

  it('rejects opacity drift from the updated Pill source', async () => {
    expect(
      await auditSourceMutation('37831-7379.svg', (svg) =>
        svg.replace('opacity="0.5"', 'opacity="0.6"'),
      ),
    ).toContain('GEOMETRY_DIGEST_MISMATCH');
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

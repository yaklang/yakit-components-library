import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { build, type Rollup } from 'vite';
import { describe, expect, it } from 'vitest';

import { createSvgReactPlugin } from '../../config/svgReactTransform';
import {
  auditColorfulFragmentFiles,
  inspectFragmentGraph,
  normalizeColorfulFragments,
} from '../../scripts/colorful-fragments.mjs';

const fixture = readFileSync(
  resolve(import.meta.dirname, '../fixtures/icons/colorful/fragments.svg'),
  'utf8',
);

describe('colorful source fragment normalization', () => {
  it('rewrites URL, style, href, xlink, and ARIA references atomically', () => {
    const result = normalizeColorfulFragments(fixture, '46336:19924');
    expect(result.fragments.map(({ normalizedId }) => normalizedId)).toEqual([
      'icon_4633619924__semantic_0',
      'icon_4633619924__semantic_1',
      'icon_4633619924__linearGradient_0',
      'icon_4633619924__clip_0',
      'icon_4633619924__semantic_2',
    ]);
    expect(result.svg).not.toMatch(/(?:id|href)=["'](?:#)?(?:title0|desc0|paint0|clip0|shape0)/);
    const graph = inspectFragmentGraph(result.svg);
    expect(new Set(graph.references.map(({ id }) => id))).toEqual(
      new Set(graph.owners.map(({ id }) => id)),
    );
    expect(auditColorfulFragmentFiles([{ path: 'fixture.svg', svg: result.svg }])).toEqual({
      fragmentBaseCount: 5,
      fragmentFileCount: 1,
    });
  });

  it('rejects orphan references and cross-file base collisions', () => {
    expect(() =>
      normalizeColorfulFragments('<svg><path fill="url(#missing)" /></svg>', '1:2'),
    ).toThrow(/FRAGMENT_ORPHAN/);
    const normalized = normalizeColorfulFragments(fixture, '1:2').svg;
    expect(() =>
      auditColorfulFragmentFiles([
        { path: 'a.svg', svg: normalized },
        { path: 'b.svg', svg: normalized },
      ]),
    ).toThrow(/FRAGMENT_BASE_COLLISION/);
  });

  it('removes unreferenced presentation ids', () => {
    const result = normalizeColorfulFragments(
      '<svg><path id="Vector_123" d="M0 0" /></svg>',
      '1:2',
    );
    expect(result.removedPresentationIds).toEqual(['Vector_123']);
    expect(result.svg).not.toContain('id=');
  });

  it('fails closed on style elements whose fragment references cannot be owned safely', () => {
    const styled =
      '<svg><style>.shape{fill:url(#paint)}</style><defs><linearGradient id="paint" /></defs><path class="shape" /></svg>';
    expect(() => normalizeColorfulFragments(styled, '1:2')).toThrow(/FRAGMENT_STYLE_UNSUPPORTED/);
    expect(() => auditColorfulFragmentFiles([{ path: 'styled.svg', svg: styled }])).toThrow(
      /FRAGMENT_STYLE_UNSUPPORTED/,
    );
  });

  it('compiles every supported JSX reference form with one useId suffix', async () => {
    const normalized = normalizeColorfulFragments(fixture, '46336:19924').svg;
    expect(normalized).toContain('style="fill: url(\'#icon_4633619924__linearGradient_0\')"');
    const result = (await build({
      build: {
        rollupOptions: {
          external: ['react', 'react/jsx-runtime'],
          input: resolve(import.meta.dirname, '../fixtures/icons/colorful/transform-entry.ts'),
          preserveEntrySignatures: 'strict',
          treeshake: false,
        },
        write: false,
      },
      configFile: false,
      logLevel: 'silent',
      plugins: [createSvgReactPlugin()],
    })) as Rollup.RollupOutput;
    const output = result.output
      .filter((entry): entry is Rollup.OutputChunk => entry.type === 'chunk')
      .map(({ code }) => code)
      .join('\n');
    expect(output.match(/useId/g)).toHaveLength(1);
    for (const fragment of [
      'icon_4633619924__semantic_0',
      'icon_4633619924__semantic_1',
      'icon_4633619924__linearGradient_0',
      'icon_4633619924__clip_0',
      'icon_4633619924__semantic_2',
    ]) {
      expect(output, fragment).toContain(`${fragment}__`);
      expect(output, fragment).not.toMatch(new RegExp(`${fragment}["']`));
    }
    expect(output.match(/icon_4633619924__linearGradient_0__/g)).toHaveLength(2);
    expect(output.match(/icon_4633619924__clip_0__/g)).toHaveLength(2);
    expect(output.match(/icon_4633619924__semantic_2__/g)).toHaveLength(3);
  });
});

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import { chromium } from 'playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { readIconInputSync as readFileSync } from '../../scripts/icon-source-documents.mjs';
import * as Icons from '../../src/colorful';
import corrections from '../fixtures/icons/reference/avatar-badge-weight.json';

const digest = (source: string) => createHash('sha256').update(source).digest('hex');
const source: {
  records: { groupNodeId: string; exportName: string; rawSvg?: string; production?: object }[];
} = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../config/icon-sources/colorful.json'), 'utf8'),
);
const splitBadge = (svg: string) => {
  const start = svg.lastIndexOf('<g transform="translate(1');
  const end = svg.lastIndexOf('</g>') + 4;
  return { before: svg.slice(0, start), badge: svg.slice(start, end), after: svg.slice(end) };
};

describe('avatar corner badge weights', () => {
  it('preserves the frozen historical corrections and their original base avatars', () => {
    expect(corrections.map(({ name }) => name).sort()).toEqual(
      ['Official', 'Mitm', 'PortScan', 'YakNative', 'Lua', 'NucleiYaml', 'Codec'].sort(),
    );
    for (const correction of corrections) {
      expect(digest(correction.svg)).toBe(correction.sha256);
      expect(digest(correction.originalSvg)).toBe(correction.originalSha256);
      const original = splitBadge(correction.originalSvg);
      const current = splitBadge(correction.svg);
      expect(current.before).toBe(original.before);
      expect(current.after).toBe(original.after);
      if (correction.name === 'PortScan') {
        expect(correction.svg).toBe(correction.originalSvg);
      } else {
        expect(current.badge).toContain('scale(0.5)');
        for (const [, width] of current.badge.matchAll(/stroke-width="([^"]+)"/g)) {
          expect(width).toBe('1');
        }
      }
    }
  });

  it('renders all current avatars like their latest Figma exports at 28px and 56px', async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const results = await page.evaluate(
        async (records) => {
          const raster = async (svg: string, size: number) => {
            const image = new Image();
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          };
          const results = [];
          for (const record of records) {
            for (const size of [28, 56]) {
              const actual = await raster(record.actual, size);
              const expected = await raster(record.expected, size);
              let maxDifference = 0;
              for (let i = 0; i < actual.length; i++) {
                maxDifference = Math.max(maxDifference, Math.abs(actual[i] - expected[i]));
              }
              results.push({ name: record.name, size, maxDifference });
            }
          }
          return results;
        },
        source.records
          .filter(({ groupNodeId }) => groupNodeId === '37202:11692')
          .map(({ exportName, rawSvg, production }) => {
            if (!rawSvg || !production) throw new Error(`Missing current source: ${exportName}`);
            const markup = renderToStaticMarkup(
              createElement(Icons[exportName as keyof typeof Icons]),
            );
            return {
              name: exportName,
              actual: markup.slice(markup.indexOf('<svg'), markup.indexOf('</svg>') + 6),
              expected: rawSvg,
            };
          }),
      );
      expect(results).toHaveLength(18);
      for (const result of results) {
        expect(result.maxDifference, `${result.name} at ${result.size}px`).toBeLessThanOrEqual(1);
      }
    } finally {
      await browser.close();
    }
  });
});

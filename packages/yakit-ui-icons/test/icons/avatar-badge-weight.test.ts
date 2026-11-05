import { createHash } from 'node:crypto';
import { readIconInputSync as readFileSync } from '../../scripts/icon-source-documents.mjs';
import { resolve } from 'node:path';

import { chromium } from 'playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import * as Icons from '../../src/colorful';
import corrections from '../fixtures/icons/reference/avatar-badge-weight.json';

const digest = (source: string) => createHash('sha256').update(source).digest('hex');
const splitBadge = (svg: string) => {
  const start = svg.lastIndexOf('<g transform="translate(1');
  const end = svg.lastIndexOf('</g>') + 4;
  return { before: svg.slice(0, start), badge: svg.slice(start, end), after: svg.slice(end) };
};

describe('avatar corner badge weights', () => {
  it('preserves base avatars and pins the six corrections and unchanged reference', () => {
    expect(corrections.map(({ name }) => name).sort()).toEqual(
      ['Official', 'Mitm', 'PortScan', 'YakNative', 'Lua', 'NucleiYaml', 'Codec'].sort(),
    );
    for (const correction of corrections) {
      const source = readFileSync(
        resolve(import.meta.dirname, '../../src', correction.file),
        'utf8',
      );
      expect(source.replaceAll('stroke-width="1.5"', 'stroke-width="1"')).toBe(correction.svg);
      expect(digest(source.replaceAll('stroke-width="1.5"', 'stroke-width="1"'))).toBe(
        correction.sha256,
      );
      expect(digest(correction.originalSvg)).toBe(correction.originalSha256);
      const original = splitBadge(correction.originalSvg);
      const current = splitBadge(source.replaceAll('stroke-width="1.5"', 'stroke-width="1"'));
      expect(current.before).toBe(original.before);
      expect(current.after).toBe(original.after);
      if (correction.name === 'PortScan') {
        expect(source.replaceAll('stroke-width="1.5"', 'stroke-width="1"')).toBe(
          correction.originalSvg,
        );
      } else {
        expect(current.badge).toContain('scale(0.5)');
        for (const [, width] of current.badge.matchAll(/stroke-width="([^"]+)"/g)) {
          expect(width).toBe('1');
        }
      }
    }
  });

  it('matches the frozen corrected badge geometry at width 1.5 at 28px and 56px', async () => {
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
              const original = await raster(record.original, size);
              let maxDifference = 0;
              let originalDifference = 0;
              for (let i = 0; i < actual.length; i++) {
                maxDifference = Math.max(maxDifference, Math.abs(actual[i] - expected[i]));
                originalDifference += Math.abs(actual[i] - original[i]);
              }
              results.push({ name: record.name, size, maxDifference, originalDifference });
            }
          }
          return results;
        },
        corrections.map(({ name, svg: reviewedSvg, originalSvg }) => {
          const markup = renderToStaticMarkup(
            createElement(Icons[`${name}AvatarColorful` as keyof typeof Icons]),
          );
          return {
            name,
            actual: markup.slice(markup.indexOf('<svg'), markup.indexOf('</svg>') + 6),
            // Preserve the exact reviewed coordinates; the unscaled oracle rounds paths.
            expected: reviewedSvg.replaceAll('stroke-width="1"', 'stroke-width="1.5"'),
            original: originalSvg.replaceAll('stroke-width="1"', 'stroke-width="1.5"'),
          };
        }),
      );
      for (const result of results) {
        expect(result.maxDifference, `${result.name} at ${result.size}px`).toBeLessThanOrEqual(1);
        if (result.name === 'PortScan') expect(result.originalDifference).toBe(0);
        else expect(result.originalDifference).toBeGreaterThan(0);
      }
    } finally {
      await browser.close();
    }
  });
});

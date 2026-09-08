import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { launchGeometryBrowser } from '../fixtures/icons/geometry-browser';

const packageRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(packageRoot, 'test/fixtures/icons/adjustable-stroke');
const sourcePath = resolve(packageRoot, 'src/icons/outline/1-3136.svg');
const review = JSON.parse(readFileSync(resolve(fixtureRoot, 'bug-geometry-review.json'), 'utf8'));

const sha256 = (contents: string) => createHash('sha256').update(contents).digest('hex');
const read = (path: string) => readFileSync(path, 'utf8');

describe('BugOutlined adjustable geometry', () => {
  it('keeps the reviewed geometry artifacts immutable', () => {
    expect(sha256(read(resolve(fixtureRoot, 'bug-original-expanded.svg')))).toBe(
      review.artifacts.originalExpandedSvgSha256,
    );
    expect(sha256(read(resolve(fixtureRoot, 'bug-reviewed-width-2.svg')))).toBe(
      review.artifacts.reviewedWidth2SvgSha256,
    );
    expect(sha256(read(sourcePath))).toBe(review.artifacts.productionSvgSha256);
    expect(review.width2VersusOriginal).toMatchObject({
      passed: true,
      iou: expect.any(Number),
      boundsEdgeDeltaViewBox: expect.any(Number),
      centroidDeltaViewBox: expect.any(Number),
    });
    expect(review.width2VersusOriginal.iou).toBeGreaterThanOrEqual(
      review.width2VersusOriginal.gates.iouMinimum,
    );
    expect(review.width2VersusOriginal.boundsEdgeDeltaViewBox).toBeLessThanOrEqual(
      review.width2VersusOriginal.gates.boundsEdgeDeltaMaximum,
    );
    expect(review.width2VersusOriginal.centroidDeltaViewBox).toBeLessThanOrEqual(
      review.width2VersusOriginal.gates.centroidDeltaMaximum,
    );
  });

  it('uses one real stroke for the body, head, six legs, and midline', () => {
    const source = read(sourcePath);
    const reviewedWidth2 = read(resolve(fixtureRoot, 'bug-reviewed-width-2.svg'));

    expect(source.replace('stroke-width="1"', 'stroke-width="2"')).toBe(reviewedWidth2);
    expect(source.match(/<path\b/g)).toHaveLength(1);
    expect(source).toContain('fill="none" stroke="currentColor" stroke-width="1"');
    expect(source).toContain('stroke-linecap="round" stroke-linejoin="round"');
    expect(source).not.toContain('<mask');
    expect(source).toContain('M2 13H5M19 13H22');
    expect(source).toContain('M3 6C3 7.65685 4.34315 9 6 9');
    expect(source).toContain('M21 6C21 7.65685 19.6569 9 18 9');
    expect(source).toContain('M3 21C3 19.3431 4.34315 18 6 18');
    expect(source).toContain('M21 21C21 19.3431 19.6569 18 18 18');
    expect(source).toContain('M9 6C9 4.34315 10.3431 3 12 3');
    expect(source).toContain('M9 6H15C17.2091 6 19 7.79086 19 10V15');
    expect(source).toContain('M12 6V22');
  });

  it('proves the supported widths are distinct and width three is not cropped', () => {
    expect(review.widths['0'].activePixels).toBe(0);
    expect([
      review.widths['1'].activePixels,
      review.widths['1.5'].activePixels,
      review.widths['2'].activePixels,
      review.widths['3'].activePixels,
    ]).toEqual([1727, 2457, 3144, 4515]);
    expect(review.widths['3']).toMatchObject({
      bounds: [2, 6, 93, 93],
      cropped: false,
    });
  });

  it('recomputes the reviewed geometry gates from the production SVG in the configured renderer', async () => {
    const original = read(resolve(fixtureRoot, 'bug-original-expanded.svg'));
    const production = read(sourcePath);
    const widths = [0, 1, 1.5, 2, 3];
    const size = review.renderer.rasterSize;
    const browser = await launchGeometryBrowser(review.renderer);
    try {
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      const measured = await page.evaluate(
        async ({ original, production, size, threshold, widths }) => {
          const raster = async (source: string) => {
            const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
            svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svg.setAttribute('style', `${svg.getAttribute('style') ?? ''};color:#353639`);
            const image = new Image();
            const loaded = new Promise<void>((resolveImage, rejectImage) => {
              image.onload = () => resolveImage();
              image.onerror = () => rejectImage(new Error('Bug SVG raster failure'));
            });
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
            await loaded;
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = size;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) throw new Error('Canvas 2D context unavailable');
            context.drawImage(image, 0, 0, size, size);
            return context.getImageData(0, 0, size, size).data;
          };
          const ink = (rgba: Uint8ClampedArray) => {
            const mask: boolean[] = [];
            let minX = Infinity;
            let minY = Infinity;
            let maxX = -Infinity;
            let maxY = -Infinity;
            let total = 0;
            let weightedX = 0;
            let weightedY = 0;
            for (let index = 0; index < rgba.length; index += 4) {
              const alpha = rgba[index + 3];
              const pixel = index / 4;
              const x = pixel % size;
              const y = Math.floor(pixel / size);
              const active = alpha > threshold;
              mask.push(active);
              if (active) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              }
              total += alpha;
              weightedX += alpha * x;
              weightedY += alpha * y;
            }
            return {
              mask,
              bounds: total === 0 ? null : [minX, minY, maxX, maxY],
              centroid: total === 0 ? null : [weightedX / total, weightedY / total],
              activePixels: mask.filter(Boolean).length,
            };
          };
          const originalInk = ink(await raster(original));
          const variants: Record<string, ReturnType<typeof ink>> = {};
          for (const width of widths) {
            variants[String(width)] = ink(
              await raster(production.replace('stroke-width="1"', `stroke-width="${width}"`)),
            );
          }
          const width2 = variants['2'];
          let intersection = 0;
          let union = 0;
          for (let index = 0; index < originalInk.mask.length; index += 1) {
            if (originalInk.mask[index] && width2.mask[index]) intersection += 1;
            if (originalInk.mask[index] || width2.mask[index]) union += 1;
          }
          const scale = size / 24;
          return {
            iou: intersection / union,
            boundsEdgeDeltaViewBox:
              Math.max(
                ...originalInk.bounds!.map((value, index) =>
                  Math.abs(value - width2.bounds![index]),
                ),
              ) / scale,
            centroidDeltaViewBox:
              Math.hypot(
                originalInk.centroid![0] - width2.centroid![0],
                originalInk.centroid![1] - width2.centroid![1],
              ) / scale,
            activePixels: Object.fromEntries(
              Object.entries(variants).map(([width, value]) => [width, value.activePixels]),
            ),
            width3Bounds: variants['3'].bounds,
          };
        },
        {
          original,
          production,
          size,
          threshold: review.renderer.inkMaskAlphaThreshold,
          widths,
        },
      );

      expect(measured.iou).toBeGreaterThanOrEqual(review.width2VersusOriginal.gates.iouMinimum);
      expect(measured.boundsEdgeDeltaViewBox).toBeLessThanOrEqual(
        review.width2VersusOriginal.gates.boundsEdgeDeltaMaximum,
      );
      expect(measured.centroidDeltaViewBox).toBeLessThanOrEqual(
        review.width2VersusOriginal.gates.centroidDeltaMaximum,
      );
      expect(measured.activePixels['0']).toBe(0);
      expect([
        measured.activePixels['1'],
        measured.activePixels['1.5'],
        measured.activePixels['2'],
        measured.activePixels['3'],
      ]).toEqual(
        [
          ...new Set([
            measured.activePixels['1'],
            measured.activePixels['1.5'],
            measured.activePixels['2'],
            measured.activePixels['3'],
          ]),
        ].sort((left, right) => left - right),
      );
      expect(measured.width3Bounds).not.toContain(0);
      expect(measured.width3Bounds).not.toContain(size - 1);
    } finally {
      await browser.close();
    }
  }, 30_000);
});

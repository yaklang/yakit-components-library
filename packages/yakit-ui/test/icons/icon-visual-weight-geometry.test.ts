import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { chromium } from 'playwright';
import { describe, expect, it } from 'vitest';

import reviews from '../fixtures/icons/reference/visual-weight-v2/reviews.json';
import { measureVisualWeight } from '../fixtures/icons/visual-weight-metrics.mjs';

const packageRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(packageRoot, 'test/fixtures/icons/reference/visual-weight-v2');

describe('reconstructed Outline geometry', () => {
  it('recomputes old-contour equivalence and default thickness for every reviewed icon', async () => {
    const browser = await chromium.launch({
      executablePath: reviews.reviews[0].renderer.browserExecutablePath,
      headless: true,
    });
    try {
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      const control =
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 12H20" stroke="black" stroke-width="1"/></svg>';
      const calibration = await page.evaluate(measureVisualWeight, {
        source: control,
        original: control,
        spec: {
          oldWidth: 1,
          nodeRoles: [],
          sampleSegments: [{ axis: 'y', at: 12, from: 10, to: 14, expected: 1 }],
        },
      });
      expect(calibration.iou).toBe(1);
      expect(Math.abs(calibration.thickness[0].actual - 1)).toBeLessThan(0.05);
      await expect(
        page.evaluate(measureVisualWeight, {
          source: control,
          original: control,
          spec: {
            oldWidth: 1,
            nodeRoles: [],
            sampleSegments: [{ axis: 'normal', at: 12, from: 10, to: 14, expected: 1 }],
          },
        }),
      ).rejects.toThrow('VISUAL_WEIGHT_SAMPLE_AXIS_UNSUPPORTED');
      for (const review of reviews.reviews) {
        expect(browser.version()).toBe(review.renderer.browserVersion);
        const measured = await page.evaluate(measureVisualWeight, {
          source: readFileSync(resolve(packageRoot, 'src/icons/outline', review.file), 'utf8'),
          original: readFileSync(resolve(fixtureRoot, review.oldEvidence.path), 'utf8'),
          spec: review,
        });
        expect(measured.iou, `${review.file}: old-width contour`).toBeGreaterThanOrEqual(
          review.thresholds.iouMinimum,
        );
        expect(measured.contourDistance, `${review.file}: contour distance`).toBeLessThanOrEqual(
          review.thresholds.contourMaximum,
        );
        expect(measured.boundsDelta, `${review.file}: old-width bounds`).toBeLessThanOrEqual(
          review.thresholds.boundsMaximum,
        );
        expect(measured.oldTopology, `${review.file}: frozen old topology`).toEqual(
          review.topologyAtOldWidth,
        );
        expect(measured.rebuiltTopology, `${review.file}: rebuilt topology`).toEqual(
          review.topologyAtOldWidth,
        );
        expect(measured.widths['1'].topology, `${review.file}: default topology`).toEqual(
          review.topologyAtDefault,
        );
        for (const sample of measured.thickness) {
          expect(
            Math.abs(sample.actual - sample.expected),
            `${review.file}: local thickness`,
          ).toBeLessThanOrEqual(review.thresholds.thicknessTolerance);
        }
        const inkCounts = [0, 1, 1.5, 2, 3].map((width) => measured.widths[width].count);
        for (let index = 1; index < inkCounts.length; index++) {
          expect(inkCounts[index], `${review.file}: width response`).toBeGreaterThan(
            inkCounts[index - 1],
          );
        }
      }
    } finally {
      await browser.close();
    }
  }, 120_000);
});

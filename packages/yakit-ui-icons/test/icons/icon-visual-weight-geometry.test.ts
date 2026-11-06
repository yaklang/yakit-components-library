import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { bundledGeometryRenderer, launchGeometryBrowser } from '../fixtures/icons/geometry-browser';
import topologyObservation from '../fixtures/icons/reference/visual-weight-v2/chromium-140-topology.json';
import reviews from '../fixtures/icons/reference/visual-weight-v2/reviews.json';
import { measureVisualWeight } from '../fixtures/icons/visual-weight-metrics.mjs';

import { restoreReviewedPaint } from './helpers/icon-reviewed-paint';

const packageRoot = resolve(import.meta.dirname, '../..');
const fixtureRoot = resolve(packageRoot, 'test/fixtures/icons/reference/visual-weight-v2');

describe('reconstructed Outline geometry', () => {
  it('recomputes old-contour equivalence and reviewed width-one thickness for every reviewed icon', async () => {
    const browser = await launchGeometryBrowser(reviews.reviews[0].renderer);
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
        expect(review.renderer.browserVersion).toBe(reviews.reviews[0].renderer.browserVersion);
        const measured = await page.evaluate(measureVisualWeight, {
          // Measure geometry using the reviewed paint; current half-opacity is checked separately.
          source: restoreReviewedPaint(
            review.file,
            readFileSync(resolve(packageRoot, 'src/outline', review.file), 'utf8'),
          ),
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
        let expectedOldTopology = review.topologyAtOldWidth;
        if (
          !process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH &&
          review.file === topologyObservation.file
        ) {
          expect(bundledGeometryRenderer).toEqual(topologyObservation.renderer);
          expect(topologyObservation.profiles).toContain(`${process.platform}-${process.arch}`);
          expect(topologyObservation.rasterSize).toBe(review.renderer.rasterSize);
          expect(topologyObservation.deviceScaleFactor).toBe(review.renderer.deviceScaleFactor);
          expect(topologyObservation.alphaThreshold).toBe(review.renderer.alphaThreshold);
          expect(topologyObservation.canonicalOldTopology).toEqual(review.topologyAtOldWidth);
          const hash = (path: string) =>
            createHash('sha256').update(readFileSync(path)).digest('hex');
          expect(hash(resolve(fixtureRoot, review.oldEvidence.path))).toBe(
            topologyObservation.oldSourceSha256,
          );
          expect(
            createHash('sha256')
              .update(
                readFileSync(resolve(packageRoot, 'src/outline', review.file), 'utf8').replaceAll(
                  'stroke-width="1.5"',
                  'stroke-width="1"',
                ),
              )
              .digest('hex'),
          ).toBe(topologyObservation.candidateSourceSha256);
          expect(topologyObservation.evidence.bundled.metrics.oldTopology).toEqual(
            topologyObservation.oldTopology,
          );
          expect(topologyObservation.evidence.chrome.metrics.oldTopology).toEqual(
            review.topologyAtOldWidth,
          );
          expectedOldTopology = topologyObservation.oldTopology;
        }
        expect(measured.oldTopology, `${review.file}: frozen old topology`).toEqual(
          expectedOldTopology,
        );
        expect(measured.rebuiltTopology, `${review.file}: rebuilt topology`).toEqual(
          review.topologyAtOldWidth,
        );
        expect(
          measured.widths['1'].topology,
          `${review.file}: reviewed width-one topology`,
        ).toEqual(review.topologyAtDefault);
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

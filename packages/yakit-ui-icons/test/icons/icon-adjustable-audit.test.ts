import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import outlineSource from '../../config/icon-sources/outline.json';
import { auditIcons } from '../../scripts/audit-icons.mjs';
import { readIconInputSync } from '../../scripts/icon-source-documents.mjs';
import reviews from '../../scripts/outline-geometry-overrides.json';
import { reviewedOutlineGeometry } from '../../scripts/outline-geometry-overrides.mjs';
import visualWeightReviews from '../fixtures/icons/reference/visual-weight-v2/reviews.json';

type AuditedSymbol = {
  file: string;
  exportName: string;
  geometryReviewId?: string;
  figmaGeometrySha256: string;
  localGeometrySha256: string;
  geometrySha256: string;
};

const manifest: { symbols: AuditedSymbol[] } = JSON.parse(
  readIconInputSync(
    new URL('../../config/icon-sources/outline.json#manifest', import.meta.url),
    'utf8',
  ),
);

const bug = manifest.symbols.find(({ exportName }) => exportName === 'BugOutlined')!;

describe('reviewed adjustable geometry audit', () => {
  it('allows only exact reviewed source pairs without rewriting Figma evidence', () => {
    expect(reviews.reviews).toHaveLength(14);
    expect(reviews.reviews.map((review) => review.file).sort()).toEqual(
      ['1-3136.svg', ...visualWeightReviews.approvedFiles].sort(),
    );
    for (const review of reviews.reviews) {
      const source = manifest.symbols.find((symbol) => symbol.file === review.file)!;
      const native = outlineSource.records.some(
        (record) =>
          record.file === review.file &&
          'production' in record &&
          record.production !== undefined &&
          'geometry' in record.production &&
          record.production.geometry === 'source',
      );
      if (native) {
        expect(reviewedOutlineGeometry(source), review.file).toBeUndefined();
        expect(source.geometryReviewId, review.file).toBeUndefined();
        expect(source.figmaGeometrySha256, review.file).toBe(source.localGeometrySha256);
      } else expect(reviewedOutlineGeometry(source), review.file).toBe(review.reviewId);
      expect(
        reviewedOutlineGeometry({ ...source, localRawSvgSha256: 'unreviewed' }),
      ).toBeUndefined();
    }
    expect(reviewedOutlineGeometry(bug)).toBeUndefined();
    expect(bug.figmaGeometrySha256).toBe(bug.localGeometrySha256);
    expect(bug.geometrySha256).toBe(bug.localGeometrySha256);
    for (const field of [
      'file',
      'exportedSourceNodeId',
      'figmaRawSvgSha256',
      'localRawSvgSha256',
      'figmaNormalizedAstSha256',
      'localNormalizedAstSha256',
      'figmaGeometrySha256',
      'localGeometrySha256',
    ]) {
      expect(reviewedOutlineGeometry({ ...bug, [field]: 'unreviewed' }), field).toBeUndefined();
    }
    expect(reviewedOutlineGeometry({})).toBeUndefined();
  });

  it('passes full source audit with the immutable raw and placement provenance', async () => {
    const root = process.cwd();
    const result = await auditIcons({
      root: resolve(root, 'src'),
      indexPath: resolve(root, 'src/outline/index.tsx'),
      manifestPath: resolve(root, 'config/icon-sources/outline.json#manifest'),
      policyId: 'outline-v1',
      figmaRawProvenancePath: resolve(root, 'config/icon-sources/outline.json#raw'),
      placementProvenancePath: resolve(root, 'config/icon-sources/outline.json#placement'),
    });
    expect(result.failures).toEqual([]);
    const raw = JSON.parse(
      readIconInputSync(resolve(root, 'config/icon-sources/outline.json#raw'), 'utf8'),
    );
    expect(
      raw.components.find(({ nodeId }: { nodeId: string }) => nodeId === '1:3136').svg,
    ).not.toContain('stroke-width=');
  });
});

describe('Loading source default checks', () => {
  it('accepts only the documented override expression with the unit default', async () => {
    const { loadingStrokeWidthDefault } = await import('../../scripts/icon-stroke-width.mjs');
    const source =
      'const DEFAULT_LOADING_STROKE_WIDTH = 1; <path strokeWidth={props.style?.strokeWidth ?? props.strokeWidth ?? DEFAULT_LOADING_STROKE_WIDTH} />';
    expect(loadingStrokeWidthDefault(source)).toBe('1');
    expect(loadingStrokeWidthDefault(source.replace('= 1;', '= 2;'))).toBe('2');
    expect(
      loadingStrokeWidthDefault(source.replace('?? props.strokeWidth', '|| props.strokeWidth')),
    ).toBeUndefined();
    expect(loadingStrokeWidthDefault(source + '<path strokeWidth={1} />')).toBeUndefined();
  });
});

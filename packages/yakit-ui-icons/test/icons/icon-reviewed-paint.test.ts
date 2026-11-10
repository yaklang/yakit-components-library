import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import reviews from '../fixtures/icons/reference/visual-weight-v2/reviews.json';

import { applyReviewedPaint, restoreReviewedPaint } from './helpers/icon-reviewed-paint';
import { readReviewCandidate } from './helpers/review-candidate-source';

const file = '45035-1908.svg';
const source = readReviewCandidate(file).toString('utf8');
const review = reviews.reviews.find((entry) => entry.file === file)!;

describe('historical DataComparison reviewed paint projection', () => {
  it('restores the exact frozen geometry and derives current paint from the frozen runtime SVG', () => {
    const restored = restoreReviewedPaint(file, source);
    expect(
      createHash('sha256')
        .update(restored.replaceAll('stroke-width="1.5"', 'stroke-width="1"'))
        .digest('hex'),
    ).toBe(review.candidateSourceSha256);
    expect(applyReviewedPaint(file, restored)).toBe(source);
    const expected = applyReviewedPaint(file, review.serializedSvg);
    expect(expected.match(/opacity="0.5"/g)).toHaveLength(4);
    expect(expected).not.toContain('rgb(from');
    const paths = (svg: string) => [...svg.matchAll(/\bd="([^"]*)"/g)].map((match) => match[1]);
    expect(paths(expected)).toEqual(paths(review.serializedSvg));
  });

  it.each([
    source.replace('M3 6', 'M4 6'),
    source.replace('opacity="0.5"', 'opacity="0.6"'),
    source.replace('stroke-width="1.5"', 'stroke-width="2"'),
  ])('rejects unreviewed geometry, opacity or width changes', (changed) => {
    expect(() => restoreReviewedPaint(file, changed)).toThrow('ICON_PAINT_REVISION_SOURCE_DRIFT');
  });

  it('requires all four frozen paint attributes and leaves other icons unchanged', () => {
    expect(() => applyReviewedPaint(file, '<svg/>')).toThrow('ICON_PAINT_REVISION_ATTRIBUTE_DRIFT');
    expect(restoreReviewedPaint('other.svg', '<svg opacity="0.5"/>')).toBe('<svg opacity="0.5"/>');
    expect(applyReviewedPaint('other.svg', '<svg/>')).toBe('<svg/>');
  });
});

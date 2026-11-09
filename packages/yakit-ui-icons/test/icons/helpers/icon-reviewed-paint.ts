import { createHash } from 'node:crypto';

import geometryReviews from '../../../scripts/outline-geometry-overrides.json';

const previousPaint = 'color="rgb(from currentColor calc(r + 139) calc(g + 144) calc(b + 152))"';
const currentPaint = 'opacity="0.5"';
const digest = (source: string) => createHash('sha256').update(source).digest('hex');

// This exception certifies only DataComparison's four paint attributes, not arbitrary
// edits or future paint revisions. Frozen geometry evidence is never rewritten.
export function restoreReviewedPaint(file: string, source: string): string {
  if (file !== '45035-1908.svg') return source;
  const revision = geometryReviews.paintRevisions.find((entry) => entry.file === file);
  if (!revision || digest(source) !== revision.localRawSvgSha256)
    throw new Error('ICON_PAINT_REVISION_SOURCE_DRIFT');
  if (source.split(currentPaint).length !== 5)
    throw new Error('ICON_PAINT_REVISION_ATTRIBUTE_DRIFT');
  const restored = source.replaceAll(currentPaint, previousPaint);
  if (digest(restored) !== revision.previousLocalRawSvgSha256)
    throw new Error('ICON_PAINT_REVISION_GEOMETRY_DRIFT');
  return restored;
}

// Build the current pixel oracle from independently frozen markup, applying only
// the reviewed paint change. The caller also verifies the current source above.
export function applyReviewedPaint(file: string, frozenMarkup: string): string {
  if (file !== '45035-1908.svg') return frozenMarkup;
  if (frozenMarkup.split(previousPaint).length !== 5)
    throw new Error('ICON_PAINT_REVISION_ATTRIBUTE_DRIFT');
  return frozenMarkup.replaceAll(previousPaint, currentPaint);
}

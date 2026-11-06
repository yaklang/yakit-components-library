import { readFileSync } from 'node:fs';

const { reviews, paintRevisions = [] } = JSON.parse(
  readFileSync(new URL('./outline-geometry-overrides.json', import.meta.url), 'utf8'),
);
const identityFields = [
  'exportedSourceNodeId',
  'file',
  'figmaRawSvgSha256',
  'localRawSvgSha256',
  'figmaNormalizedAstSha256',
  'localNormalizedAstSha256',
  'figmaGeometrySha256',
  'localGeometrySha256',
];

/** Only this exact reviewed source pair may differ from immutable Figma geometry. */
export function reviewedOutlineGeometry(record) {
  return [...reviews, ...paintRevisions].find((review) =>
    identityFields.every((field) => review[field] && review[field] === record[field]),
  )?.reviewId;
}

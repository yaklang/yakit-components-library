import { expect } from 'vitest';

import outline from '../../../config/icon-sources/outline.json';
import solid from '../../../config/icon-sources/solid.json';
import { canonicalizeSvg, parseSvg } from '../../../scripts/audit-icons.mjs';

export const importedMonochromeSources = [outline, solid].flatMap(({ family, records }) =>
  records
    .filter((record) => 'production' in record)
    .map((record) => ({
      family,
      file: record.file,
      raw: record.raw.svg,
      name: record.exportName,
    })),
);

export const svgStructure = (node: ReturnType<typeof parseSvg>): unknown => [
  node.name,
  node.children.map(svgStructure),
];

export function expectCurrentFigmaSource(
  source: (typeof importedMonochromeSources)[number],
  local: string,
) {
  // Unlike canonical geometry comparison, this retains every group and tag.
  expect(svgStructure(parseSvg(local)), source.name).toEqual(svgStructure(parseSvg(source.raw)));
  const options = {
    ignoreUnreferencedIds: true,
    normalizeForegroundPaint: true,
    normalizeStrokeWidth: source.family === 'outline',
  };
  expect(canonicalizeSvg(local, options), source.name).toBe(canonicalizeSvg(source.raw, options));
}

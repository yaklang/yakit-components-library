import { expect } from 'vitest'

import { canonicalizeSvg, parseSvg } from '../../../scripts/audit-icons.mjs'
import { outline as outline } from '../../helpers/sources'
import { solid as solid } from '../../helpers/sources'

export const importedMonochromeSources = [outline, solid].flatMap(({ family, records }) =>
  records.map((record) => ({
    family,
    file: record.file,
    raw: record.raw.svg,
    name: record.exportName,
  })),
)

export const svgStructure = (node: ReturnType<typeof parseSvg>): unknown => [node.name, node.children.map(svgStructure)]

export function expectCurrentFigmaSource(source: (typeof importedMonochromeSources)[number], local: string) {
  // Unlike canonical geometry comparison, this retains every group and tag.
  const tree = parseSvg(local)
  const rawTree = parseSvg(source.raw)
  expect(svgStructure(tree), source.name).toEqual(svgStructure(rawTree))
  const options = {
    ignoreUnreferencedIds: true,
    normalizeForegroundPaint: true,
    normalizeStrokeWidth: source.family === 'outline',
  }
  expect(canonicalizeSvg(tree, options), source.name).toBe(canonicalizeSvg(rawTree, options))
}

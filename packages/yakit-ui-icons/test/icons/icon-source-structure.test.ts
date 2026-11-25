import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { expectCurrentFigmaSource, importedMonochromeSources } from './helpers/current-figma-source'

describe('imported Figma SVG structure', () => {
  it.each(importedMonochromeSources)('$name preserves source tags and nesting', (source) => {
    const svg = readFileSync(new URL(`../../src/${source.family}/${source.file}`, import.meta.url), 'utf8')
    expectCurrentFigmaSource(source, svg)
    if (source.family === 'outline' && source.file === '39320-7452.svg') {
      expect(svg).not.toMatch(/<g\b/)
      expect(svg.match(/<path\b/g)).toHaveLength(1)
    }
  })
  it('includes BookOpenText in the imported sources', () => {
    expect(importedMonochromeSources).toContainEqual(
      expect.objectContaining({ family: 'outline', file: '39320-7452.svg' }),
    )
  })
})

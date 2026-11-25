import { describe, expect, it } from 'vitest'

import { solidFragments } from '../helpers/fragment-trees'
import { writeFragmentFixtures } from '../helpers/server-fragments'

const fixtures = writeFragmentFixtures(solidFragments, 'solid', 'solid-ssr-fragment-fixtures.json')
describe('Solid icon server rendering', () => {
  it.each([
    ['default identifiers', fixtures.default],
    ['matching custom identifierPrefix', fixtures.custom],
  ])('renders %s with unique owner-local fragment IDs', (_label, fixture) => {
    const references = [...fixture.markup.matchAll(/url\(#([^)]+)\)|(?:href|xlink:href)="#([^"]+)"/g)].map(
      (match) => match[1] ?? match[2],
    )
    expect(fixture.serverIds).toHaveLength(4)
    expect(new Set(fixture.serverIds).size).toBe(fixture.serverIds.length)
    expect(references).toHaveLength(4)
    expect(references.every((reference) => fixture.serverIds.includes(reference))).toBe(true)
    expect(fixture.markup).not.toMatch(/id="icon_[^"]+__(?:clip|mask)_\d+"/)
  })
})

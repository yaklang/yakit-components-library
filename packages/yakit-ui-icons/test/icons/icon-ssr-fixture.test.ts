import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HomeOutlined, HomeSolid } from '../../src'
import { DEFAULT_ICON_COLOR } from '../../src/createIcon'
import { outlineFragments } from '../helpers/fragment-trees'
import { writeFragmentFixtures } from '../helpers/server-fragments'

const fixtures = writeFragmentFixtures(outlineFragments, 'outline', 'ssr-fragment-fixtures.json')
describe('Outline icon server rendering', () => {
  it('serializes the shared color token without loading browser CSS', () => {
    const markup = renderToString(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(HomeOutlined),
        React.createElement(HomeSolid),
        React.createElement(HomeOutlined, { color: '#123456' }),
        React.createElement(HomeSolid, {
          color: '#123456',
          style: { color: '#654321' },
        }),
      ),
    )

    expect(markup.split(DEFAULT_ICON_COLOR)).toHaveLength(5)
    expect(markup.match(/--yakit-icon-default-color:/g)).toHaveLength(4)
    expect(markup.match(/class="anticon yakit-icon"/g)).toHaveLength(4)
    expect(markup).toContain('color:#123456')
    expect(markup).toContain('color:#654321')
  })

  it.each([
    ['default identifiers', fixtures.default],
    ['matching custom identifierPrefix', fixtures.custom],
  ])('renders %s with unique owned fragment IDs', (_label, fixture) => {
    const references = [...fixture.markup.matchAll(/url\(#([^)]+)\)|(?:href|xlink:href)="#([^"]+)"/g)].map(
      (match) => match[1] ?? match[2],
    )
    expect(new Set(fixture.serverIds).size).toBe(fixture.serverIds.length)
    expect(references.length).toBeGreaterThan(0)
    expect(references.every((reference) => fixture.serverIds.includes(reference))).toBe(true)
  })
})

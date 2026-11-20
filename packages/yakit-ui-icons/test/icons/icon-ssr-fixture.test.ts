import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HomeOutlined, HomeSolid, LogoOutlined, StarOffOutlined } from '../../src'
import { DEFAULT_ICON_COLOR } from '../../src/createIcon'

const repeatedFragments = React.createElement(
  React.Fragment,
  null,
  React.createElement(LogoOutlined),
  React.createElement(LogoOutlined),
  React.createElement(StarOffOutlined),
)

const renderFixture = (identifierPrefix?: string) => {
  const markup = renderToString(repeatedFragments, identifierPrefix ? { identifierPrefix } : undefined)
  const serverIds = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
  const references = [...markup.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1])
  return { identifierPrefix, markup, references, serverIds }
}

const fixtures = {
  custom: renderFixture('outline-audit-'),
  default: renderFixture(),
}
const outputDirectory = resolve(process.cwd(), 'test-results/icons')
mkdirSync(outputDirectory, { recursive: true })
writeFileSync(
  resolve(outputDirectory, 'ssr-fragment-fixtures.json'),
  `${JSON.stringify({
    custom: { ...fixtures.custom, references: undefined },
    default: { ...fixtures.default, references: undefined },
  })}\n`,
)

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
    expect(fixture.serverIds.length).toBeGreaterThan(0)
    expect(new Set(fixture.serverIds).size).toBe(fixture.serverIds.length)
    expect(fixture.references.length).toBeGreaterThan(0)
    expect(fixture.references.every((reference) => fixture.serverIds.includes(reference))).toBe(true)
  })
})

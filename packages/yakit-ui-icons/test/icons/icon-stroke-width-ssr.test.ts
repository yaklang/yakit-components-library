import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import * as Icons from '../../src'
import { solid as solidSource } from '../helpers/sources'
import { colorful as colorfulSource } from '../helpers/sources'

import { shapeStrokeWidths, strokeWidths } from './helpers/stroke-widths'
import { iconExports } from './icon-inventory'

describe('family-specific server rendered stroke widths without CSS', () => {
  it('normalizes only Outline and preserves other SVG source widths', () => {
    const icons = Object.entries(Icons)
    expect(icons.map(([name]) => name).sort()).toEqual([...iconExports.root].sort())
    for (const [name, Icon] of icons) {
      const markup = renderToStaticMarkup(createElement(Icon, { 'aria-label': name }))
      expect(markup, name).toContain('<svg')
      if (name === 'Loading' || name === 'HomeOutlined') {
        expect(new Set(shapeStrokeWidths(markup)), name).toEqual(new Set(['1.5']))
        if (name === 'Loading') continue
      }
      const solid = solidSource.records.find((record) => record.exportName === name)
      if (solid) {
        expect(strokeWidths(markup), name).toEqual(strokeWidths(solid.raw.svg))
        continue
      }
      if (!iconExports.outline.includes(name)) {
        const colorful = colorfulSource.records.find((r) => r.exportName === name)
        const file = colorful?.localFile
        expect(file, name).toBeDefined()
        const source = readFileSync(resolve(import.meta.dirname, '../../src', file!), 'utf8')
        expect(strokeWidths(markup), name).toEqual(strokeWidths(source))
        continue
      }
      for (const width of strokeWidths(markup)) expect(width, name).toBe('1.5')
    }
  })
})

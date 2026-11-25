import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

import { createElement, Fragment, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { readIconInputSync } from '../../scripts/icon-source-documents.mjs'
import { readOldiconAssets } from '../../scripts/oldicon-assets.mjs'
import * as OldIcons from '../../src/oldicon'

import { strokeWidths } from './helpers/stroke-widths'

const packageRoot = resolve(import.meta.dirname, '../..')
const oldiconRoot = resolve(packageRoot, 'src/oldicon')
const packageManifest = JSON.parse(readIconInputSync(resolve(packageRoot, 'package.json'), 'utf8'))

type IconComponent = ComponentType<Record<string, unknown>>

const texts = new Map<string, string>()
const readText = (file: string) => {
  let text = texts.get(file)
  if (text === undefined) {
    text = readFileSync(file, 'utf8')
    texts.set(file, text)
  }
  return text
}
const inventory = readOldiconAssets(packageRoot, readText)
const fragmentIds = (source: string) => [...source.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1])
const fragmentReferences = (source: string) =>
  [...source.matchAll(/url\(\s*#([^)\s]+)\s*\)|(?:href|xlink:href)=["']#([^"']+)["']/g)]
    .map((match) => match[1] ?? match[2])
    .filter(Boolean)
const exportedIcon = (exportName: string) =>
  (OldIcons as Record<string, unknown>)[exportName] as IconComponent | undefined
const assets = new Map(
  [...new Set(inventory.exports.map(({ assetFile }) => assetFile))].map((file) => {
    const svg = readText(resolve(oldiconRoot, file))
    return [file, { svg, ids: fragmentIds(svg) }] as const
  }),
)

describe('oldicon package entry and server rendering', () => {
  it('publishes matching runtime, browser, and declaration entry points', () => {
    expect(packageManifest.exports['./oldicon']).toEqual({
      browser: './dist/browser/oldicon/index.js',
      import: './dist/oldicon/index.js',
      types: './dist/oldicon/index.d.ts',
    })
    expect(Object.keys(OldIcons).sort()).toEqual(inventory.exports.map(({ exportName }) => exportName).sort())
  })

  it('generates one public source module per oldicon export', () => {
    const iconFiles = readdirSync(resolve(oldiconRoot, 'icons')).sort()
    const exportNames = inventory.exports.map(({ exportName }) => exportName).sort()

    expect(iconFiles).toEqual(exportNames.map((exportName) => `${exportName}.tsx`))
    expect(exportNames).not.toContain('TaskWaitIcon')
    const barrel = readText(resolve(oldiconRoot, 'index.tsx'))
    expect(barrel).not.toContain('?react')
    expect(barrel).not.toContain('createIcon(')
    for (const { assetFile, exportName } of inventory.exports) {
      expect(barrel).toContain(`export { ${exportName} } from './icons/${exportName}.js'`)
      const source = readText(resolve(oldiconRoot, 'icons', `${exportName}.tsx`))
      expect(source).toContain(`from '../${assetFile}?react'`)
      expect(source).toContain(`export const ${exportName} = createIcon(`)
      expect(source.match(/\.svg\?react/g)).toHaveLength(1)
    }
  })

  it('SSR preserves wrappers and source widths for every export, including representative viewBoxes', () => {
    const entries = inventory.exports.map((entry) => {
      const { svg } = assets.get(entry.assetFile)!
      const attr = (name: string) => svg.match(new RegExp(`\\b${name}=["']([^"']*)["']`))?.[1] ?? ''
      return {
        ...entry,
        dimensions: { viewBox: attr('viewBox'), width: attr('width'), height: attr('height') },
        paintValues: [...svg.matchAll(/(?:fill|stroke)=["']([^"']+)["']/g)].map((m) => m[1]),
      }
    })
    const themeable = entries.find(({ paintValues }) => paintValues.includes('currentColor'))
    const colorful = entries.find(
      ({ paintValues }) => new Set(paintValues.filter((paint) => paint !== 'currentColor')).size >= 2,
    )
    const large = entries.find(({ dimensions }) => {
      const values = dimensions.viewBox.split(/\s+/).map(Number)
      return values.length === 4 && Math.max(values[2], values[3]) >= 100
    })
    const special = entries.find(({ exportName }) => exportName === 'PopoverArrowIcon')
    const representatives = [themeable, colorful, large, special]

    expect(representatives.every(Boolean)).toBe(true)
    for (const entry of entries) {
      const markup = renderToStaticMarkup(createElement(exportedIcon(entry.exportName)!))
      expect(markup, entry.exportName).toMatch(/^<span role="img" class="anticon yakit-icon"[^>]*><svg\b/)
      expect(markup, entry.exportName).toContain('aria-hidden="true"')
      expect(markup, entry.exportName).toContain('focusable="false"')
      expect(strokeWidths(markup), entry.exportName).toEqual(strokeWidths(assets.get(entry.assetFile)!.svg))
      if (representatives.includes(entry))
        expect(markup, entry.exportName).toContain(`viewBox="${entry.dimensions.viewBox}"`)
    }
    expect(special?.dimensions).toMatchObject({ height: '36', width: '9' })
  })
})

describe('oldicon fragment safety', () => {
  it('keeps every raw fragment owner unique, normalized, referenced, and local', () => {
    const owners = new Map<string, string>()

    for (const [assetFile, { svg: source, ids }] of assets) {
      const references = fragmentReferences(source)
      expect(new Set(references), assetFile).toEqual(new Set(ids))
      for (const id of ids) {
        expect(id, `${assetFile}:${id}`).toMatch(/^icon_[0-9_]+__[A-Za-z][A-Za-z0-9_]*_\d+$/)
        expect(owners.has(id), `${assetFile}:${id}`).toBe(false)
        owners.set(id, assetFile)
      }
    }
    expect(owners.size).toBeGreaterThan(0)
  })

  it('SSR gives repeated fragment-bearing icons unique owner-local IDs', () => {
    const fragmentExports = inventory.exports.filter(({ assetFile }) => assets.get(assetFile)!.ids.length > 0)
    expect(fragmentExports.length).toBeGreaterThan(0)
    const markup = renderToStaticMarkup(
      createElement(
        Fragment,
        null,
        ...fragmentExports.flatMap(({ exportName }, index) => {
          const Component = exportedIcon(exportName)!
          return [
            createElement(Component, { key: `${index}-first` }),
            createElement(Component, { key: `${index}-second` }),
          ]
        }),
      ),
    )
    const ids = fragmentIds(markup)
    const references = fragmentReferences(markup)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    expect(references.every((reference) => ids.includes(reference))).toBe(true)
    expect(markup).not.toMatch(/id="icon_[^"]+__(?:clip|mask|gradient)_\d+"/)
  })
})

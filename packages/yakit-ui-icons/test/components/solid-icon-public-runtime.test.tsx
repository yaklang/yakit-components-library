import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import * as PackageApi from '../../src'
import { solidIconNameCatalog } from '../../src/figmaNameCatalog'
import { solidIconRegistry } from '../../src/registry'
import { expectSolidColor, getSolidPaint } from '../helpers/browser-paint'
import { cleanup, render } from '../helpers/render'
import { solid as solidSource } from '../helpers/sources'
import { iconCounts } from '../icons/icon-inventory'

const registryTree = (props: Record<string, unknown>) => (
  <div style={{ color: '#2468ac' }}>
    {solidIconRegistry.map(({ Component, exportName }) => (
      <Component data-icon-name={exportName} key={exportName} {...props} />
    ))}
  </div>
)
const expectPrimaryPaint = (container: HTMLElement, expectedColor: string) => {
  const svgs = [...container.querySelectorAll<SVGSVGElement>('svg')]
  expect(svgs).toHaveLength(iconCounts.solid)
  for (const svg of svgs) {
    expectSolidColor(getSolidPaint(svg), expectedColor)
  }
}

afterEach(cleanup)

describe('Solid public component API', () => {
  it('exposes the registered Solid components under their current public names', () => {
    const expectedNames = solidSource.records.map(({ exportName }) => exportName).sort()
    const registryNames = solidIconRegistry.map(({ exportName }) => exportName).sort()

    expect(registryNames).toEqual(expectedNames)
    expect(registryNames).toContain('DownloadFigma12825Solid')
    expect(registryNames).toContain('DragSortSolid')
    expect('HomeFilled' in PackageApi).toBe(false)
    expect(
      solidIconRegistry.every(
        ({ Component, exportName }) =>
          (PackageApi as Record<string, unknown>)[exportName] === Component && Component.displayName === exportName,
      ),
    ).toBe(true)
  })

  it('uses complete Figma names as registry names in catalog order', () => {
    expect(
      solidIconRegistry.map(({ Component: _Component, name, ...metadata }) => ({
        ...metadata,
        name,
      })),
    ).toEqual(
      solidIconNameCatalog.map((entry) => ({
        ...entry,
        name: entry.figmaName ?? entry.exportName,
      })),
    )
  })

  it('preserves size and accessibility and applies color overrides to every primary glyph', () => {
    const { container, rerender } = render(registryTree({ color: '#123456', size: 32, 'aria-label': 'Solid icon' }))
    for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
      const root = svg.parentElement as HTMLSpanElement
      expect(svg.getAttribute('width')).toBe('32')
      expect(svg.getAttribute('height')).toBe('32')
      expect(root.getAttribute('aria-label')).toBe('Solid icon')
      expect(svg.getAttribute('aria-hidden')).toBe('true')
      expect(svg.getAttribute('focusable')).toBe('false')
    }
    expectPrimaryPaint(container, 'rgb(18, 52, 86)')
    rerender(registryTree({ color: '#123456', style: { color: '#654321' } }))
    expectPrimaryPaint(container, 'rgb(101, 67, 33)')
    rerender(registryTree({ color: 'inherit' }))
    expectPrimaryPaint(container, 'rgb(36, 104, 172)')
  })
})

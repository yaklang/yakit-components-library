import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import * as PackageApi from '../../src'
import { outlineIconNameCatalog } from '../../src/figmaNameCatalog'
import { outlineIconRegistry } from '../../src/registry'
import { expectIconColor } from '../helpers/browser-paint'
import { cleanup, render } from '../helpers/render'
import { outline as outlineSource } from '../helpers/sources'

const registryTree = (props: Record<string, unknown>) => (
  <div style={{ color: '#2468ac' }}>
    {outlineIconRegistry.map(({ Component, exportName }) => (
      <Component data-icon-name={exportName} key={exportName} {...props} />
    ))}
  </div>
)
afterEach(cleanup)

describe('Outline public component API', () => {
  it('exposes every inventoried current Figma icon from the package root', () => {
    const currentNames = outlineSource.records.map(({ exportName }) => exportName).sort()
    const registryNames = outlineIconRegistry.map(({ exportName }) => exportName).sort()

    expect(currentNames).toContain('LandPlotOutlined')
    expect(currentNames).toEqual(expect.arrayContaining(['SunOutlined', 'EarOutlined', 'RocketLaunchOffOutlined']))
    expect(registryNames).toEqual(currentNames)
    expect(
      outlineIconRegistry.every(
        ({ Component, exportName }) =>
          (PackageApi as Record<string, unknown>)[exportName] === Component && Component.displayName === exportName,
      ),
    ).toBe(true)
  })

  it('uses complete Figma names as registry names without changing public exports', () => {
    expect(
      outlineIconRegistry.map(({ Component: _Component, name, ...metadata }) => ({
        ...metadata,
        name,
      })),
    ).toEqual(
      outlineIconNameCatalog.map((entry) => ({
        ...entry,
        name: entry.figmaName ?? entry.exportName,
      })),
    )
  })

  it('updates color, style precedence and both forms of inheritance for every Outline export', () => {
    const { container, rerender } = render(registryTree({ color: '#123456' }))
    const wrapper = container.querySelector<HTMLElement>('[data-icon-name="QuestionMarkCircleOutlined"]')!
    const checkColors = (color: string) => {
      const svgs = container.querySelectorAll<SVGSVGElement>('svg')
      expect(svgs).toHaveLength(outlineIconRegistry.length)
      for (const svg of svgs) expectIconColor(svg, color)
    }
    checkColors('rgb(18, 52, 86)')
    expect(wrapper.style.color).toBe('rgb(18, 52, 86)')
    expect(wrapper.querySelector('svg')!.style.color).toBe('')

    rerender(registryTree({ color: 'inherit' }))
    checkColors('rgb(36, 104, 172)')

    rerender(registryTree({ color: '#123456', style: { color: '#654321' } }))
    checkColors('rgb(101, 67, 33)')
    expect(wrapper.style.color).toBe('rgb(101, 67, 33)')

    rerender(registryTree({ style: { color: 'inherit' } }))
    checkColors('rgb(36, 104, 172)')
  })
})

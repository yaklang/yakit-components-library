import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import { DEFAULT_ICON_COLOR } from '../../src/createIcon'
import { iconRegistry } from '../../src/registry'
import { expectIconColor, expectSolidColor, expectStrokeWidths, getSolidPaint } from '../helpers/browser-paint'
import { iconExports } from '../icons/icon-inventory'

const usesDarkDefault = (name: string) => name === 'EarOutlined' || name === 'SunOutlined'

function expectMonochromeArtwork(svg: SVGSVGElement, size: number) {
  expect(svg.getAttribute('viewBox')).toBe(`0 0 ${size} ${size}`)
  const shapes = [...svg.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon, use')].filter(
    (element) => !element.closest('defs, clipPath, mask'),
  )
  expect(shapes.length).toBeGreaterThan(0)
  const placeholder =
    shapes.length === 1 &&
    shapes[0].tagName.toLowerCase() === 'rect' &&
    [String(size), '100%'].includes(shapes[0].getAttribute('width') ?? '') &&
    [String(size), '100%'].includes(shapes[0].getAttribute('height') ?? '')
  expect(placeholder).toBe(false)
}

describe('registered icons in the browser', () => {
  it('renders the registered exports with their public wrapper, artwork, default paint and widths', () => {
    expect(iconRegistry.map(({ exportName }) => exportName).sort()).toEqual([...iconExports.registry].sort())
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      flushSync(() =>
        root.render(
          <>
            {iconRegistry.map(({ Component, exportName }) => (
              <Component key={exportName} data-icon-name={exportName} />
            ))}
          </>,
        ),
      )
      expect(container.querySelectorAll(':scope > span.anticon.yakit-icon')).toHaveLength(iconRegistry.length)
      expect(container.querySelectorAll(':scope > svg')).toHaveLength(0)
      const svgs = container.querySelectorAll<SVGSVGElement>(':scope > span > svg')
      expect(svgs).toHaveLength(iconRegistry.length)
      const solidPaint: ReturnType<typeof getSolidPaint>[] = []
      for (const [i, svg] of svgs.entries()) {
        const { family, exportName } = iconRegistry[i]
        const wrapper = svg.parentElement!
        expect(wrapper.dataset.iconName).toBe(exportName)
        expectStrokeWidths(svg, exportName)
        if (family === 'colorful') continue
        expectMonochromeArtwork(svg, family === 'outline' ? 24 : 20)
        const dark = usesDarkDefault(exportName)
        expect(svg.style.color).toBe('')
        expect(wrapper.style.getPropertyValue('--yakit-icon-default-color')).toBe(dark ? '#0A0A0A' : DEFAULT_ICON_COLOR)
        if (family === 'solid') solidPaint.push(getSolidPaint(svg))
        else expectIconColor(svg, dark ? 'rgb(10, 10, 10)' : 'rgb(53, 54, 57)')
      }
      for (const paint of solidPaint) expectSolidColor(paint, 'rgb(53, 54, 57)')
      container.style.setProperty('--Colors-Use-Neutral-Text-1-Title', '#2468ac')
      for (const paint of solidPaint) expectSolidColor(paint, 'rgb(36, 104, 172)')
      for (const [i, svg] of svgs.entries()) {
        const { family, exportName } = iconRegistry[i]
        if (family === 'outline')
          expect(getComputedStyle(svg).color, exportName).toBe(
            usesDarkDefault(exportName) ? 'rgb(10, 10, 10)' : 'rgb(36, 104, 172)',
          )
      }
    } finally {
      root.unmount()
      container.remove()
    }
  })
})

import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { outlineStrokeContract } from '../../config/iconStrokeContract.generated'
import { HomeOutlined, Loading } from '../../src'
import { outlineIconRegistry } from '../../src/registry'
import { cleanup, render } from '../helpers/render'
import { iconCounts } from '../icons/icon-inventory'

const strokeWidths = (container: Element) => {
  const visible = new Set<string>()
  const white = new Set<string>()
  for (const element of container.querySelectorAll<SVGElement>('[stroke]')) {
    const style = getComputedStyle(element)
    const width = style.strokeWidth
    if (!element.closest('defs, mask, clipPath') && style.stroke !== 'none') visible.add(width)
    if (element.matches('path[stroke="white"]')) white.add(width)
  }
  return { visible, white }
}

const adjustable = outlineIconRegistry.filter(
  ({ sourceNodeId }) =>
    outlineStrokeContract[`${sourceNodeId.replace(':', '-')}.svg` as keyof typeof outlineStrokeContract]
      .classification === 'adjustable',
)
const adjustableNames = adjustable.map(({ exportName }) => exportName)

afterEach(cleanup)

describe('adjustable icon runtime stroke contract', () => {
  it('includes the adjustable Outline icons and representative mixed artwork', () => {
    expect(adjustable).toHaveLength(iconCounts.outline - 11)
    expect(adjustableNames).toEqual(
      expect.arrayContaining([
        'BugOutlined',
        'HomeOutlined',
        'ColorSwatchOutlined',
        'StarOffOutlined',
        'RocketLaunchOffOutlined',
      ]),
    )
  })

  it('uses svgProps.style.strokeWidth first and restores the source default after rerender', () => {
    const { container, rerender } = render(<HomeOutlined svgProps={{ strokeWidth: 1, style: { strokeWidth: 2 } }} />)
    expect(strokeWidths(container).visible).toEqual(new Set(['2px']))

    rerender(<HomeOutlined svgProps={{ strokeWidth: 3 }} />)
    expect(strokeWidths(container).visible).toEqual(new Set(['3px']))

    rerender(<HomeOutlined />)
    expect(strokeWidths(container).visible).toEqual(new Set(['1.5px']))
  })

  it('keeps two adjustable instances isolated', () => {
    const { container } = render(
      <React.Fragment>
        <HomeOutlined data-width="1" svgProps={{ strokeWidth: 1 }} />
        <HomeOutlined data-width="3" svgProps={{ strokeWidth: 3 }} />
      </React.Fragment>,
    )
    expect(strokeWidths(container.querySelector('[data-width="1"]')!).visible).toEqual(new Set(['1px']))
    expect(strokeWidths(container.querySelector('[data-width="3"]')!).visible).toEqual(new Set(['3px']))
  })

  it('allows author CSS on a shape to override its presentation width', () => {
    const { container } = render(
      <React.Fragment>
        <style>{'.stroke-css-proof path { stroke-width: 2.5px; }'}</style>
        <HomeOutlined className="stroke-css-proof" svgProps={{ strokeWidth: 1 }} />
      </React.Fragment>,
    )
    expect(container.querySelector('path')?.getAttribute('stroke-width')).toBe('1')
    expect(strokeWidths(container).visible).toEqual(new Set(['2.5px']))
  })

  it('applies all supported numeric widths and the default to every adjustable Outline and Loading', () => {
    const { container, rerender } = render(null)
    const expectedNames = [...adjustableNames, 'Loading']
    for (const strokeWidth of [0, undefined, 1, 1.5, 2, 3]) {
      rerender(
        <React.Fragment>
          {adjustable.map(({ Component, exportName }) => (
            <Component data-icon-name={exportName} key={exportName} svgProps={{ strokeWidth }} />
          ))}
          <Loading data-icon-name="Loading" svgProps={{ strokeWidth }} />
        </React.Fragment>,
      )
      const expectedWidths = new Set([`${strokeWidth ?? 1.5}px`])
      const icons = container.querySelectorAll<HTMLElement>('[data-icon-name]')
      expect(Array.from(icons, (icon) => icon.dataset.iconName)).toEqual(expectedNames)
      for (const [index, icon] of icons.entries()) {
        const exportName = expectedNames[index]
        const widths = strokeWidths(icon)
        expect(widths.visible, exportName).toEqual(expectedWidths)
        if (exportName === 'StarOffOutlined' || exportName === 'RocketLaunchOffOutlined') {
          expect(widths.white, exportName).toEqual(expectedWidths)
        }
        if (exportName === 'ColorSwatchOutlined' && strokeWidth === 0) {
          const circle = icon.querySelector('circle[fill="currentColor"]')
          expect(circle).not.toBeNull()
          expect(getComputedStyle(circle!).fill).not.toBe('none')
        }
      }
    }
  })

  it.each(['1px', '5%'])('preserves browser-supported width units %s', (strokeWidth) => {
    const { container } = render(<HomeOutlined svgProps={{ strokeWidth }} />)
    expect(strokeWidths(container).visible).toEqual(new Set([strokeWidth]))
  })
})

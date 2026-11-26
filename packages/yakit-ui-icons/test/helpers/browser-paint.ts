import { expect } from 'vitest'

import { iconExports } from '../icons/icon-inventory'

import { solid as solidSource } from './sources'
export const expectIconColor = (svg: SVGSVGElement, expected: string) => {
  const wrapper = svg.parentElement!
  expect(getComputedStyle(wrapper).color, wrapper.dataset.iconName).toBe(expected)
  expect(getComputedStyle(svg).color, wrapper.dataset.iconName).toBe(expected)
}

export function getSolidPaint(svg: SVGSVGElement) {
  const iconName = (svg.parentElement as HTMLSpanElement).dataset.iconName
  const primary = [...svg.querySelectorAll<SVGElement>('[fill="currentColor"], [stroke="currentColor"]')]
  expect(primary.length, iconName).toBeGreaterThan(0)
  return { primary, iconName }
}

export function expectSolidColor({ primary, iconName }: ReturnType<typeof getSolidPaint>, expectedColor: string) {
  for (const element of primary) {
    const style = getComputedStyle(element)
    if (element.getAttribute('fill') === 'currentColor') {
      expect(style.fill, iconName).toBe(expectedColor)
    }
    if (element.getAttribute('stroke') === 'currentColor') {
      expect(style.stroke, iconName).toBe(expectedColor)
    }
  }
}

export const expectStrokeWidths = (element: Element, name: string) => {
  const selector = 'path,circle,ellipse,line,polyline,polygon,rect,use,text'
  const solid = solidSource.records.find((record) => record.exportName === name)
  const raw = solid
    ? new DOMParser().parseFromString(solid.raw.svg, 'image/svg+xml').querySelectorAll(selector)
    : undefined
  for (const [index, drawable] of [...element.querySelectorAll(selector)].entries()) {
    const style = getComputedStyle(drawable)
    if (style.stroke !== 'none') {
      // SVGs without a width declaration retain the browser's inherited default.
      const declaredWidth = drawable.closest('[stroke-width], [style*="stroke-width"]')
      const sourceOwner = raw?.[index]?.closest('[stroke-width], [style*="stroke-width"]')
      const sourceWidth =
        (sourceOwner as SVGElement | undefined)?.style?.strokeWidth || sourceOwner?.getAttribute('stroke-width') || '1'
      const declared =
        (declaredWidth as SVGElement | null)?.style?.strokeWidth || declaredWidth?.getAttribute('stroke-width') || '1'
      const expectedWidth = solid
        ? `${sourceWidth}px`
        : iconExports.outline.includes(name)
          ? declaredWidth
            ? '1.5px'
            : '1px'
          : `${Number.parseFloat(declared)}px`
      expect(style.strokeWidth, `${name}: ${drawable.outerHTML}`).toBe(expectedWidth)
    }
  }
}

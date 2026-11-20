import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import * as PackageApi from '../../src'
import { colorfulIconRegistry } from '../../src/registry'

const roots: Root[] = []

const render = (node: React.ReactNode) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  flushSync(() => root.render(node))
  return container
}

const paintAttributes = (svg: SVGSVGElement) =>
  [...svg.querySelectorAll<SVGElement>('*')]
    .flatMap((element) =>
      ['fill', 'stroke'].flatMap((attribute) => {
        const value = element.getAttribute(attribute)
        return value && value !== 'none' ? [`${attribute}:${value}`] : []
      }),
    )
    .sort()

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount())
  document.body.replaceChildren()
})

describe('Colorful public component API', () => {
  it('exposes every colorful registry component from the package root', () => {
    expect(colorfulIconRegistry.length).toBeGreaterThan(0)
    expect(
      colorfulIconRegistry.every(
        ({ Component, exportName }) =>
          (PackageApi as Record<string, unknown>)[exportName] === Component && Component.displayName === exportName,
      ),
    ).toBe(true)
  })

  it('preserves literal paint attributes when consumers set color', () => {
    const literal = colorfulIconRegistry.find(({ paintMode }) => paintMode === 'literal')
    expect(literal).toBeTruthy()
    if (!literal) return

    const defaultSvg = render(<literal.Component />).querySelector('svg')
    const overrideSvg = render(<literal.Component color="#123456" />).querySelector('svg')

    expect(defaultSvg).not.toBeNull()
    expect(overrideSvg).not.toBeNull()
    expect(paintAttributes(overrideSvg!)).toEqual(paintAttributes(defaultSvg!))
    expect(paintAttributes(defaultSvg!).some((paint) => !paint.endsWith(':currentColor'))).toBe(true)
  })

  it('keeps intrinsic dimensions for a non-square colorful icon without size', () => {
    const rendered = colorfulIconRegistry.map(({ Component }) => ({
      container: render(<Component />),
      Component,
    }))
    const representative = rendered.find(({ container }) => {
      const svg = container.querySelector('svg')
      return svg && svg.getAttribute('width') !== svg.getAttribute('height')
    })

    expect(representative).toBeTruthy()
    const svg = representative?.container.querySelector('svg')
    expect(svg?.getAttribute('width')).not.toBe(svg?.getAttribute('height'))
  })

  it('applies a square outer size without changing a non-square viewBox', () => {
    const intrinsic = colorfulIconRegistry
      .map(({ Component }) => ({ Component, svg: render(<Component />).querySelector('svg') }))
      .find(({ svg }) => svg && svg.getAttribute('width') !== svg.getAttribute('height'))
    expect(intrinsic?.svg).toBeTruthy()
    if (!intrinsic?.svg) return

    const originalViewBox = intrinsic.svg.getAttribute('viewBox')
    const sized = render(<intrinsic.Component size={32} />).querySelector('svg')

    expect(sized?.getAttribute('width')).toBe('32')
    expect(sized?.getAttribute('height')).toBe('32')
    expect(sized?.getAttribute('viewBox')).toBe(originalViewBox)
  })
})

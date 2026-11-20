import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import { outlineIconRegistry, solidIconRegistry } from '../../src/registry'

// Current artwork is allowed to change. Only rendering rules are checked here.
describe('current monochrome rendering', () => {
  it.each([
    ['outline', outlineIconRegistry, 24],
    ['solid', solidIconRegistry, 20],
  ] as const)('%s renders every registered icon without an empty or placeholder glyph', (_family, registry, size) => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    try {
      flushSync(() =>
        root.render(
          <>
            {registry.map(({ Component, exportName }) => (
              <Component key={exportName} data-name={exportName} />
            ))}
          </>,
        ),
      )
      const svgs = [...container.querySelectorAll('svg')]
      expect(svgs).toHaveLength(registry.length)
      for (const svg of svgs) {
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
    } finally {
      root.unmount()
      container.remove()
    }
  })
})

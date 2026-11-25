import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import * as PackageApi from '../../src'
import { colorfulIconRegistry } from '../../src/registry'
import { cleanup, render } from '../helpers/render'
import { colorful as colorfulSource } from '../helpers/sources'

const paintAttributes = (svg: SVGSVGElement) =>
  [...svg.querySelectorAll<SVGElement>('*')]
    .flatMap((element) =>
      ['fill', 'stroke'].flatMap((attribute) => {
        const value = element.getAttribute(attribute)
        return value && value !== 'none' ? [`${attribute}:${value}`] : []
      }),
    )
    .sort()

afterEach(cleanup)

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

    const { container, rerender } = render(<literal.Component />)
    const defaultSvg = container.querySelector('svg')!
    expect(defaultSvg).not.toBeNull()
    const defaultPaint = paintAttributes(defaultSvg)
    rerender(<literal.Component color="#123456" />)
    const overrideSvg = container.querySelector('svg')!
    expect(overrideSvg).not.toBeNull()
    expect(paintAttributes(overrideSvg)).toEqual(defaultPaint)
    expect(defaultPaint.some((paint) => !paint.endsWith(':currentColor'))).toBe(true)
  })

  it('keeps intrinsic non-square dimensions by default and preserves the viewBox at a square size', () => {
    const parser = new DOMParser()
    const record = colorfulSource.records.find(({ publicExposure, raw }) => {
      if (publicExposure !== 'canonical') return false
      const source = parser.parseFromString(raw.svg, 'image/svg+xml').documentElement
      const width = source.getAttribute('width'),
        height = source.getAttribute('height')
      return width && height && width !== height
    })
    const entry = colorfulIconRegistry.find(({ sourceNodeId }) => sourceNodeId === record?.nodeId)
    if (!entry) throw new Error('Expected a registered non-square Colorful icon')
    const { Component } = entry
    const { container, rerender } = render(<Component />)
    const intrinsic = container.querySelector('svg')!
    expect(intrinsic.getAttribute('width')).toBeTruthy()
    expect(intrinsic.getAttribute('height')).toBeTruthy()
    expect(intrinsic.getAttribute('width')).not.toBe(intrinsic.getAttribute('height'))
    const viewBox = intrinsic.getAttribute('viewBox')
    expect(viewBox).toBeTruthy()
    rerender(<Component size={32} />)
    const sized = container.querySelector('svg')
    expect(sized?.getAttribute('width')).toBe('32')
    expect(sized?.getAttribute('height')).toBe('32')
    expect(sized?.getAttribute('viewBox')).toBe(viewBox)
  })
})

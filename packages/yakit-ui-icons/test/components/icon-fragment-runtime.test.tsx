import React, { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  AddPayloadOutlined,
  DataComparisonOutlined,
  Goal2Outlined,
  LogoOutlined,
  RocketOffOutlined,
  StarOffOutlined,
  Wrench1Outlined,
} from '../../src'
import {
  expectOwnedFragments,
  expectHydration,
  readFragmentFixtures,
  fragmentReferences,
} from '../helpers/browser-fragments'
import { outlineFragments as repeatedFragments } from '../helpers/fragment-trees'

const roots: Root[] = []

const render = (node: React.ReactNode) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  flushSync(() => root.render(node))
  return container
}

let fixtures: Awaited<ReturnType<typeof readFragmentFixtures>>
beforeAll(async () => {
  fixtures = await readFragmentFixtures('ssr-fragment-fixtures.json')
})

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount())
  document.body.replaceChildren()
})

describe('Outline icon fragment runtime', () => {
  it('omits retired reconstructed clips from source-native instances', () => {
    const container = render(
      <>
        <DataComparisonOutlined svgProps={{ strokeWidth: 1 }} />
        <DataComparisonOutlined svgProps={{ strokeWidth: 3 }} />
        <RocketOffOutlined svgProps={{ strokeWidth: 1 }} />
        <RocketOffOutlined svgProps={{ strokeWidth: 3 }} />
      </>,
    )
    expect(container.querySelectorAll('clipPath')).toHaveLength(0)
    expect(container.querySelectorAll('[clip-path]')).toHaveLength(0)
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0)
    for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) expect(fragmentReferences(svg)).toEqual([])
  })
  it('assigns unique definition IDs to repeated instances', () => {
    const container = render(
      <>
        <LogoOutlined />
        <LogoOutlined />
      </>,
    )
    expectOwnedFragments(container)
  })

  it('resolves every fragment reference inside its owning SVG instance', () => {
    const container = render(
      <StrictMode>
        <AddPayloadOutlined />
        <Goal2Outlined />
        <LogoOutlined />
        <StarOffOutlined />
        <Wrench1Outlined />
      </StrictMode>,
    )

    expectOwnedFragments(container)
  })

  it.each(['default', 'custom'] as const)(
    'hydrates %s identifiers without warnings or fragment drift',
    async (fixtureName) => {
      const container = await expectHydration(repeatedFragments, fixtures[fixtureName], roots)
      expect(container.querySelectorAll(':scope > span.anticon.yakit-icon')).toHaveLength(3)
    },
  )

  it('preserves fragment ownership across StrictMode mount and unmount cycles', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const container = document.createElement('div')
      document.body.append(container)
      const root = createRoot(container)
      flushSync(() => root.render(<StrictMode>{repeatedFragments}</StrictMode>))
      expectOwnedFragments(container)
      flushSync(() => root.unmount())
      container.remove()
    }
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

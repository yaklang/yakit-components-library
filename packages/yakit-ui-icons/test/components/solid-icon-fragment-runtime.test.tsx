import React, { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { solidIconRegistry } from '../../src/registry'
import { expectOwnedFragments, expectHydration, readFragmentFixtures } from '../helpers/browser-fragments'
import { solidFragments as repeatedFragments } from '../helpers/fragment-trees'

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
  fixtures = await readFragmentFixtures('solid-ssr-fragment-fixtures.json')
})

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount())
  document.body.replaceChildren()
})

describe('Solid fragment runtime ownership', () => {
  it('assigns unique IDs to repeated and adversarial mixed fragment icons', () => {
    expectOwnedFragments(render(repeatedFragments), 4)
  })

  it('keeps all 256 registry sources owner-local when the whole family is mounted twice', () => {
    const container = render(
      <StrictMode>
        {[0, 1].flatMap((copy) =>
          solidIconRegistry.map(({ Component, exportName }) => <Component key={`${copy}-${exportName}`} />),
        )}
      </StrictMode>,
    )
    expect(container.querySelectorAll('svg')).toHaveLength(512)
    expectOwnedFragments(container, 4)
  })

  it.each(['default', 'custom'] as const)(
    'hydrates %s identifiers without warnings or fragment drift',
    async (fixtureName) => {
      await expectHydration(repeatedFragments, fixtures[fixtureName], roots, 4)
    },
  )

  it('preserves ownership across StrictMode mount/unmount cycles', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const container = document.createElement('div')
      document.body.append(container)
      const root = createRoot(container)
      flushSync(() => root.render(<StrictMode>{repeatedFragments}</StrictMode>))
      expectOwnedFragments(container, 4)
      flushSync(() => root.unmount())
      container.remove()
    }
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})

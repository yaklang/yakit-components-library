import React, { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { colorfulIconRegistry } from '../../src/registry'
import type { IconComponent } from '../../src/types'
import { fragmentReferences, expectOwnedFragments, expectHydration } from '../helpers/browser-fragments'

const roots: Root[] = []

const render = (node: React.ReactNode, identifierPrefix?: string) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container, identifierPrefix ? { identifierPrefix } : undefined)
  roots.push(root)
  flushSync(() => root.render(node))
  return container
}

afterEach(() => {
  roots.splice(0).forEach((root) => root.unmount())
  document.body.replaceChildren()
})

describe('Colorful fragment runtime ownership', () => {
  let fragmentComponents: IconComponent[]
  beforeAll(() => {
    const markup = renderToString(
      <>
        {colorfulIconRegistry.map(({ Component, exportName }) => (
          <Component key={exportName} data-icon-name={exportName} />
        ))}
      </>,
      { identifierPrefix: 'fragment-scan-' },
    )
    const fixture = new DOMParser().parseFromString(markup, 'text/html')
    const fragmentNames = new Set(
      [...fixture.querySelectorAll<SVGSVGElement>('[data-icon-name] > svg')]
        .filter((svg) => fragmentReferences(svg).length > 0)
        .map((svg) => svg.parentElement?.dataset.iconName),
    )
    fragmentComponents = colorfulIconRegistry
      .filter(({ exportName }) => fragmentNames.has(exportName))
      .map(({ Component }) => Component)
    expect(fragmentComponents.length).toBeGreaterThan(0)
  })

  it('isolates owner IDs when every fragment-bearing icon is mounted repeatedly', () => {
    fragmentComponents.forEach((Component, index) => {
      expectOwnedFragments(
        render(
          <>
            <Component />
            <Component />
          </>,
          `colorful-all-${index}-`,
        ),
      )
    })
  })

  it('keeps references isolated across roots with distinct identifier prefixes', () => {
    const [Component] = fragmentComponents

    const first = render(<Component />, 'colorful-first-')
    const second = render(<Component />, 'colorful-second-')
    const firstIds = expectOwnedFragments(first)
    const secondIds = expectOwnedFragments(second)
    expect([...secondIds].every((id) => !firstIds.has(id))).toBe(true)
  })

  it('hydrates matching server and client prefixes without fragment drift', async () => {
    const [Component] = fragmentComponents
    const tree = (
      <StrictMode>
        <Component />
        <Component />
      </StrictMode>
    )
    const identifierPrefix = 'colorful-hydration-'
    const markup = renderToString(tree, { identifierPrefix })
    const serverIds = [...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1])
    await expectHydration(tree, { identifierPrefix, markup, serverIds }, roots)
  })

  it('proves independent SSR roots require distinct identifier prefixes', () => {
    const [Component] = fragmentComponents
    const tree = <Component />
    const ids = (markup: string) => new Set([...markup.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]))
    const first = ids(renderToString(tree, { identifierPrefix: 'root-one-' }))
    const distinct = ids(renderToString(tree, { identifierPrefix: 'root-two-' }))
    const repeated = ids(renderToString(tree, { identifierPrefix: 'root-one-' }))

    expect([...distinct].every((id) => !first.has(id))).toBe(true)
    expect([...repeated].some((id) => first.has(id))).toBe(true)
  })

  it('preserves owner-local fragments across StrictMode mount cycles', () => {
    const [Component] = fragmentComponents
    for (let cycle = 0; cycle < 3; cycle += 1) {
      const container = render(
        <StrictMode>
          <Component />
          <Component />
        </StrictMode>,
      )
      expectOwnedFragments(container)
      const root = roots.pop()
      flushSync(() => root?.unmount())
      container.remove()
    }
  })
})

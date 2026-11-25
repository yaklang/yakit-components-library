import type { ReactElement } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { expect, vi } from 'vitest'
export const fragmentReferences = (svg: SVGSVGElement) =>
  [svg, ...svg.querySelectorAll<SVGElement>('*')].flatMap((element) => {
    const attributeReferences = [...element.attributes].flatMap(({ name, value }) => {
      const references = [...value.matchAll(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g)].map((match) => match[2])
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) {
        references.push(value.slice(1))
      }
      if (name === 'aria-labelledby' || name === 'aria-describedby') {
        references.push(...value.trim().split(/\s+/).filter(Boolean))
      }
      return references
    })
    const styleReferences =
      element.tagName.toLowerCase() === 'style'
        ? [...(element.textContent ?? '').matchAll(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g)].map((match) => match[2])
        : []
    return [...attributeReferences, ...styleReferences]
  })

export const expectOwnedFragments = (container: HTMLElement, expectedIds?: number) => {
  const ids = [...container.querySelectorAll<SVGElement>('svg [id]')].map(({ id }) => id)
  if (expectedIds === undefined) expect(ids.length).toBeGreaterThan(0)
  else expect(ids).toHaveLength(expectedIds)
  const uniqueIds = new Set(ids)
  expect(uniqueIds.size).toBe(ids.length)

  for (const svg of container.querySelectorAll<SVGSVGElement>('svg')) {
    for (const reference of new Set(fragmentReferences(svg))) {
      expect(svg.querySelector(`[id="${CSS.escape(reference)}"]`), reference).not.toBeNull()
      expect(document.querySelectorAll(`[id="${CSS.escape(reference)}"]`)).toHaveLength(1)
    }
  }
  return uniqueIds
}

interface SsrFixture {
  identifierPrefix?: string
  markup: string
  serverIds: string[]
}

export async function readFragmentFixtures(filename: string): Promise<Record<'default' | 'custom', SsrFixture>> {
  const response = await fetch('/test-results/icons/' + filename)
  if (!response.ok) throw new Error(`SSR fixture ${filename} unavailable: ${response.status}`)
  return response.json()
}

export async function expectHydration(tree: ReactElement, fixture: SsrFixture, roots: Root[], expectedIds?: number) {
  const container = document.createElement('div')
  document.body.append(container)
  container.innerHTML = fixture.markup
  const errors: unknown[] = []
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  try {
    roots.push(
      hydrateRoot(container, tree, {
        identifierPrefix: fixture.identifierPrefix,
        onRecoverableError: (e) => errors.push(e),
      }),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(errors).toEqual([])
    expect(error).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect([...container.querySelectorAll('[id]')].map((node) => node.id)).toEqual(fixture.serverIds)
    expectOwnedFragments(container, expectedIds)
    return container
  } finally {
    error.mockRestore()
    warn.mockRestore()
  }
}

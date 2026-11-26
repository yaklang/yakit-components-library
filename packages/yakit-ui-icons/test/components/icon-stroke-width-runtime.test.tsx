import React, { createRef } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import * as Icons from '../../src'
import * as OldIcons from '../../src/oldicon'
import { expectStrokeWidths } from '../helpers/browser-paint'
import { iconExports } from '../icons/icon-inventory'

let root: Root | undefined
let container: HTMLDivElement
const render = (node: React.ReactNode) => {
  root?.unmount()
  container?.remove()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  flushSync(() => root!.render(node))
  return container
}
afterEach(() => {
  root?.unmount()
  root = undefined
  container?.remove()
})

describe('default width across every rendered icon', () => {
  it('preserves default widths for the hand-maintained Oldicon exports and Loading', () => {
    expect(Object.keys(OldIcons).sort()).toEqual([...iconExports.oldicon].sort())
    expect(Object.keys(Icons).sort()).toEqual([...iconExports.root].sort())
    const icons = [...Object.entries(OldIcons), ['Loading', Icons.Loading] as const]
    for (let index = 0; index < icons.length; index += 24) {
      const batch = icons.slice(index, index + 24)
      const mounted = render(
        <>
          {batch.map(([name, Icon]) => (
            <Icon key={name} data-icon-name={name} />
          ))}
        </>,
      )
      for (const [name] of batch) {
        const icon = mounted.querySelector(`[data-icon-name="${name}"]`)!
        expect(icon.querySelector('svg'), name).not.toBeNull()
        expectStrokeWidths(icon, name)
      }
    }
  }, 30000)

  it('preserves size, color, aria, ref and caller-owned SVG presentation overrides', () => {
    const ref = createRef<HTMLSpanElement>()
    const mounted = render(
      <Icons.Loading
        ref={ref}
        aria-label="Loading"
        size={32}
        color="#123456"
        svgProps={{ strokeWidth: 3, style: { opacity: 0.5 } }}
      />,
    )
    const svg = mounted.querySelector('svg')!
    expect(ref.current).toBe(mounted.firstElementChild)
    expect(ref.current?.getAttribute('aria-label')).toBe('Loading')
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('stroke-width')).toBe('3')
    expect(getComputedStyle(svg).opacity).toBe('0.5')
    // Loading binds the presentation override to its actual stroke.
    expect(getComputedStyle(svg.querySelector('path')!).strokeWidth).toBe('3px')
    expect(getComputedStyle(svg.querySelector('path')!).stroke).toBe('rgb(18, 52, 86)')
  })
})

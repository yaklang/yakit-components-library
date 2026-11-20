import React from 'react'
import { flushSync } from 'react-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import Input from '../../src/components/Input'
import InputNumber from '../../src/components/InputNumber'
import manifest from '../fixtures/figma/input-family-manifest.json'
import { cleanup, render } from '../helpers/render'

beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'light')
})

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
})

const inputFixture = manifest.fixtures.find((fixture) => fixture.component === 'Input')
const searchFixture = manifest.fixtures.find((fixture) => fixture.component === 'Search')

if (!inputFixture || !('tokens' in inputFixture) || !searchFixture) {
  throw new Error('Input and Search Figma fixtures are required')
}

describe('Figma-derived Input visual contract', () => {
  it('uses manifest size geometry for every Input size', () => {
    Object.entries(inputFixture.sizes).forEach(([size, expectedHeight]) => {
      const { container } = render(<Input size={size as 'small' | 'medium' | 'large'} />)
      const input = container.querySelector('input')
      if (!input) throw new Error(`expected ${size} Input`)

      expect(parseFloat(getComputedStyle(input).height)).toBe(expectedHeight)
    })
  })

  it('uses manifest radius and neutral border tokens', () => {
    const { container } = render(<Input />)
    const input = container.querySelector('input')
    if (!input) throw new Error('expected Input')
    const style = getComputedStyle(input)

    expect(parseFloat(style.borderRadius)).toBe(inputFixture.tokens.radius)
    expect(style.borderTopColor).toBe('rgb(230, 232, 237)')
    expect(inputFixture.tokens.border).toBe('#E6E8ED')
  })

  it('uses manifest focus border and ring tokens', async () => {
    const { container } = render(<Input />)
    const input = container.querySelector('input')
    if (!input) throw new Error('expected Input')

    flushSync(() => input.focus())
    expect(input.className).toContain('yakit-input-focused')
    await new Promise((resolve) => setTimeout(resolve, 250))
    const style = getComputedStyle(input)

    expect(style.getPropertyValue('--Colors-Use-Main-Primary')).toBe('#f28c45')
    expect(style.borderTopColor).toBe('rgb(242, 140, 69)')
    expect(style.boxShadow).toContain('rgb(252, 229, 214)')
    expect(inputFixture.tokens.focusRing).toBe('#FCE5D6')
  })

  it('uses manifest error and disabled field tokens', () => {
    const error = render(<Input error />).container.querySelector('input')
    const disabled = render(<Input disabled />).container.querySelector('input')
    if (!error || !disabled) throw new Error('expected error and disabled Input')

    expect(getComputedStyle(error).borderTopColor).toBe('rgb(248, 171, 171)')
    expect(getComputedStyle(disabled).backgroundColor).toBe('rgb(238, 240, 243)')
    expect(inputFixture.tokens.errorBorder).toBe('#F8ABAB')
    expect(inputFixture.tokens.disabledBackground).toBe('#EEF0F3')
  })

  it('does not turn the Figma 400px specimen into a component width default', () => {
    const { container } = render(<Input />)

    expect(container.querySelector<HTMLElement>('.yakit-input')?.style.width).toBe('')
  })
})

describe('Figma-derived Search visual contract', () => {
  it('uses manifest size geometry for every Search size', () => {
    Object.entries(searchFixture.sizes).forEach(([size, expectedHeight]) => {
      const { container } = render(<Input.Search size={size as 'small' | 'medium' | 'large' | 'huge'} />)
      const search = container.querySelector('.yakit-search-input')
      if (!search) throw new Error(`expected ${size} Search`)

      expect(parseFloat(getComputedStyle(search).height)).toBe(expectedHeight)
    })
  })

  it('keeps specimen widths in the manifest instead of applying them by default', () => {
    const box = render(<Input.Search variant="box" />).container.querySelector<HTMLElement>('.yakit-search-input')
    const dropdown = render(
      <Input.Search selector={{ options: [{ label: 'A', value: 'a' }] }} variant="dropdown" />,
    ).container.querySelector<HTMLElement>('.yakit-search-input')

    expect(box?.style.width).toBe('')
    expect(dropdown?.style.width).toBe('')
    expect(searchFixture.specimenWidths).toEqual({ box: 216, dropdown: 304 })
  })
})

describe('Figma fixture coverage boundary', () => {
  it('records InputNumber as uncovered instead of claiming numeric pixel parity', () => {
    const { container } = render(<InputNumber />)

    expect(container.querySelector('[role="spinbutton"]')).not.toBeNull()
    expect(manifest.inputNumber.designCoverage).toBe('none')
    expect(manifest.inputNumber.note).toContain('do not claim Figma parity')
  })
})

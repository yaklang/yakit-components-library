import React from 'react'
import { flushSync } from 'react-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Button from '../../src/components/Button'
import { cleanup, render } from '../helpers/render'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Button antd behavior', () => {
  it('forwards a ref and applies the medium size', () => {
    const ref = { current: null as HTMLButtonElement | null }
    const { container } = render(
      <Button ref={ref} size="medium">
        Medium
      </Button>,
    )
    const button = container.querySelector('button')

    expect(ref.current).toBe(button)
    expect(button).toHaveClass('yakit-btn-medium')
  })

  it('renders an anchor for href and blocks a disabled navigation', () => {
    const onClick = vi.fn()
    const { container } = render(
      <>
        <Button href="/docs" target="_blank">
          Docs
        </Button>
        <Button disabled href="/hidden" onClick={onClick}>
          Hidden
        </Button>
      </>,
    )
    const [link, disabledLink] = [...container.querySelectorAll('a')]

    expect(container.querySelector('button')).toBeNull()
    expect(link).toHaveAttribute('href', '/docs')
    expect(link).toHaveAttribute('target', '_blank')
    expect(disabledLink).not.toHaveAttribute('href')
    expect(disabledLink).toHaveAttribute('aria-disabled', 'true')
    disabledLink?.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('joins group items without turning a primary item into a selection', () => {
    const { container } = render(
      <Button.Group shape="round" size="huge">
        <Button>日</Button>
        <Button type="primary">周</Button>
        <Button disabled>月</Button>
      </Button.Group>,
    )
    const group = container.querySelector('[role="group"]')
    const [normal, primary, disabled] = [...container.querySelectorAll('button')]

    expect(group).toHaveClass('yakit-btn-group-round', 'yakit-btn-group-huge')
    expect(normal).toHaveClass('yakit-btn-in-group', 'yakit-btn-huge')
    expect(primary).toHaveClass('yakit-btn-primary')
    expect(primary).not.toHaveAttribute('aria-pressed')
    expect(container.querySelector('.yakit-btn-selected')).toBeNull()
    expect(disabled).toBeDisabled()
  })

  it('delays loading and then blocks interaction', () => {
    vi.useFakeTimers()
    const onClick = vi.fn()
    const { container } = render(
      <Button loading={{ delay: 200 }} onClick={onClick}>
        Wait
      </Button>,
    )
    const button = container.querySelector('button')

    expect(button).not.toBeDisabled()
    button?.click()
    expect(onClick).toHaveBeenCalledOnce()

    flushSync(() => {
      vi.advanceTimersByTime(200)
    })

    expect(button).toBeDisabled()
    onClick.mockClear()
    button?.click()
    expect(onClick).not.toHaveBeenCalled()
  })

  it('strips rest aria-busy (antd parity: Button never sets aria-busy)', () => {
    const { container } = render(
      <Button loading {...{ 'aria-busy': 'false' }}>
        Busy
      </Button>,
    )
    const button = container.querySelector('button')

    expect(button).not.toHaveAttribute('aria-busy')
  })

  it('keeps data-theme over same-named rest props', () => {
    const { container } = render(<Button {...{ 'data-theme': 'hijack' }}>Busy</Button>)
    const button = container.querySelector('button')

    expect(button?.getAttribute('data-theme')).not.toBe('hijack')
  })

  it('does not trigger the wave animation while disabled or loading', async () => {
    const disabled = render(
      <Button href="/docs" disabled>
        Docs
      </Button>,
    )
    disabled.container.querySelector('a')?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    const loading = render(
      <Button href="/docs" loading>
        Docs
      </Button>,
    )
    loading.container.querySelector('a')?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(disabled.container.querySelectorAll('.yakit-wave-holder')).toHaveLength(0)
    expect(loading.container.querySelectorAll('.yakit-wave-holder')).toHaveLength(0)
  })
})

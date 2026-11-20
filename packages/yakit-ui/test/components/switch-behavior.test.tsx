import { userEvent } from '@vitest/browser/context'
import React, { createRef } from 'react'
import { flushSync } from 'react-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Switch, YakitSwitch, type SwitchRef } from '../../src/components'
import ConfigProvider from '../../src/components/ConfigProvider'
import { cleanup, render } from '../helpers/render'

afterEach(cleanup)

const getSwitch = (container: HTMLElement) => {
  const button = container.querySelector<HTMLButtonElement>('button[role="switch"]')
  if (!button) throw new Error('expected a Switch button')
  return button
}

describe('Switch toggle behavior', () => {
  it('exports Switch and its Yakit alias from the public component entry', () => {
    expect(YakitSwitch).toBe(Switch)
  })

  it('toggles an uncontrolled value and emits onChange / onClick', () => {
    const onChange = vi.fn()
    const onClick = vi.fn()
    const { container } = render(<Switch defaultChecked={false} onChange={onChange} onClick={onClick} />)
    const button = getSwitch(container)

    expect(button.getAttribute('aria-checked')).toBe('false')
    flushSync(() => button.click())

    expect(button.getAttribute('aria-checked')).toBe('true')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toBe(true)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick.mock.calls[0][0]).toBe(true)
  })

  it('keeps a controlled value authoritative', () => {
    const onChange = vi.fn()
    const { container } = render(<Switch checked={false} onChange={onChange} />)
    const button = getSwitch(container)

    flushSync(() => button.click())
    expect(onChange).toHaveBeenCalledWith(true, expect.anything())
    expect(button.getAttribute('aria-checked')).toBe('false')
  })

  it('does not toggle while disabled or loading', () => {
    const onChange = vi.fn()
    const disabled = render(<Switch defaultChecked={false} disabled onChange={onChange} />)
    flushSync(() => getSwitch(disabled.container).click())
    expect(onChange).not.toHaveBeenCalled()
    expect(getSwitch(disabled.container).disabled).toBe(true)

    const loading = render(<Switch defaultChecked={false} loading onChange={onChange} />)
    flushSync(() => getSwitch(loading.container).click())
    expect(onChange).not.toHaveBeenCalled()
    expect(getSwitch(loading.container).getAttribute('aria-busy')).toBe('true')
  })

  it('toggles when the outer label is clicked', () => {
    const onChange = vi.fn()
    const { container } = render(<Switch defaultChecked={false} label="Notify" onChange={onChange} />)
    const label = container.querySelector<HTMLElement>('.yakit-switch-label')
    if (!label) throw new Error('expected a label')

    flushSync(() => label.click())
    expect(onChange).toHaveBeenCalledWith(true, expect.anything())
    expect(getSwitch(container).getAttribute('aria-checked')).toBe('true')
  })

  it('uses the visible label as the accessible name unless explicitly overridden', () => {
    const labeled = render(<Switch label="Notify" />)
    const button = getSwitch(labeled.container)
    const label = labeled.container.querySelector('.yakit-switch-label')

    expect(label?.id).not.toBe('')
    expect(button.getAttribute('aria-labelledby')).toBe(label?.id)

    const overridden = render(<Switch aria-label="Custom name" label="Visible label" />)
    expect(getSwitch(overridden.container).getAttribute('aria-label')).toBe('Custom name')
    expect(getSwitch(overridden.container).hasAttribute('aria-labelledby')).toBe(false)
  })

  it('associates the description with the switch and preserves external descriptions', () => {
    const withDescription = render(
      <Switch aria-describedby="external-help" description="Used to control notifications" />,
    )
    const button = getSwitch(withDescription.container)
    const description = withDescription.container.querySelector('.yakit-switch-description')

    expect(description?.id).not.toBe('')
    expect(button.getAttribute('aria-describedby')).toBe(`external-help ${description?.id}`)

    const withoutDescription = render(<Switch aria-describedby="external-help" />)
    expect(getSwitch(withoutDescription.container).getAttribute('aria-describedby')).toBe('external-help')
  })

  it('shows a visible focus indicator for keyboard navigation', async () => {
    const { container } = render(<Switch />)
    await userEvent.tab()

    const button = getSwitch(container)
    expect(document.activeElement).toBe(button)
    expect(getComputedStyle(button).outlineStyle).toBe('solid')
    expect(getComputedStyle(button).outlineWidth).toBe('2px')
  })
})

describe('Switch size and inner extras', () => {
  it('maps size aliases onto stable Yakit size classes', () => {
    expect(getSwitch(render(<Switch size="small" />).container).classList.contains('yakit-switch-small')).toBe(true)
    expect(getSwitch(render(<Switch size="medium" />).container).classList.contains('yakit-switch-middle')).toBe(true)
    expect(getSwitch(render(<Switch size="maxLarge" />).container).classList.contains('yakit-switch-max-large')).toBe(
      true,
    )
  })

  it('renders showInnerText only for middle / large', () => {
    const middle = render(<Switch showInnerText size="middle" />)
    expect(middle.container.querySelector('.yakit-switch-inner-checked')?.textContent).toBe('开')
    expect(middle.container.querySelector('.yakit-switch-inner-unchecked')?.textContent).toBe('关')
    expect(getSwitch(middle.container).classList.contains('yakit-switch-has-children')).toBe(true)

    const large = render(<Switch defaultChecked showInnerText size="large" />)
    expect(large.container.querySelector('.yakit-switch-inner-checked')?.textContent).toBe('开')

    const small = render(<Switch showInnerText size="small" />)
    expect(getSwitch(small.container).classList.contains('yakit-switch-has-children')).toBe(false)
    expect(small.container.querySelector('.yakit-switch-inner-checked')?.textContent).toBe('')

    const maxLarge = render(<Switch showInnerText size="maxLarge" />)
    expect(getSwitch(maxLarge.container).classList.contains('yakit-switch-has-children')).toBe(false)
  })

  it('renders showInnerIcon with size-specific icon classes for middle / large', () => {
    const middle = render(<Switch showInnerIcon size="middle" />)
    expect(middle.container.querySelector('.yakit-switch-middle-icon')).not.toBeNull()
    expect(middle.container.querySelector('.yakit-switch-has-children')).not.toBeNull()

    const large = render(<Switch defaultChecked showInnerIcon size="large" />)
    expect(large.container.querySelector('.yakit-switch-large-icon')).not.toBeNull()

    const small = render(<Switch showInnerIcon size="small" />)
    expect(small.container.querySelector('.yakit-switch-middle-icon')).toBeNull()
    expect(small.container.querySelector('.yakit-switch-large-icon')).toBeNull()
  })

  it('resets antd 5 inner min-height so large/middle inner text stays aligned', () => {
    const style = document.createElement('style')
    style.textContent = `
.ant-switch .ant-switch-inner .ant-switch-inner-checked,
.ant-switch .ant-switch-inner .ant-switch-inner-unchecked { min-height: 22px; }
.ant-switch.ant-switch-small .ant-switch-inner .ant-switch-inner-checked,
.ant-switch.ant-switch-small .ant-switch-inner .ant-switch-inner-unchecked { min-height: 16px; }
`
    // antd cssinjs 以 prependQueue 插入，排在页面自有样式之前
    document.head.insertBefore(style, document.head.firstChild)
    try {
      for (const [size, height] of [
        ['large', '20px'],
        ['middle', '16px'],
      ] as const) {
        const { container } = render(<Switch size={size} showInnerText defaultChecked />)
        const checked = container.querySelector<HTMLElement>('.yakit-switch-inner-checked')
        const unchecked = container.querySelector<HTMLElement>('.yakit-switch-inner-unchecked')
        if (!checked || !unchecked) throw new Error('expected inner text spans')

        expect(getComputedStyle(checked).minHeight).toBe('0px')
        expect(getComputedStyle(checked).height).toBe(height)
        expect(getComputedStyle(unchecked).minHeight).toBe('0px')
        expect(Math.round(unchecked.getBoundingClientRect().top)).toBe(Math.round(checked.getBoundingClientRect().top))
        expect(Math.round(unchecked.getBoundingClientRect().bottom)).toBe(
          Math.round(checked.getBoundingClientRect().bottom),
        )
        cleanup()
      }
    } finally {
      style.remove()
    }
  })

  it('prefers explicit children over showInnerText / showInnerIcon', () => {
    const { container } = render(
      <Switch checkedChildren="ON" showInnerIcon showInnerText size="large" unCheckedChildren="OFF" />,
    )
    expect(container.querySelector('.yakit-switch-inner-checked')?.textContent).toBe('ON')
    expect(container.querySelector('.yakit-switch-inner-unchecked')?.textContent).toBe('OFF')
    expect(container.querySelector('.yakit-switch-large-icon')).toBeNull()
  })

  it('treats explicit null children as no inner content instead of falling back to defaults', () => {
    const { container } = render(<Switch checkedChildren={null} showInnerText size="middle" unCheckedChildren={null} />)
    expect(container.querySelector('.yakit-switch-inner-checked')?.textContent).toBe('')
    expect(container.querySelector('.yakit-switch-inner-unchecked')?.textContent).toBe('')
    expect(getSwitch(container).classList.contains('yakit-switch-has-children')).toBe(false)
  })

  it('uses the configured primary text color for inner text', () => {
    const { container } = render(
      <ConfigProvider theme={{ token: { colorPrimaryText: '#123456' } }}>
        <Switch defaultChecked showInnerText size="middle" />
      </ConfigProvider>,
    )
    const button = getSwitch(container)
    const inner = container.querySelector<HTMLElement>('.yakit-switch-inner')
    if (!inner) throw new Error('expected inner')
    expect(getComputedStyle(inner).color).toBe('rgb(18, 52, 86)')
    expect(button.style.getPropertyValue('--yakit-color-primary-text')).toBe('#123456')
  })
})

describe('Switch semantic classNames / styles', () => {
  it('forwards semantic classNames onto root / content / indicator slots', () => {
    const { container } = render(
      <Switch
        classNames={{ content: 'slot-content', indicator: 'slot-indicator', root: 'slot-root' }}
        defaultChecked
        showInnerText
        size="middle"
      />,
    )
    const button = getSwitch(container)
    expect(button.classList.contains('slot-root')).toBe(true)
    expect(container.querySelector('.yakit-switch-handle')?.classList.contains('slot-indicator')).toBe(true)
    expect(container.querySelector('.yakit-switch-inner-checked')?.classList.contains('slot-content')).toBe(true)
    expect(container.querySelector('.yakit-switch-inner-unchecked')?.classList.contains('slot-content')).toBe(true)
  })

  it('forwards semantic styles onto root / content / indicator slots', () => {
    const { container } = render(
      <Switch
        defaultChecked
        showInnerText
        size="middle"
        styles={{
          content: { letterSpacing: '1px' },
          indicator: { opacity: 0.5 },
          root: { outline: '2px solid red' },
        }}
      />,
    )
    const button = getSwitch(container)
    expect(button.style.outline).toContain('red')
    expect(container.querySelector<HTMLElement>('.yakit-switch-handle')?.style.opacity).toBe('0.5')
    expect(container.querySelector<HTMLElement>('.yakit-switch-inner-checked')?.style.letterSpacing).toBe('1px')
  })

  it('resolves classNames / styles from a function of props', () => {
    const { container } = render(
      <Switch
        classNames={(info) => ({
          root: info.props.disabled ? 'is-disabled-root' : 'is-enabled-root',
        })}
        disabled
        styles={(info) => ({
          root: { opacity: info.props.disabled ? '0.4' : '1' },
        })}
      />,
    )
    const button = getSwitch(container)
    expect(button.classList.contains('is-disabled-root')).toBe(true)
    expect(button.style.opacity).toBe('0.4')
  })
})

describe('Switch ref and provider inheritance', () => {
  it('exposes focus, blur, and nativeElement through the public ref', () => {
    const ref = createRef<SwitchRef>()
    render(<Switch ref={ref} />)

    expect(ref.current?.nativeElement).toBeInstanceOf(HTMLButtonElement)
    ref.current?.focus()
    expect(document.activeElement).toBe(ref.current?.nativeElement)
    ref.current?.blur()
    expect(document.activeElement).not.toBe(ref.current?.nativeElement)
  })

  it('inherits provider size, disabled, direction, mode, and token variables', () => {
    const { container } = render(
      <ConfigProvider
        componentDisabled
        componentSize="small"
        direction="rtl"
        theme={{ mode: 'dark', token: { colorPrimary: '#123456' } }}
      >
        <Switch />
      </ConfigProvider>,
    )
    const button = getSwitch(container)

    expect(button.classList.contains('yakit-switch-small')).toBe(true)
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('dir')).toBe('rtl')
    expect(button.dataset.theme).toBe('dark')
    expect(button.style.getPropertyValue('--yakit-color-primary')).toBe('#123456')
  })
})

import React from 'react'
import { flushSync } from 'react-dom'
import { hydrateRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Wave from '../../src/components/Animation/Wave'
import Button from '../../src/components/Button'
import ConfigProvider from '../../src/components/ConfigProvider'
import Tag, { CheckableTag, CheckableTagGroup, TagCopy } from '../../src/components/Tag'
import useYakitConfig from '../../src/hooks/useYakitConfig'
import { getYakitTokenVariables } from '../../src/styles/tokenVariables'
import { NativeComponentsFixture } from '../fixtures/native-components'
import { cleanup, render } from '../helpers/render'

const hydrationRoots: Root[] = []

afterEach(() => {
  hydrationRoots.splice(0).forEach((root) => root.unmount())
  cleanup()
})

const ConfigProbe = () => {
  const config = useYakitConfig()
  return (
    <output
      data-disabled={String(config.componentDisabled)}
      data-locale={config.locale.locale}
      data-mode={config.mode}
      data-primary={config.token.colorPrimary}
      data-search={config.locale.Search?.search}
      dir={config.direction}
    />
  )
}

describe('native configuration foundation', () => {
  it('merges nested native provider values without adding DOM wrappers', () => {
    const { container } = render(
      <ConfigProvider
        componentDisabled
        direction="rtl"
        locale={{ locale: 'en-US', Search: { search: 'Search' } }}
        theme={{ mode: 'dark', token: { colorPrimary: '#123456' } }}
      >
        <ConfigProvider locale={{ locale: 'en-GB', Search: { search: undefined } }}>
          <ConfigProbe />
        </ConfigProvider>
      </ConfigProvider>,
    )
    const probe = container.querySelector('output')

    expect(container.childElementCount).toBe(1)
    expect(probe?.dataset.disabled).toBe('true')
    expect(probe?.dataset.locale).toBe('en-GB')
    expect(probe?.dataset.mode).toBe('dark')
    expect(probe?.dataset.primary).toBe('#123456')
    expect(probe?.dataset.search).toBe('Search')
    expect(probe?.dir).toBe('rtl')
  })

  it('applies provider size, disabled state and token variables to native Button', () => {
    const { container } = render(
      <ConfigProvider componentDisabled componentSize="large" theme={{ token: { colorPrimary: '#654321' } }}>
        <Button>Submit</Button>
      </ConfigProvider>,
    )
    const button = container.querySelector('button')

    expect(button?.disabled).toBe(true)
    expect(button?.classList.contains('yakit-btn-large')).toBe(true)
    expect(button?.style.getPropertyValue('--yakit-color-primary')).toBe('#654321')
  })

  it('ignores undefined nested token overrides and preserves component tokens', () => {
    const { container } = render(
      <ConfigProvider
        theme={{
          components: { YakitButton: { borderRadius: '9px' } },
          token: { colorPrimary: '#654321' },
        }}
      >
        <ConfigProvider
          theme={{
            components: { YakitButton: { borderRadius: undefined } },
            token: { colorPrimary: undefined },
          }}
        >
          <Button>Inherited</Button>
        </ConfigProvider>
      </ConfigProvider>,
    )
    const button = container.querySelector<HTMLElement>('button')

    expect(button?.style.getPropertyValue('--yakit-color-primary')).toBe('#654321')
    expect(button?.style.getPropertyValue('--yakit-btn-border-radius')).toBe('9px')
  })

  it('does not inject runtime style nodes when native components mount', () => {
    const before = document.head.querySelectorAll('style').length
    const { root } = render(
      <>
        <Button>Button</Button>
        <Tag>Tag</Tag>
      </>,
    )

    flushSync(() => root.render(<Button type="outline1">Updated</Button>))
    expect(document.head.querySelectorAll('style').length).toBe(before)
  })
})

describe('native Button behavior', () => {
  it('defaults to a non-submitting button and preserves native submit/reset behavior', () => {
    const onSubmit = vi.fn<(event: React.FormEvent<HTMLFormElement>) => void>((event) => event.preventDefault())
    const { container } = render(
      <form onSubmit={onSubmit}>
        <input defaultValue="initial" />
        <Button>Default</Button>
        <Button htmlType="submit">Submit</Button>
        <Button htmlType="reset">Reset</Button>
      </form>,
    )
    const input = container.querySelector('input')
    const [defaultButton, submitButton, resetButton] = [...container.querySelectorAll<HTMLButtonElement>('button')]
    if (!input || !defaultButton || !submitButton || !resetButton) {
      throw new Error('expected a complete native button form fixture')
    }

    expect(defaultButton.type).toBe('button')
    defaultButton.click()
    expect(onSubmit).not.toHaveBeenCalled()
    submitButton.click()
    expect(onSubmit).toHaveBeenCalledOnce()
    input.value = 'changed'
    resetButton.click()
    expect(input.value).toBe('initial')
  })

  it('blocks loading and disabled clicks while preserving busy and icon-position state', () => {
    const onLoadingClick = vi.fn()
    const onDisabledClick = vi.fn()
    const { container } = render(
      <>
        <Button icon={<span data-icon />} iconPosition="end" loading onClick={onLoadingClick}>
          Loading
        </Button>
        <Button disabled onClick={onDisabledClick}>
          Disabled
        </Button>
      </>,
    )
    const [loadingButton, disabledButton] = [...container.querySelectorAll<HTMLButtonElement>('button')]

    loadingButton?.click()
    disabledButton?.click()
    expect(loadingButton).toBeDisabled()
    expect(loadingButton).not.toHaveAttribute('aria-busy')
    expect(loadingButton).toHaveClass('yakit-btn-icon-end')
    expect(disabledButton).toBeDisabled()
    expect(onLoadingClick).not.toHaveBeenCalled()
    expect(onDisabledClick).not.toHaveBeenCalled()
  })
})

describe('native Wave behavior', () => {
  it('preserves child handlers and removes its transition holder', () => {
    const onMouseUp = vi.fn()
    const { container } = render(
      <Wave animation="wave">
        <button onMouseUp={onMouseUp}>Wave</button>
      </Wave>,
    )
    const button = container.querySelector('button')

    if (!button) throw new Error('expected a button')
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(onMouseUp).toHaveBeenCalledOnce()

    const effect = button.querySelector<HTMLElement>('.yakit-wave-effect')
    expect(effect).not.toBeNull()
    effect?.dispatchEvent(new Event('transitionend'))
    expect(button.querySelector('.yakit-wave-holder')).toBeNull()
  })

  it('does not leave a holder behind when reduced motion is requested', () => {
    const matchMedia = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList)
    const { container } = render(
      <Wave animation="wave">
        <button>Reduced motion</button>
      </Wave>,
    )
    const button = container.querySelector('button')

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull()
    matchMedia.mockRestore()
  })

  it.each(['Enter', ' '])('runs the %s keyboard wave and child handler exactly once', (key) => {
    const onKeyUp = vi.fn()
    const { container } = render(
      <Wave animation="wave">
        <button onKeyUp={onKeyUp}>Keyboard wave</button>
      </Wave>,
    )
    const button = container.querySelector('button')

    button?.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key }))
    expect(onKeyUp).toHaveBeenCalledOnce()
    expect(button?.querySelectorAll('.yakit-wave-holder')).toHaveLength(1)
  })

  it('removes active holders when Wave unmounts', () => {
    const { container } = render(
      <Wave animation="wave">
        <button>Unmount wave</button>
      </Wave>,
    )
    const button = container.querySelector('button')

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(button?.querySelector('.yakit-wave-holder')).not.toBeNull()
    cleanup()
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull()
  })

  it('uses its bounded timer when transitionend is not delivered', async () => {
    const { container } = render(
      <Wave animation="wave">
        <button>Timed wave</button>
      </Wave>,
    )
    const button = container.querySelector('button')

    button?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    expect(button?.querySelector('.yakit-wave-holder')).not.toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 550))
    expect(button?.querySelector('.yakit-wave-holder')).toBeNull()
  })
})

describe('native Tag characterization', () => {
  it('preserves size, color, variant and bordered classes', () => {
    const { container } = render(
      <>
        <Tag color="yellow" size="large">
          Bordered
        </Tag>
        <Tag bordered={false} color="success" size="small">
          Borderless
        </Tag>
        <Tag color="primary" size="medium" variant="solid">
          Solid medium
        </Tag>
      </>,
    )
    const [bordered, borderless, solid] = [...container.querySelectorAll<HTMLElement>('.yakit-tag')]

    expect(bordered).toHaveClass('yakit-tag-large', 'yakit-tag-color-yellow', 'yakit-tag-soft', 'yakit-tag-bordered')
    expect(borderless).toHaveClass('yakit-tag-small', 'yakit-tag-color-success', 'yakit-tag-borderless')
    expect(borderless).not.toHaveClass('yakit-tag-bordered')
    expect(solid).toHaveClass('yakit-tag-medium', 'yakit-tag-color-primary', 'yakit-tag-solid')
  })

  it('renders close control and honors onClose / preventDefault', () => {
    const onClose = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    const { container, root } = render(
      <Tag closable onClose={onClose}>
        Stable
      </Tag>,
    )
    const close = container.querySelector('.yakit-tag-close')
    expect(close).not.toBeNull()
    close?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.yakit-tag')).not.toBeNull()

    const onCloseHide = vi.fn()
    flushSync(() =>
      root.render(
        <Tag closable onClose={onCloseHide}>
          Hide me
        </Tag>,
      ),
    )
    const closeHide = container.querySelector('.yakit-tag-close')
    flushSync(() => {
      closeHide?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    })
    expect(onCloseHide).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.yakit-tag')).toBeNull()
  })

  it('renders a function close icon', () => {
    const { container } = render(<Tag closeIcon={() => <i className="custom-close">x</i>}>Custom</Tag>)

    expect(container.querySelector('.yakit-tag-close .custom-close')?.textContent).toBe('x')
    expect(container.querySelector('.yakit-icon')).toBeNull()
  })

  it('uses the default close icon when the function returns nothing', () => {
    const { container } = render(<Tag closeIcon={() => null}>Custom</Tag>)

    expect(container.querySelector('.yakit-tag-close .yakit-icon')).not.toBeNull()
  })

  it('forwards onClick and applies named colors', () => {
    const onClick = vi.fn()
    const { container } = render(
      <>
        <Tag color="success">Success</Tag>
        <Tag color="error">Error</Tag>
        <Tag color="serious" onClick={onClick}>
          Click
        </Tag>
      </>,
    )
    const [success, error, clickable] = [...container.querySelectorAll<HTMLElement>('.yakit-tag')]
    expect(success).toHaveClass('yakit-tag-color-success')
    expect(error).toHaveClass('yakit-tag-color-error')
    expect(clickable).toHaveClass('yakit-tag-color-serious', 'yakit-tag-clickable')
    clickable.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('exposes CheckableTag / Tag.CheckableTag as antd-style alias', () => {
    const onChange = vi.fn()
    const { container } = render(
      <>
        <CheckableTag checked={false} onChange={onChange}>
          A
        </CheckableTag>
        <Tag.CheckableTag checked onChange={onChange}>
          B
        </Tag.CheckableTag>
      </>,
    )
    const [a, b] = [...container.querySelectorAll<HTMLElement>('.yakit-tag')]
    expect(a).toHaveClass('yakit-tag-checkable')
    expect(a).not.toHaveClass('yakit-tag-checked')
    expect(b).toHaveClass('yakit-tag-checkable', 'yakit-tag-checked')
    a.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('gates extra split on renderable content: false stays single, 0 splits', () => {
    const { container } = render(
      <>
        <Tag extra={false}>cond-off</Tag>
        <Tag extra={0}>zero</Tag>
        <Tag extra={[]}>empty-children</Tag>
      </>,
    )
    const [condOff, zero, emptyArray] = [...container.querySelectorAll<HTMLElement>('.yakit-tag')]
    // 条件渲染哨兵 / 空数组不渲染内容 → 单段
    expect(condOff).not.toHaveClass('yakit-tag-split')
    expect(condOff.querySelector('.yakit-tag-divider')).toBeNull()
    expect(emptyArray).not.toHaveClass('yakit-tag-split')
    // 0 渲染为文本 → 分栏
    expect(zero).toHaveClass('yakit-tag-split')
    expect(zero.querySelector('.yakit-tag-extra-content')?.textContent).toBe('0')
  })

  it('skips the content span for non-renderable children', () => {
    const { container } = render(
      <>
        <Tag>{true}</Tag>
        <Tag>{''}</Tag>
        <Tag>{0}</Tag>
      </>,
    )
    const [boolTag, emptyTag, zeroTag] = [...container.querySelectorAll<HTMLElement>('.yakit-tag')]
    // boolean / 空字符串：无内容 span（不挂 contentRef 参与 ellipsis 观察）
    expect(boolTag.querySelector('.yakit-tag-content')).toBeNull()
    expect(emptyTag.querySelector('.yakit-tag-content')).toBeNull()
    // 0 渲染文本，仍渲染 content span
    expect(zeroTag.querySelector('.yakit-tag-content')?.textContent).toBe('0')
  })

  it('falls back checkable solid to borderless and keeps a split tag soft', () => {
    const { container } = render(
      <>
        <Tag checkable checked variant="solid">
          Chosen
        </Tag>
        <Tag extra="9.8" variant="solid">
          Score
        </Tag>
      </>,
    )
    const [checkable, split] = [...container.querySelectorAll<HTMLElement>('.yakit-tag')]

    expect(checkable).toHaveClass('yakit-tag-checkable', 'yakit-tag-checked', 'yakit-tag-borderless')
    expect(checkable).not.toHaveClass('yakit-tag-solid')
    expect(split).toHaveClass('yakit-tag-split', 'yakit-tag-soft')
    expect(split).not.toHaveClass('yakit-tag-solid')
  })

  it('exposes checkbox and button roles with checked state only on checkable tags', () => {
    const { container } = render(
      <>
        <Tag checkable checked>
          Chosen
        </Tag>
        <Tag checkable checked={false}>
          Open
        </Tag>
        <Tag onClick={() => undefined}>Press</Tag>
        <Tag>Plain</Tag>
      </>,
    )
    const [chosen, open, press, plain] = [...container.querySelectorAll<HTMLElement>('.yakit-tag')]

    expect(chosen.getAttribute('role')).toBe('checkbox')
    expect(chosen.getAttribute('aria-checked')).toBe('true')
    expect(open.getAttribute('role')).toBe('checkbox')
    expect(open.getAttribute('aria-checked')).toBe('false')
    expect(press.getAttribute('role')).toBe('button')
    expect(press.hasAttribute('aria-checked')).toBe(false)
    expect(plain.hasAttribute('role')).toBe(false)
    expect(plain.hasAttribute('aria-checked')).toBe(false)
  })

  it('ignores close and check toggles while disabled', () => {
    const onClose = vi.fn()
    const onChange = vi.fn()
    const { container } = render(
      <>
        <Tag closable disabled onClose={onClose}>
          Keep
        </Tag>
        <Tag checkable checked={false} disabled onChange={onChange}>
          Locked
        </Tag>
      </>,
    )
    const [closable, checkable] = [...container.querySelectorAll<HTMLElement>('.yakit-tag')]

    closable
      .querySelector('.yakit-tag-close')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    checkable.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onClose).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(closable.isConnected).toBe(true)
    expect(checkable).not.toHaveClass('yakit-tag-checked')
    expect(checkable.getAttribute('aria-disabled')).toBe('true')
  })

  it('maps a provider huge size onto the large tag', () => {
    const { container } = render(
      <ConfigProvider componentSize="huge">
        <Tag>Sized</Tag>
      </ConfigProvider>,
    )

    expect(container.querySelector('.yakit-tag')).toHaveClass('yakit-tag-large')
  })
})

describe('native component hydration', () => {
  it('hydrates the complete family without warnings, hash classes, or dynamic styles', async () => {
    const response = await fetch('/test-results/components/native-components-ssr.json')
    if (!response.ok) throw new Error(`SSR fixture unavailable: ${response.status}`)
    const fixture = (await response.json()) as { markup: string }
    const container = document.createElement('div')
    container.innerHTML = fixture.markup
    document.body.append(container)
    const styleCount = document.head.querySelectorAll('style').length
    const recoverableErrors: unknown[] = []
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const root = hydrateRoot(container, <NativeComponentsFixture />, {
      onRecoverableError: (error) => recoverableErrors.push(error),
    })
    hydrationRoots.push(root)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(recoverableErrors).toEqual([])
    expect(consoleError).not.toHaveBeenCalled()
    expect(consoleWarn).not.toHaveBeenCalled()
    expect(document.head.querySelectorAll('style')).toHaveLength(styleCount)
    expect(container.querySelector('button button')).toBeNull()
    expect(
      [...container.querySelectorAll<HTMLElement>('[class]')].some((element) =>
        [...element.classList].some((name) => /(?:css-dev-only|ant-)/.test(name)),
      ),
    ).toBe(false)

    consoleError.mockRestore()
    consoleWarn.mockRestore()
  })
})

describe('Tag checkable group', () => {
  it('keeps role=group and multi-select add/remove without duplicate values', () => {
    const onChange = vi.fn()
    const { container, root } = render(
      <CheckableTagGroup
        multiple
        value={['a']}
        onChange={onChange}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    )
    expect(container.querySelector('.yakit-tag-checkable-group')?.getAttribute('role')).toBe('group')

    const tags = () => [...container.querySelectorAll<HTMLElement>('.yakit-tag')]
    tags()[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b'])

    // re-select path with value already containing b: includes guard returns same list
    onChange.mockClear()
    flushSync(() =>
      root.render(
        <CheckableTagGroup
          multiple
          value={['a', 'b']}
          onChange={onChange}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />,
      ),
    )
    // b is checked; clicking toggles off (remove), not the includes(true) path
    tags()[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onChange).toHaveBeenLastCalledWith(['a'])

    onChange.mockClear()
    flushSync(() =>
      root.render(
        <CheckableTagGroup
          multiple
          value={['a']}
          onChange={onChange}
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />,
      ),
    )
    tags()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('fires onClick for checkable keyboard activation', () => {
    const onClick = vi.fn()
    const onChange = vi.fn()
    const { container } = render(
      <Tag checkable checked={false} onChange={onChange} onClick={onClick}>
        K
      </Tag>,
    )
    const el = container.querySelector<HTMLElement>('.yakit-tag')
    el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    expect(onChange).toHaveBeenCalledWith(true)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('cancels a single selection back to null', () => {
    const onChange = vi.fn()
    const { container } = render(
      <CheckableTagGroup
        value="a"
        onChange={onChange}
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    )
    const tags = () => [...container.querySelectorAll<HTMLElement>('.yakit-tag')]

    tags()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onChange).toHaveBeenLastCalledWith(null)

    onChange.mockClear()
    tags()[1].dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onChange).toHaveBeenLastCalledWith('b')
  })

  it('ignores clicks on a disabled option', () => {
    const onChange = vi.fn()
    const { container } = render(
      <CheckableTagGroup
        onChange={onChange}
        options={[
          { value: 'a', label: 'A', disabled: true },
          { value: 'b', label: 'B' },
        ]}
      />,
    )
    const [disabledTag, openTag] = [...container.querySelectorAll<HTMLElement>('.yakit-tag')]

    expect(disabledTag.getAttribute('aria-disabled')).toBe('true')
    disabledTag.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onChange).not.toHaveBeenCalled()

    openTag.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(onChange).toHaveBeenLastCalledWith('b')
  })
})

describe('Tag copy', () => {
  it('shows copy control with copy={true} and defaults text from children', () => {
    const { container } = render(
      <Tag copy color="primary">
        hello-copy
      </Tag>,
    )
    expect(container.querySelector('.yakit-tag-copy')).not.toBeNull()
    expect(container.querySelector('.yakit-tag-content')?.textContent).toBe('hello-copy')
  })

  it('coexists with closable', () => {
    const { container } = render(
      <Tag copy={{ text: 'x' }} closable>
        both
      </Tag>,
    )
    expect(container.querySelector('.yakit-tag-copy')).not.toBeNull()
    expect(container.querySelector('.yakit-tag-close')).not.toBeNull()
  })

  it('uses copy.text as content when children absent', () => {
    const { container } = render(<Tag copy={{ text: 'only-text' }} color="blue" />)
    expect(container.querySelector('.yakit-tag-content')?.textContent).toBe('only-text')
  })

  it('reports a successful clipboard write through onCopy', async () => {
    const writeText = vi.fn(async () => undefined)
    const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    try {
      const onCopy = vi.fn()
      const { container } = render(
        <Tag copy onCopy={onCopy}>
          payload
        </Tag>,
      )

      container.querySelector('.yakit-tag-copy')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      await vi.waitFor(() => {
        expect(writeText).toHaveBeenCalledWith('payload')
        expect(onCopy).toHaveBeenCalledWith(expect.anything(), { text: 'payload', ok: true })
      })
    } finally {
      if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard)
      else Reflect.deleteProperty(navigator, 'clipboard')
    }
  })
})

describe('TagCopy race', () => {
  it('ignores double-click while locking and survives unmount mid-copy', async () => {
    let resolveWrite: ((value: void) => void) | undefined
    const writeText = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveWrite = resolve
        }),
    )
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    const onCopy = vi.fn()
    const { container, root } = render(<TagCopy copyText="payload" onCopy={onCopy} />)
    const btn = container.querySelector<HTMLButtonElement>('.yakit-tag-copy')
    expect(btn).not.toBeNull()

    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(writeText).toHaveBeenCalledTimes(1)

    flushSync(() => root.unmount())
    resolveWrite?.()
    await Promise.resolve()
    expect(onCopy).not.toHaveBeenCalled()
  })
})

describe('Tag ellipsis title', () => {
  it('sets native title when content is truncated', async () => {
    const proto = HTMLElement.prototype
    const sw = Object.getOwnPropertyDescriptor(proto, 'scrollWidth')
    const cw = Object.getOwnPropertyDescriptor(proto, 'clientWidth')
    Object.defineProperty(proto, 'scrollWidth', {
      configurable: true,
      get() {
        return 120
      },
    })
    Object.defineProperty(proto, 'clientWidth', {
      configurable: true,
      get() {
        return 40
      },
    })

    try {
      const { container } = render(
        <Tag ellipsis style={{ maxWidth: 40 }}>
          long-ellipsis-text
        </Tag>,
      )
      // useLayoutEffect schedules update via rAF
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const content = container.querySelector<HTMLElement>('.yakit-tag-content')
      expect(content?.getAttribute('title')).toBe('long-ellipsis-text')
    } finally {
      if (sw) Object.defineProperty(proto, 'scrollWidth', sw)
      else delete (proto as { scrollWidth?: unknown }).scrollWidth
      if (cw) Object.defineProperty(proto, 'clientWidth', cw)
      else delete (proto as { clientWidth?: unknown }).clientWidth
    }
  })
})

describe('getYakitTokenVariables cache', () => {
  it('returns the same object for the same token reference', () => {
    const token = { colorPrimary: '#1677ff' } as Parameters<typeof getYakitTokenVariables>[0]
    const a = getYakitTokenVariables(token)
    const b = getYakitTokenVariables(token)
    expect(a).toBe(b)
    expect(a['--yakit-color-primary']).toBe('#1677ff')
  })
})

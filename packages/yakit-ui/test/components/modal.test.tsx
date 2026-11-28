import { userEvent } from '@vitest/browser/context'
import React from 'react'
import { flushSync } from 'react-dom'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ConfigProvider from '../../src/components/ConfigProvider'
import Dropdown from '../../src/components/Dropdown'
import Modal, { YakitModalCompat } from '../../src/components/Modal'
import { cleanup, render } from '../helpers/render'

afterEach(cleanup)

const dialog = () => document.querySelector<HTMLElement>('.yakit-modal')
const topDialog = () => {
  const panels = document.querySelectorAll<HTMLElement>('.yakit-modal')
  return panels[panels.length - 1] ?? null
}

/** Escape is handled on the wrap, so the event must originate inside the dialog. */
const pressEscape = (target: Element | null = dialog()) => {
  target?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }))
}

const footerButton = (label: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('.yakit-modal-footer button')].find(
    (button) => button.textContent === label,
  )

/** 遮罩关闭要求 mousedown + mouseup 都落在 wrap 上 */
const dispatchMaskGesture = (down: EventTarget | null, up: EventTarget | null) => {
  down?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  up?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
}

const clickMaskWrap = () => {
  const wrap = document.querySelector('.yakit-modal-wrap')
  dispatchMaskGesture(wrap, wrap)
}

describe('Modal dialog', () => {
  it('stays closed until open is set', () => {
    render(
      <Modal subTitle="这里是辅助性内容" title="Title">
        内容
      </Modal>,
    )

    expect(dialog()).toBeNull()
  })

  it('renders the style 01 header, body and default actions', () => {
    render(
      <Modal open subTitle="这里是辅助性内容" title="Title">
        内容区域
      </Modal>,
    )

    expect(dialog()?.classList.contains('yakit-modal-basic')).toBe(true)
    expect(dialog()?.classList.contains('yakit-modal-small')).toBe(true)
    expect(document.querySelector('.yakit-modal-title')?.textContent).toBe('Title')
    expect(document.querySelector('.yakit-modal-subtitle')?.textContent).toBe('这里是辅助性内容')
    expect(document.querySelector('.yakit-modal-body')?.textContent).toBe('内容区域')
    expect(document.querySelector('.yakit-modal-status')).toBeNull()
    expect(document.querySelector('.yakit-modal-footer')?.textContent).toContain('取消')
    expect(document.querySelector('.yakit-modal-footer')?.textContent).toContain('确定')
    expect(dialog()?.getAttribute('role')).toBe('dialog')
    expect(dialog()?.getAttribute('aria-modal')).toBe('true')
  })

  it('uses medium spacing and keeps a controlled dialog open', () => {
    const onCancel = vi.fn()
    render(
      <Modal
        footerExtra={<span>Switch button</span>}
        onCancel={onCancel}
        open
        size="medium"
        statusBar={
          <>
            当前系统代理状态：<strong>已启用</strong>
          </>
        }
        title="Title"
        variant="banner"
      >
        内容
      </Modal>,
    )

    expect(dialog()?.classList.contains('yakit-modal-medium')).toBe(true)
    expect(dialog()?.classList.contains('yakit-modal-banner')).toBe(true)
    expect(document.querySelector('.yakit-modal-status')?.textContent).toContain('已启用')
    expect(document.querySelector('.yakit-modal-footer-extra')?.textContent).toBe('Switch button')

    document.querySelector<HTMLButtonElement>('.yakit-modal-close')?.click()
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(dialog()).not.toBeNull()
  })

  it('closes an uncontrolled dialog from cancel, mask and escape', () => {
    const onCancel = vi.fn()
    const first = render(
      <Modal defaultOpen onCancel={onCancel} title="Title">
        内容
      </Modal>,
    )

    flushSync(() => footerButton('取消')?.click())
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(dialog()).toBeNull()
    first.root.unmount()

    const second = render(
      <Modal defaultOpen title="再次打开">
        内容
      </Modal>,
    )
    flushSync(() => {
      clickMaskWrap()
    })
    expect(dialog()).toBeNull()
    second.root.unmount()

    render(
      <Modal defaultOpen title="键盘">
        内容
      </Modal>,
    )
    flushSync(() => {
      pressEscape()
    })
    expect(dialog()).toBeNull()
  })

  it('closes only when mousedown and mouseup both land on the wrap', () => {
    const onCancel = vi.fn()
    render(
      <Modal onCancel={onCancel} open title="遮罩成对">
        <span className="drag-anchor">内容</span>
      </Modal>,
    )

    const wrap = document.querySelector('.yakit-modal-wrap')
    const panel = document.querySelector('.yakit-modal')
    const body = document.querySelector('.yakit-modal-body')

    // 面板内按下、wrap 上松开 → 不关
    flushSync(() => dispatchMaskGesture(body, wrap))
    expect(onCancel).not.toHaveBeenCalled()
    expect(dialog()).not.toBeNull()

    // wrap 上按下、面板上松开 → 不关
    flushSync(() => dispatchMaskGesture(wrap, panel))
    expect(onCancel).not.toHaveBeenCalled()

    // 两端都在 wrap → 关
    flushSync(() => dispatchMaskGesture(wrap, wrap))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
  it('ignores the mask and escape when those dismiss paths are disabled', () => {
    const onCancel = vi.fn()
    render(
      <Modal keyboard={false} maskClosable={false} onCancel={onCancel} open title="Title">
        内容
      </Modal>,
    )

    clickMaskWrap()
    pressEscape()

    expect(onCancel).not.toHaveBeenCalled()
    expect(dialog()).not.toBeNull()
  })

  it('confirms, hides the footer, and renders inline without a mask', () => {
    const onOk = vi.fn()
    const confirmed = render(
      <Modal defaultOpen okText="Yes" onOk={onOk} title="Title">
        内容
      </Modal>,
    )

    flushSync(() => footerButton('Yes')?.click())
    expect(onOk).toHaveBeenCalledTimes(1)
    expect(dialog()).toBeNull()
    confirmed.root.unmount()

    const hidden = render(
      <Modal footer={null} open title="没有底部">
        内容
      </Modal>,
    )
    expect(document.querySelector('.yakit-modal-footer')).toBeNull()
    hidden.root.unmount()

    const inline = render(
      <Modal getContainer={false} open title="就地渲染">
        内容
      </Modal>,
    )
    expect(inline.container.querySelector('.yakit-modal-title')?.textContent).toBe('就地渲染')
    expect(document.querySelector('.yakit-modal-mask')).toBeNull()
  })

  it('locks body scroll and keeps focus inside the dialog', () => {
    const previous = document.body.style.overflow
    render(<button type="button">外面</button>)
    const outside = document.querySelector('button')
    outside?.focus()
    const { root } = render(
      <Modal open title="焦点">
        内容
      </Modal>,
    )

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(dialog())

    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.yakit-modal button')]
    const last = buttons[buttons.length - 1]
    last?.focus()
    dialog()?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }))
    expect(document.activeElement).toBe(buttons[0])

    root.unmount()
    expect(document.body.style.overflow).toBe(previous)
    expect(document.activeElement).toBe(outside)
  })
})

describe('Modal alert', () => {
  it('renders a status icon, help action and custom actions', () => {
    const onHelp = vi.fn()
    render(
      <Modal
        cancelText="Cancel"
        layout="alert"
        okText="Done"
        onHelp={onHelp}
        open
        status="success"
        title="Some task has completed!"
      >
        Some contents...
      </Modal>,
    )

    expect(dialog()?.classList.contains('yakit-modal-alert')).toBe(true)
    expect(dialog()?.classList.contains('yakit-modal-success')).toBe(true)
    expect(document.querySelector('.yakit-modal-icon')).not.toBeNull()
    expect(document.querySelector('.yakit-modal-close')).toBeNull()
    expect(document.querySelector('.yakit-modal-body')?.textContent).toBe('Some contents...')
    expect(document.querySelector('.yakit-modal-footer')?.textContent).toContain('Cancel')
    expect(document.querySelector('.yakit-modal-footer')?.textContent).toContain('Done')

    document.querySelector<HTMLButtonElement>('.yakit-modal-help')?.click()
    expect(onHelp).toHaveBeenCalledTimes(1)
  })

  it('can hide the confirm button and replace the footer', () => {
    render(
      <Modal footer={<button type="button">一键安装</button>} layout="alert" open showOk={false} title="未安装引擎">
        说明
      </Modal>,
    )

    expect(document.querySelector('.yakit-modal-footer')?.textContent).toBe('一键安装')
    expect(document.querySelector('.yakit-modal-footer')?.textContent).not.toContain('确定')
  })
})

describe('Modal review fixes', () => {
  it('shows confirmLoading on the ok button', () => {
    render(
      <Modal confirmLoading open title="Title">
        body
      </Modal>,
    )

    const ok = footerButton('确定')
    expect(ok?.className).toContain('yakit-btn-loading')
    expect(ok?.disabled).toBe(true)
  })

  it('gates help on onHelp, with showHelp override', () => {
    const missing = render(
      <Modal layout="alert" open status="info" title="No help">
        body
      </Modal>,
    )
    expect(document.querySelector('.yakit-modal-help')).toBeNull()
    missing.root.unmount()

    const withHandler = render(
      <Modal layout="alert" onHelp={() => undefined} open status="info" title="Has help">
        body
      </Modal>,
    )
    expect(document.querySelector('.yakit-modal-help')).not.toBeNull()
    withHandler.root.unmount()

    render(
      <Modal layout="alert" open showHelp title="Forced help">
        body
      </Modal>,
    )
    expect(document.querySelector('.yakit-modal-help')).not.toBeNull()
  })

  it('mounts into getContainer and uses aria-label without title', () => {
    const host = document.createElement('div')
    document.body.append(host)
    render(
      <Modal getContainer={() => host} open>
        body
      </Modal>,
    )

    expect(host.querySelector('.yakit-modal')).not.toBeNull()
    expect(host.querySelector('.yakit-modal')?.getAttribute('aria-label')).toBe('对话框')
    expect(host.querySelector('.yakit-modal')?.getAttribute('aria-labelledby')).toBeNull()
  })

  it('does not close on outside click when mask is false unless maskClosable is true', () => {
    const onCancel = vi.fn()
    const blocked = render(
      <Modal mask={false} onCancel={onCancel} open title="No mask">
        body
      </Modal>,
    )

    clickMaskWrap()
    expect(onCancel).not.toHaveBeenCalled()
    expect(document.querySelector('.yakit-modal-mask')).toBeNull()
    blocked.root.unmount()

    render(
      <Modal mask={false} maskClosable onCancel={onCancel} open title="Explicit">
        body
      </Modal>,
    )
    clickMaskWrap()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps the top Escape handler when a lower onCancel identity changes', () => {
    const lowerCancel = vi.fn()
    const upperCancel = vi.fn()

    const Harness = ({ lowerOnCancel }: { lowerOnCancel: () => void }) => (
      <>
        <Modal defaultOpen onCancel={lowerOnCancel} title="Lower" zIndex={1000}>
          lower
        </Modal>
        <Modal defaultOpen onCancel={upperCancel} title="Upper" zIndex={1100}>
          upper
        </Modal>
      </>
    )

    const { root } = render(<Harness lowerOnCancel={lowerCancel} />)
    expect(document.querySelectorAll('.yakit-modal')).toHaveLength(2)

    // Parent re-render swaps lower onCancel identity; the top dialog still owns Escape.
    const nextLowerCancel = vi.fn()
    flushSync(() => {
      root.render(<Harness lowerOnCancel={nextLowerCancel} />)
    })
    expect(document.querySelectorAll('.yakit-modal')).toHaveLength(2)

    flushSync(() => {
      pressEscape(topDialog())
    })
    expect(upperCancel).toHaveBeenCalledTimes(1)
    expect(lowerCancel).not.toHaveBeenCalled()
    expect(nextLowerCancel).not.toHaveBeenCalled()
    expect(document.querySelectorAll('.yakit-modal')).toHaveLength(1)
  })

  it('only the top modal handles Escape and restores overflow after both close', () => {
    const lowerCancel = vi.fn()
    const upperCancel = vi.fn()
    const previous = document.body.style.overflow

    render(
      <Modal defaultOpen onCancel={lowerCancel} title="Lower" zIndex={1000}>
        lower
      </Modal>,
    )
    render(
      <Modal defaultOpen onCancel={upperCancel} title="Upper" zIndex={1100}>
        upper
      </Modal>,
    )

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.querySelectorAll('.yakit-modal')).toHaveLength(2)

    flushSync(() => {
      pressEscape(topDialog())
    })
    expect(upperCancel).toHaveBeenCalledTimes(1)
    expect(lowerCancel).not.toHaveBeenCalled()
    expect(document.querySelectorAll('.yakit-modal')).toHaveLength(1)
    expect(document.body.style.overflow).toBe('hidden')

    flushSync(() => {
      pressEscape()
    })
    expect(lowerCancel).toHaveBeenCalledTimes(1)
    expect(document.querySelectorAll('.yakit-modal')).toHaveLength(0)
    expect(document.body.style.overflow).toBe(previous)
  })

  it('reads ok/cancel/close/help/aria from ConfigProvider locale', () => {
    render(
      <ConfigProvider
        locale={{
          locale: 'en-US',
          Modal: {
            ok: 'OK',
            cancel: 'Cancel',
            close: 'Close',
            help: 'Help',
            ariaLabel: 'Dialog',
          },
        }}
      >
        <Modal layout="alert" onHelp={() => undefined} open>
          body
        </Modal>
      </ConfigProvider>,
    )

    expect(footerButton('OK')).toBeTruthy()
    expect(footerButton('Cancel')).toBeTruthy()
    expect(document.querySelector('.yakit-modal-help')?.getAttribute('aria-label')).toBe('Help')
    expect(dialog()?.getAttribute('aria-label')).toBe('Dialog')
  })

  it('omits an empty dialog body and sets title attr for string titles', () => {
    render(<Modal open title="Plain title" />)
    expect(document.querySelector('.yakit-modal-body')).toBeNull()
    expect(document.querySelector('.yakit-modal-title')?.getAttribute('title')).toBe('Plain title')
  })
})

describe('Modal focus and escape review', () => {
  it('keeps focus on an autoFocus field inside the dialog', () => {
    render(
      <Modal open title="Auto focus">
        <input autoFocus data-testid="auto-focus" />
      </Modal>,
    )

    expect(document.activeElement).toBe(document.querySelector('[data-testid="auto-focus"]'))
  })

  it('keeps focus inside when clicking the backdrop without dismissing', async () => {
    render(
      <Modal maskClosable={false} open title="Backdrop">
        body
      </Modal>,
    )

    const wrap = document.querySelector('.yakit-modal-wrap')
    await userEvent.click(wrap!, { position: { x: 4, y: 4 } })
    expect(document.activeElement).toBe(dialog())
  })

  it('cycles focus through the sentinels at both ends', () => {
    render(
      <Modal open title="Sentinels">
        <button type="button">inside</button>
      </Modal>,
    )

    const buttons = [...dialog()!.querySelectorAll<HTMLButtonElement>('button')]
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    const sentinels = document.querySelectorAll<HTMLElement>('.yakit-modal-sentinel')

    sentinels[0]?.focus()
    expect(document.activeElement).toBe(last)
    sentinels[1]?.focus()
    expect(document.activeElement).toBe(first)
  })

  it('keeps footer button nodes stable across unrelated re-renders', () => {
    // Inline callbacks are the common case and must not invalidate the memo.
    const Render = (title: string) => (
      <Modal onCancel={() => undefined} onOk={() => undefined} open title={title}>
        body
      </Modal>
    )
    const footerButtons = () => [...document.querySelectorAll<HTMLButtonElement>('.yakit-modal-footer button')]
    const { root } = render(Render('before'))
    const beforeCancel = footerButtons().find((button) => button.textContent === '取消')
    const beforeOk = footerButtons().find((button) => button.textContent === '确定')

    flushSync(() => {
      root.render(Render('after'))
    })
    const afterCancel = footerButtons().find((button) => button.textContent === '取消')
    const afterOk = footerButtons().find((button) => button.textContent === '确定')

    expect(afterCancel).toBe(beforeCancel)
    expect(afterOk).toBe(beforeOk)
  })

  it('lets an inner dropdown consume Escape before closing the dialog', async () => {
    const onCancel = vi.fn()
    render(
      <Modal onCancel={onCancel} open title="Nested">
        <Dropdown defaultOpen menu={{ items: [{ key: 'a', label: 'A' }] }}>
          <button type="button">trigger</button>
        </Dropdown>
      </Modal>,
    )

    await vi.waitFor(() => {
      expect(document.querySelector('[role="menu"]')).not.toBeNull()
    })
    const trigger = document.querySelector<HTMLButtonElement>('.yakit-modal [aria-haspopup="menu"]')!
    trigger.focus()

    await userEvent.keyboard('{Escape}')
    await vi.waitFor(() => {
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
    })
    expect(onCancel).not.toHaveBeenCalled()

    trigger.focus()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps escape working after confirmLoading replaces the ok button', async () => {
    const onCancel = vi.fn()
    const AsyncModal = () => {
      const [loading, setLoading] = React.useState(false)
      return (
        <Modal confirmLoading={loading} onCancel={onCancel} onOk={() => setLoading(true)} open title="Async">
          body
        </Modal>
      )
    }

    render(<AsyncModal />)
    flushSync(() => footerButton('确定')?.click())

    await vi.waitFor(() => {
      expect(dialog()?.contains(document.activeElement)).toBe(true)
    })
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('handles escape on document when focus has left the dialog', () => {
    const onCancel = vi.fn()
    render(
      <Modal onCancel={onCancel} open title="焦点在外">
        body
      </Modal>,
    )
    ;(document.activeElement as HTMLElement | null)?.blur()
    expect(document.activeElement).toBe(document.body)

    pressEscape(document.body)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('Modal yakit compat aliases', () => {
  it('treats visible as open and merges wrapClassName onto root', () => {
    render(
      <Modal title="别名" visible wrapClassName="pilot-wrap">
        内容
      </Modal>,
    )

    expect(dialog()).not.toBeNull()
    expect(document.querySelector('.yakit-modal-root')?.classList.contains('pilot-wrap')).toBe(true)
  })

  it('calls afterClose when open becomes false', () => {
    const afterClose = vi.fn()
    const Harness = ({ open }: { open: boolean }) => (
      <Modal afterClose={afterClose} open={open} title="关闭后">
        内容
      </Modal>
    )
    const { root } = render(<Harness open />)
    expect(dialog()).not.toBeNull()
    flushSync(() => {
      root.render(<Harness open={false} />)
    })
    expect(dialog()).toBeNull()
    expect(afterClose).toHaveBeenCalledTimes(1)
  })

  it('supports footer render function with OkBtn / CancelBtn', () => {
    const onOk = vi.fn()
    render(
      <Modal
        footer={({ OkBtn, CancelBtn }) => (
          <>
            <CancelBtn />
            <OkBtn />
          </>
        )}
        onOk={onOk}
        open
        title="自定义底部"
      >
        内容
      </Modal>,
    )

    expect(footerButton('取消')).toBeTruthy()
    flushSync(() => footerButton('确定')?.click())
    expect(onOk).toHaveBeenCalledTimes(1)
  })
})

describe('YakitModalCompat', () => {
  it('maps type to variant and large size to medium', () => {
    const gray = render(
      <YakitModalCompat open title="gray" type="gray">
        body
      </YakitModalCompat>,
    )
    expect(dialog()?.classList.contains('yakit-modal-basic')).toBe(true)
    gray.root.unmount()

    const white = render(
      <YakitModalCompat open size="large" title="white" type="white">
        body
      </YakitModalCompat>,
    )
    expect(dialog()?.classList.contains('yakit-modal-banner')).toBe(true)
    expect(dialog()?.classList.contains('yakit-modal-medium')).toBe(true)
    white.root.unmount()
  })

  it('defaults keyboard to false and allows explicit true', () => {
    const onCancel = vi.fn()
    const blocked = render(
      <YakitModalCompat onCancel={onCancel} open title="no esc">
        body
      </YakitModalCompat>,
    )
    pressEscape()
    expect(onCancel).not.toHaveBeenCalled()
    blocked.root.unmount()

    render(
      <YakitModalCompat keyboard onCancel={onCancel} open title="esc">
        body
      </YakitModalCompat>,
    )
    pressEscape()
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('hides header when hiddenHeader is set', () => {
    render(
      <YakitModalCompat hiddenHeader open title="应隐藏" subTitle="辅助">
        body
      </YakitModalCompat>,
    )

    expect(document.querySelector('.yakit-modal-title')).toBeNull()
    expect(document.querySelector('.yakit-modal-subtitle')).toBeNull()
    expect(document.querySelector('.yakit-modal-close')).toBeNull()
  })

  it('routes close button to onCloseX instead of onCancel', () => {
    const onCancel = vi.fn()
    const onCloseX = vi.fn()
    render(
      <YakitModalCompat onCancel={onCancel} onCloseX={onCloseX} open title="关闭 X">
        body
      </YakitModalCompat>,
    )

    document.querySelector<HTMLButtonElement>('.yakit-modal-close')?.click()
    expect(onCloseX).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('adapts legacy dual-arg footer and hides buttons via style.display none', () => {
    const onOk = vi.fn()
    const dual = render(
      <YakitModalCompat
        footer={(nodes, { OkBtn, CancelBtn }) => (
          <>
            {nodes}
            <CancelBtn />
            <OkBtn />
          </>
        )}
        onOk={onOk}
        open
        title="双签名"
      >
        body
      </YakitModalCompat>,
    )

    expect(footerButton('取消')).toBeTruthy()
    flushSync(() => footerButton('确定')?.click())
    expect(onOk).toHaveBeenCalledTimes(1)
    dual.root.unmount()

    render(
      <YakitModalCompat
        okButtonProps={{ style: { display: 'none' } }}
        cancelButtonProps={{ style: { display: 'none' } }}
        open
        title="隐藏按钮"
      >
        body
      </YakitModalCompat>,
    )

    expect(footerButton('确定')).toBeUndefined()
    expect(footerButton('取消')).toBeUndefined()
    expect(document.querySelector('.yakit-modal-footer')).toBeNull()
  })

  it('gives legacy single-arg footers the default nodes instead of crashing', () => {
    render(
      <YakitModalCompat
        footer={(nodes: React.ReactNode) => <div className="legacy-single">{nodes}</div>}
        open
        title="单参"
      >
        body
      </YakitModalCompat>,
    )

    expect(document.querySelector('.legacy-single')).not.toBeNull()
    expect(footerButton('取消')).toBeTruthy()
    expect(footerButton('确定')).toBeTruthy()
  })

  it('renders footerExtra separately while legacy nodes keep the default buttons', () => {
    render(
      <YakitModalCompat
        footer={(nodes: React.ReactNode) => (
          <>
            <div className="legacy-dual-nodes">{nodes}</div>
            <span className="legacy-dual-extra">custom</span>
          </>
        )}
        footerExtra={<span>extra</span>}
        open
        title="双参"
      >
        body
      </YakitModalCompat>,
    )

    expect(document.querySelector('.yakit-modal-footer-extra')?.textContent).toBe('extra')
    expect(document.querySelector('.legacy-dual-nodes')?.textContent).toContain('取消')
    expect(document.querySelector('.legacy-dual-nodes')?.textContent).toContain('确定')
    expect(document.querySelector('.legacy-dual-extra')?.textContent).toBe('custom')
  })

  it('omits display:none buttons from legacy footer nodes', () => {
    render(
      <YakitModalCompat
        footer={(nodes: React.ReactNode) => <div className="legacy-hidden">{nodes}</div>}
        okButtonProps={{ style: { display: 'none' } }}
        open
        title="隐藏确定"
      >
        body
      </YakitModalCompat>,
    )

    expect(footerButton('确定')).toBeUndefined()
    expect(footerButton('取消')).toBeTruthy()
  })

  it('still supports new-style footer functions', () => {
    render(
      <YakitModalCompat
        footer={({ OkBtn }: { OkBtn: React.FC }) => (
          <>
            <span className="legacy-new-style">new</span>
            <OkBtn />
          </>
        )}
        open
        title="新签名"
      >
        body
      </YakitModalCompat>,
    )

    expect(document.querySelector('.legacy-new-style')?.textContent).toBe('new')
    expect(footerButton('确定')).toBeTruthy()
  })
})

describe('Modal hydration', () => {
  it('rebinds mask interactions after hydrating an open dialog', async () => {
    const mountNode = document.createElement('div')
    document.body.append(mountNode)
    const onCancel = vi.fn()
    const tree = (
      <Modal maskClosable onCancel={onCancel} open title="Hydrated">
        body
      </Modal>
    )
    const markup = renderToString(tree)
    expect(markup).toContain('yakit-modal')
    expect(markup).not.toContain('yakit-modal-wrap')
    mountNode.innerHTML = markup

    const recoverable: unknown[] = []
    const root: Root = hydrateRoot(mountNode, tree, {
      onRecoverableError: (error) => recoverable.push(error),
    })

    try {
      await vi.waitFor(() => {
        expect(document.querySelector('.yakit-modal-wrap')).not.toBeNull()
      })
      expect(recoverable).toEqual([])
      clickMaskWrap()
      expect(onCancel).toHaveBeenCalledTimes(1)
    } finally {
      root.unmount()
      mountNode.remove()
    }
  })
})

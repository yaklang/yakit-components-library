import type { IconComponent } from '@yakit-libs/yakit-ui-icons'
import classNames from 'classnames'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FC,
} from 'react'
import { createPortal } from 'react-dom'

import useYakitConfig from '../../hooks/useYakitConfig'
import { QuestionMarkCircleOutlined, XOutlined } from '../../icons/outline'
import { CheckCircleSolid, ExclamationSolid, XCircleSolid, InformationCircleSolid } from '../../icons/solid'
import { getYakitTokenVariables, type YakitCSSProperties } from '../../styles/tokenVariables'
import Button from '../Button'

import './style/index.css'

import type { ModalFooterContext, ModalProps, ModalStatus } from './type'

const prefix = 'yakit-modal'
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const subscribeHydration = () => () => undefined
const getClientHydrationSnapshot = () => true
const getServerHydrationSnapshot = () => false

const STATUS_ICONS: Record<ModalStatus, { Icon: IconComponent; color: string }> = {
  info: { Icon: InformationCircleSolid, color: 'var(--Colors-Use-Purple-Primary)' },
  success: { Icon: CheckCircleSolid, color: 'var(--Colors-Use-Success-Primary)' },
  warning: { Icon: ExclamationSolid, color: 'var(--Colors-Use-Warning-Primary)' },
  error: { Icon: XCircleSolid, color: 'var(--Colors-Use-Error-Primary)' },
}

const StatusGlyph = ({ status }: { status: ModalStatus }) => {
  const { Icon, color } = STATUS_ICONS[status]
  return <Icon color={color} size={32} />
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

const getFocusableItems = (panel: HTMLElement) =>
  Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => !element.hasAttribute('disabled'))

const resolveContainer = (getContainer: ModalProps['getContainer']) => {
  if (getContainer === false || typeof document === 'undefined') return null
  if (typeof getContainer === 'function') return getContainer()
  if (typeof getContainer === 'string') {
    return document.querySelector<HTMLElement>(getContainer) ?? document.body
  }
  return getContainer ?? document.body
}

/** Multiple open Modals share one body scroll lock. */
let bodyLockCount = 0
let previousBodyOverflow = ''

const lockBodyScroll = () => {
  if (typeof document === 'undefined') return
  if (bodyLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyLockCount += 1
}

const unlockBodyScroll = () => {
  if (typeof document === 'undefined') return
  bodyLockCount = Math.max(0, bodyLockCount - 1)
  if (bodyLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
  }
}

/**
 * Escape is handled on document so a focused control that disappears (e.g. the Ok
 * button turning into confirmLoading) cannot disable keyboard dismissal. Only the
 * topmost open layer reacts; portals mount in opening order, and z-index breaks
 * ties because callers can raise a dialog explicitly.
 */
type ModalLayer = { id: symbol; getZIndex: () => number }
const modalLayers: ModalLayer[] = []

const registerModalLayer = (layer: ModalLayer) => {
  if (!modalLayers.includes(layer)) modalLayers.push(layer)
}

const unregisterModalLayer = (layer: ModalLayer) => {
  const index = modalLayers.indexOf(layer)
  if (index >= 0) modalLayers.splice(index, 1)
}

const isTopmostModalLayer = (layer: ModalLayer) => {
  if (modalLayers.length === 0) return false
  let top = modalLayers[0]
  for (let index = 1; index < modalLayers.length; index += 1) {
    if (modalLayers[index].getZIndex() >= top.getZIndex()) top = modalLayers[index]
  }
  return top === layer
}

const textTitleAttr = (value: unknown) => (typeof value === 'string' ? value : undefined)

export const Modal = ({
  open: openProp,
  visible,
  defaultOpen = false,
  layout = 'dialog',
  variant = 'basic',
  size = 'small',
  status,
  title,
  subTitle,
  statusBar,
  icon,
  children,
  footer,
  footerExtra,
  okText,
  cancelText,
  showOk = true,
  showCancel = true,
  confirmLoading = false,
  okButtonProps,
  cancelButtonProps,
  closable,
  closeLabel,
  mask = true,
  maskClosable,
  keyboard = true,
  getContainer,
  width,
  zIndex = 1000,
  showHelp,
  helpLabel,
  onHelp,
  onOk,
  onCancel,
  onClose,
  afterClose,
  bodyStyle,
  className,
  rootClassName,
  wrapClassName,
  style,
}: ModalProps) => {
  const config = useYakitConfig()
  const isHydrated = useSyncExternalStore(subscribeHydration, getClientHydrationSnapshot, getServerHydrationSnapshot)
  const modalLocale = config.locale.Modal
  const titleId = useId()
  const subTitleId = useId()
  const bodyId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const zIndexRef = useRef(zIndex)
  const [layer] = useState<ModalLayer>(() => ({
    id: Symbol('yakit-modal'),
    getZIndex: () => zIndexRef.current,
  }))
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const wasOpenRef = useRef(false)
  // Controlled: open wins over visible. Uncontrolled falls back to internal state.
  const controlledOpen = openProp ?? visible
  const open = controlledOpen ?? uncontrolledOpen
  const inline = getContainer === false
  const resolvedClosable = closable ?? layout === 'dialog'
  // Default: show help only when onHelp is provided; showHelp overrides.
  const resolvedShowHelp = showHelp ?? Boolean(onHelp)
  // mask=false: do not close on outside click unless maskClosable is explicitly true.
  const resolvedMaskClosable = maskClosable ?? Boolean(mask)
  const resolvedOkText = okText ?? modalLocale?.ok ?? '确定'
  const resolvedCancelText = cancelText ?? modalLocale?.cancel ?? '取消'
  const resolvedCloseLabel = closeLabel ?? modalLocale?.close ?? '关闭'
  const resolvedHelpLabel = helpLabel ?? modalLocale?.help ?? '帮助'
  const resolvedAriaLabel = modalLocale?.ariaLabel ?? '对话框'
  const actionSize = layout === 'alert' ? 'huge' : size === 'medium' ? 'large' : 'medium'
  const closeSize = size === 'medium' ? 'large' : 'medium'

  const close = useCallback(() => {
    onCancel?.()
    if (controlledOpen === undefined) setUncontrolledOpen(false)
  }, [onCancel, controlledOpen])

  const closeByX = useCallback(() => {
    if (onClose) {
      onClose()
      if (controlledOpen === undefined) setUncontrolledOpen(false)
      return
    }
    close()
  }, [close, controlledOpen, onClose])

  const confirm = useCallback(() => {
    // 非受控：调用后立刻关。异步提交请用受控 open + confirmLoading。
    onOk?.()
    if (controlledOpen === undefined) setUncontrolledOpen(false)
  }, [onOk, controlledOpen])

  // Memoize the footer components so unrelated parent re-renders do not remount
  // (and blur) the buttons rendered through footer / footer render functions.
  // Callbacks go through refs: consumers usually pass inline arrow functions, so
  // putting them in the memo deps would recreate (and remount) the buttons anyway.
  const confirmRef = useRef(confirm)
  const closeRef = useRef(close)
  useIsomorphicLayoutEffect(() => {
    confirmRef.current = confirm
    closeRef.current = close
    zIndexRef.current = zIndex
  })
  const okDisabled = okButtonProps?.disabled
  const okLoading = okButtonProps?.loading
  const cancelDisabled = cancelButtonProps?.disabled
  const cancelLoading = cancelButtonProps?.loading
  const OkBtn = useMemo<FC>(
    () => () => (
      <Button
        disabled={okDisabled}
        htmlType="button"
        loading={confirmLoading || okLoading}
        onClick={() => confirmRef.current()}
        size={actionSize}
        type="primary"
      >
        {resolvedOkText}
      </Button>
    ),
    [actionSize, confirmLoading, okDisabled, okLoading, resolvedOkText],
  )
  const CancelBtn = useMemo<FC>(
    () => () => (
      <Button
        disabled={cancelDisabled}
        htmlType="button"
        loading={cancelLoading}
        onClick={() => closeRef.current()}
        size={actionSize}
        type="outline2"
      >
        {resolvedCancelText}
      </Button>
    ),
    [actionSize, cancelDisabled, cancelLoading, resolvedCancelText],
  )

  const focusEdge = (edge: 'first' | 'last') => {
    const panelNode = panelRef.current
    if (!panelNode) return
    const items = getFocusableItems(panelNode)
    const target = edge === 'first' ? items[0] : items[items.length - 1]
    ;(target ?? panelNode).focus()
  }

  useIsomorphicLayoutEffect(() => {
    if (!open || inline) return undefined
    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [inline, isHydrated, open])

  // Bind Escape on document: focus can fall to <body> when the Ok button turns into
  // confirmLoading, and a wrap-bound listener would miss the event afterwards.
  // Nested portal overlays (Dropdown/Select) consume Escape through their own
  // document listener; the expanded-trigger check below keeps the dialog open for
  // that first press.
  useIsomorphicLayoutEffect(() => {
    if (!open || inline || !keyboard) return undefined
    registerModalLayer(layer)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (!isTopmostModalLayer(layer)) return
      const target = event.target instanceof Element ? event.target : null
      // An expanded popup trigger owns Escape; its own handler closes the popup first.
      if (target?.closest('[aria-haspopup][aria-expanded="true"]')) return
      // Popups portal out of the panel; an expanded trigger inside still marks one.
      if (panelRef.current?.querySelector('[aria-haspopup][aria-expanded="true"]')) return
      event.preventDefault()
      closeRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      unregisterModalLayer(layer)
    }
  }, [inline, keyboard, layer, open])

  useIsomorphicLayoutEffect(() => {
    const panelNode = panelRef.current
    if (!open || inline || !panelNode) return undefined
    const previouslyFocused = document.activeElement
    // Respect autoFocus / layout-effect focus inside the dialog content.
    if (!panelNode.contains(document.activeElement)) panelNode.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = getFocusableItems(panelNode)
      if (items.length === 0) {
        event.preventDefault()
        panelNode.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === panelNode)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    panelNode.addEventListener('keydown', onKeyDown)
    return () => {
      panelNode.removeEventListener('keydown', onKeyDown)
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus()
      }
    }
  }, [inline, isHydrated, open])

  // A focused control can be removed or disabled while the dialog stays open
  // (e.g. Ok turns into confirmLoading). Focus then falls to <body>, where the
  // panel-level Tab trap cannot see keys; pull it back into the dialog.
  const hadFocusRef = useRef(false)
  useIsomorphicLayoutEffect(() => {
    if (!open || inline) {
      hadFocusRef.current = false
      return
    }
    const panelNode = panelRef.current
    if (!panelNode) {
      hadFocusRef.current = false
      return
    }
    if (panelNode.contains(document.activeElement)) {
      hadFocusRef.current = true
      return
    }
    const active = document.activeElement
    if (hadFocusRef.current && (active === null || active === document.body) && document.hasFocus()) {
      panelNode.focus({ preventScroll: true })
    }
  })

  // 遮罩关闭：mousedown 与 mouseup 都必须落在 wrap 上（antd 同款），避免面板内按下拖出误关。
  // 同时阻止 wrap mousedown 的默认聚焦，避免点遮罩后焦点掉到 body、Tab 逃出对话框。
  useIsomorphicLayoutEffect(() => {
    const wrapNode = wrapRef.current
    if (!open || inline || !wrapNode) return undefined
    let mouseDownOnWrap = false
    const onMouseDown = (event: MouseEvent) => {
      if (event.target !== wrapNode) return
      event.preventDefault()
      mouseDownOnWrap = resolvedMaskClosable
    }
    const onMouseUp = (event: MouseEvent) => {
      if (mouseDownOnWrap && event.target === wrapNode) {
        closeRef.current()
      }
      mouseDownOnWrap = false
    }
    wrapNode.addEventListener('mousedown', onMouseDown)
    wrapNode.addEventListener('mouseup', onMouseUp)
    return () => {
      wrapNode.removeEventListener('mousedown', onMouseDown)
      wrapNode.removeEventListener('mouseup', onMouseUp)
    }
  }, [inline, isHydrated, open, resolvedMaskClosable])

  // afterClose: no exit animation → fire when open flips true→false.
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      afterClose?.()
    }
    wasOpenRef.current = open
  }, [afterClose, open])

  if (!open) return null

  // Only the short subtitle is announced as the description; including the whole
  // body makes screen readers read the entire dialog content on open.
  const describedBy = subTitle ? subTitleId : undefined
  const tokenStyle = {
    ...getYakitTokenVariables(config.token),
    '--yakit-modal-z-index': zIndex,
  } as YakitCSSProperties
  const panelStyle: CSSProperties = {
    width: width ?? (layout === 'alert' ? 448 : 560),
    ...tokenStyle,
    ...style,
  }
  const resolvedIcon = icon ?? (status ? <StatusGlyph status={status} /> : null)

  const footerCtx: ModalFooterContext = { OkBtn, CancelBtn }
  const defaultActions = (
    <>
      {showCancel ? <CancelBtn /> : null}
      {showOk ? <OkBtn /> : null}
    </>
  )
  const actions = footer === undefined ? defaultActions : typeof footer === 'function' ? footer(footerCtx) : footer
  const showFooter = actions !== null && (footer !== undefined || showCancel || showOk || Boolean(footerExtra))
  const closeButton = resolvedClosable ? (
    <Button
      animation={false}
      aria-label={resolvedCloseLabel}
      className={`${prefix}-close`}
      htmlType="button"
      icon={<XOutlined />}
      onClick={closeByX}
      size={closeSize}
      type="text2"
    />
  ) : null
  const footerNode = showFooter ? (
    <div className={`${prefix}-footer`}>
      {footerExtra ? <div className={`${prefix}-footer-extra`}>{footerExtra}</div> : null}
      {actions !== null ? <div className={`${prefix}-footer-actions`}>{actions}</div> : null}
    </div>
  ) : null

  const titleNode = title ? (
    <div className={`${prefix}-title`} id={titleId} title={textTitleAttr(title)}>
      {title}
    </div>
  ) : null
  const subTitleNode = subTitle ? (
    <div className={`${prefix}-subtitle`} id={subTitleId} title={textTitleAttr(subTitle)}>
      {subTitle}
    </div>
  ) : null
  const bodyNode = children ? (
    <div className={`${prefix}-body`} id={bodyId} style={bodyStyle}>
      {children}
    </div>
  ) : null

  const panel = (
    <div
      aria-describedby={describedBy || undefined}
      aria-label={title ? undefined : resolvedAriaLabel}
      aria-labelledby={title ? titleId : undefined}
      aria-modal={inline ? undefined : true}
      className={classNames(
        prefix,
        `${prefix}-${layout}`,
        `${prefix}-${size}`,
        `${prefix}-${variant}`,
        status && `${prefix}-${status}`,
        className,
      )}
      data-theme={config.mode}
      dir={config.direction}
      ref={panelRef}
      role="dialog"
      style={panelStyle}
      tabIndex={-1}
    >
      {layout === 'alert' ? (
        <>
          {resolvedIcon || resolvedShowHelp ? (
            <div className={`${prefix}-icon-col`}>
              {resolvedIcon ? <div className={`${prefix}-icon`}>{resolvedIcon}</div> : <span />}
              {resolvedShowHelp ? (
                <button aria-label={resolvedHelpLabel} className={`${prefix}-help`} onClick={onHelp} type="button">
                  <QuestionMarkCircleOutlined color="currentColor" size={20} />
                </button>
              ) : null}
            </div>
          ) : null}
          <div className={`${prefix}-alert-main`}>
            <div className={`${prefix}-alert-content`}>
              <div className={`${prefix}-alert-head`}>
                {titleNode}
                {closeButton}
              </div>
              {subTitleNode}
              {bodyNode}
            </div>
            {footerNode}
          </div>
        </>
      ) : (
        <>
          {titleNode || subTitleNode || closeButton ? (
            <div className={`${prefix}-header`}>
              <div className={`${prefix}-heading`}>
                {titleNode}
                {subTitleNode}
              </div>
              {closeButton}
            </div>
          ) : null}
          {variant === 'banner' && statusBar ? <div className={`${prefix}-status`}>{statusBar}</div> : null}
          {bodyNode}
          {footerNode}
        </>
      )}
    </div>
  )

  if (inline || !isHydrated || typeof document === 'undefined') return panel

  const container = resolveContainer(getContainer)
  if (!container) return panel

  return createPortal(
    <div
      className={classNames(`${prefix}-root`, rootClassName, wrapClassName)}
      data-theme={config.mode}
      style={tokenStyle}
    >
      {mask ? <div className={`${prefix}-mask`} /> : null}
      <div className={`${prefix}-wrap`} ref={wrapRef}>
        <div className={`${prefix}-sentinel`} onFocus={() => focusEdge('last')} tabIndex={0} />
        {panel}
        <div className={`${prefix}-sentinel`} onFocus={() => focusEdge('first')} tabIndex={0} />
      </div>
    </div>,
    container,
  )
}

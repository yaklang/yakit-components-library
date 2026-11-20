import classNames from 'classnames'
import {
  forwardRef,
  Fragment,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import useIsomorphicLayoutEffect from '../../hooks/useIsomorphicLayoutEffect'
import useYakitConfig from '../../hooks/useYakitConfig'
import { getYakitTokenVariables, type YakitCSSProperties } from '../../styles/tokenVariables'

import './style/index.css'

import type {
  InputProps,
  InputRef,
  InputSemanticClassNames,
  InputSemanticInfo,
  InputSemanticStyles,
  InputSize,
  OTPProps,
  OTPRef,
  PasswordProps,
  TextAreaProps,
  TextAreaRef,
} from './type'

const prefixCls = 'yakit-input'
const normalizeSize = (size: InputSize | undefined, fallback: InputSize = 'large') => {
  const resolved = size ?? fallback
  return resolved === 'middle' ? 'medium' : resolved
}

const toStringValue = (value: unknown) => (value == null ? '' : String(value))

const useStringValue = (value: unknown, defaultValue: unknown) => {
  const controlled = value !== undefined
  const [innerValue, setInnerValue] = useState(() => toStringValue(defaultValue))
  return [controlled ? toStringValue(value) : innerValue, setInnerValue, controlled] as const
}

const setNativeValue = (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

const getStatus = (status: InputProps['status'], error: boolean | undefined) => status ?? (error ? 'error' : undefined)

const resolveSemantic = <T,>(
  value: T | ((info: InputSemanticInfo) => T) | undefined,
  info: InputSemanticInfo,
): T | undefined => (typeof value === 'function' ? (value as (semanticInfo: InputSemanticInfo) => T)(info) : value)

const getRootClassName = (
  size: Exclude<InputSize, 'middle'>,
  options: {
    className?: string
    disabled?: boolean
    focused?: boolean
    kind?: string
    rootClassName?: string
    semanticRoot?: string
    status?: InputProps['status']
    variant?: InputProps['variant']
  },
) =>
  classNames(
    prefixCls,
    `${prefixCls}-${size}`,
    `${prefixCls}-control-${size}`,
    options.kind,
    options.status && `${prefixCls}-control-status-${options.status}`,
    options.variant && `${prefixCls}-${options.variant}`,
    {
      [`${prefixCls}-disabled`]: options.disabled,
      [`${prefixCls}-error`]: options.status === 'error',
      [`${prefixCls}-focused`]: options.focused,
    },
    options.semanticRoot,
    options.className,
    options.rootClassName,
  )

const renderCount = (
  value: string,
  maxLength: number | undefined,
  showCount: InputProps['showCount'],
  count: InputProps['count'],
) => {
  if (!showCount) return null
  const current = count?.strategy?.(value) ?? Array.from(value).length
  const max = count?.max ?? maxLength
  const info = { value, count: current, maxLength: max }
  const formatter = count?.formatter ?? (typeof showCount === 'object' ? showCount.formatter : undefined)
  return formatter?.(info) ?? `${current}${max === undefined ? '' : ` / ${max}`}`
}

const createInputHandle = (input: HTMLInputElement | null, nativeElement: HTMLElement | null): InputRef => ({
  input,
  nativeElement,
  focus: (options) => input?.focus(options),
  blur: () => input?.blur(),
  select: () => input?.select(),
  setSelectionRange: (...args) => input?.setSelectionRange(...args),
})

export const Input = forwardRef<InputRef, InputProps>(
  (
    {
      allowClear,
      className,
      classNames: semanticClassNames,
      count,
      defaultValue,
      disabled: disabledProp,
      error,
      maxLength,
      onBlur,
      onChange,
      onClear,
      onCompositionEnd,
      onCompositionStart,
      onFocus,
      onKeyDown,
      onPressEnter,
      prefix,
      readOnly,
      rootClassName,
      showCount,
      size: sizeProp,
      status,
      style,
      styles: semanticStyles,
      suffix,
      value,
      variant = 'outlined',
      ...nativeProps
    },
    ref,
  ) => {
    const config = useYakitConfig()
    const disabled = disabledProp ?? config.componentDisabled
    const size = sizeProp ?? (config.componentSize === 'huge' ? 'large' : config.componentSize)
    const inputRef = useRef<HTMLInputElement>(null)
    const rootRef = useRef<HTMLElement>(null)
    const composingRef = useRef(false)
    const [currentValue, setCurrentValue, controlled] = useStringValue(value, defaultValue)
    const [focused, setFocused] = useState(false)
    const visualSize = normalizeSize(size)
    const resolvedStatus = getStatus(status, error)
    const semanticInfo = { disabled: Boolean(disabled), focused, value: currentValue }
    const slotClasses = resolveSemantic<InputSemanticClassNames>(semanticClassNames, semanticInfo)
    const slotStyles = resolveSemantic<InputSemanticStyles>(semanticStyles, semanticInfo)
    const hasAffix = Boolean(prefix || suffix || allowClear || showCount)

    useImperativeHandle(ref, () => createInputHandle(inputRef.current, rootRef.current ?? inputRef.current))

    useEffect(() => {
      const form = inputRef.current?.form
      if (!form || controlled) return
      const reset = () => setCurrentValue(toStringValue(defaultValue))
      form.addEventListener('reset', reset)
      return () => form.removeEventListener('reset', reset)
    }, [controlled, defaultValue, nativeProps.form, setCurrentValue])

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      if (!controlled) setCurrentValue(event.target.value)
      onChange?.(event)
    }

    const inputClassName = hasAffix
      ? classNames(`${prefixCls}-control-input`, `${prefixCls}-slot-input`, slotClasses?.input)
      : getRootClassName(visualSize, {
          className,
          disabled,
          focused,
          rootClassName,
          semanticRoot: slotClasses?.root,
          status: resolvedStatus,
          variant,
        })

    const input = (
      <input
        {...nativeProps}
        aria-invalid={nativeProps['aria-invalid'] ?? (resolvedStatus === 'error' || undefined)}
        className={inputClassName}
        data-theme={config.mode}
        dir={config.direction}
        disabled={disabled}
        maxLength={maxLength}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        onChange={handleChange}
        onCompositionEnd={(event) => {
          composingRef.current = false
          onCompositionEnd?.(event)
        }}
        onCompositionStart={(event) => {
          composingRef.current = true
          onCompositionStart?.(event)
        }}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (
            !event.defaultPrevented &&
            event.key === 'Enter' &&
            !composingRef.current &&
            !event.nativeEvent.isComposing
          ) {
            onPressEnter?.(event)
          }
        }}
        readOnly={readOnly}
        ref={inputRef}
        style={
          hasAffix
            ? slotStyles?.input
            : ({
                ...getYakitTokenVariables(config.token),
                ...slotStyles?.root,
                ...slotStyles?.input,
                ...style,
              } as YakitCSSProperties)
        }
        value={currentValue}
      />
    )

    if (!hasAffix) {
      return <>{input}</>
    }

    const clearIcon = typeof allowClear === 'object' ? allowClear.clearIcon : undefined
    return (
      <span
        className={getRootClassName(visualSize, {
          className,
          disabled,
          focused,
          rootClassName,
          semanticRoot: classNames(`${prefixCls}-slot-root`, slotClasses?.root),
          status: resolvedStatus,
          variant,
        })}
        data-theme={config.mode}
        dir={config.direction}
        ref={rootRef}
        style={
          {
            ...getYakitTokenVariables(config.token),
            ...slotStyles?.root,
            ...style,
          } as YakitCSSProperties
        }
      >
        {prefix && (
          <span
            className={classNames(`${prefixCls}-control-prefix`, `${prefixCls}-slot-prefix`, slotClasses?.prefix)}
            style={slotStyles?.prefix}
          >
            {prefix}
          </span>
        )}
        {input}
        {allowClear && currentValue && !disabled && !readOnly ? (
          <button
            aria-label={config.locale.Input?.clear ?? '清除'}
            className={classNames(`${prefixCls}-control-clear-icon`, `${prefixCls}-slot-clear`, slotClasses?.clear)}
            onClick={() => {
              if (inputRef.current) setNativeValue(inputRef.current, '')
              onClear?.()
              inputRef.current?.focus()
            }}
            style={slotStyles?.clear}
            type="button"
          >
            {clearIcon ?? '×'}
          </button>
        ) : null}
        {suffix && (
          <span
            className={classNames(`${prefixCls}-control-suffix`, `${prefixCls}-slot-suffix`, slotClasses?.suffix)}
            style={slotStyles?.suffix}
          >
            {suffix}
          </span>
        )}
        {showCount && (
          <span
            className={classNames(
              `${prefixCls}-control-show-count-suffix`,
              `${prefixCls}-slot-count`,
              slotClasses?.count,
            )}
            style={slotStyles?.count}
          >
            {renderCount(currentValue, maxLength, showCount, count)}
          </span>
        )}
      </span>
    )
  },
)

export const TextArea = forwardRef<TextAreaRef, TextAreaProps>(
  (
    {
      allowClear,
      autoSize,
      className,
      classNames: semanticClassNames,
      count,
      defaultValue,
      disabled: disabledProp,
      error,
      maxLength,
      onBlur,
      onChange,
      onClear,
      onFocus,
      rootClassName,
      showCount,
      size: sizeProp,
      status,
      style,
      styles: semanticStyles,
      value,
      variant = 'outlined',
      ...nativeProps
    },
    ref,
  ) => {
    const config = useYakitConfig()
    const disabled = disabledProp ?? config.componentDisabled
    const size = sizeProp ?? (config.componentSize === 'huge' ? 'large' : config.componentSize)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [currentValue, setCurrentValue, controlled] = useStringValue(value, defaultValue)
    const [focused, setFocused] = useState(false)
    const visualSize = normalizeSize(size)
    const resolvedStatus = getStatus(status, error)
    const semanticInfo = { disabled: Boolean(disabled), focused, value: currentValue }
    const slotClasses = resolveSemantic(semanticClassNames, semanticInfo)
    const slotStyles = resolveSemantic(semanticStyles, semanticInfo)
    const wrapped = Boolean(allowClear || showCount)

    useImperativeHandle(ref, () => ({
      resizableTextArea: { textArea: textareaRef.current },
      nativeElement: textareaRef.current,
      focus: (options) => textareaRef.current?.focus(options),
      blur: () => textareaRef.current?.blur(),
    }))

    useEffect(() => {
      const form = textareaRef.current?.form
      if (!form || controlled) return
      const reset = () => setCurrentValue(toStringValue(defaultValue))
      form.addEventListener('reset', reset)
      return () => form.removeEventListener('reset', reset)
    }, [controlled, defaultValue, nativeProps.form, setCurrentValue])

    useIsomorphicLayoutEffect(() => {
      const textarea = textareaRef.current
      if (!textarea) return
      if (!autoSize) {
        textarea.style.height = ''
        textarea.style.overflowY = ''
        return
      }

      let frame = 0
      let active = true
      let observedWidth = textarea.getBoundingClientRect().width
      const measure = () => {
        const computed = getComputedStyle(textarea)
        const lineHeight = Number.parseFloat(computed.lineHeight) || 20
        const padding = (Number.parseFloat(computed.paddingTop) || 0) + (Number.parseFloat(computed.paddingBottom) || 0)
        const border =
          (Number.parseFloat(computed.borderTopWidth) || 0) + (Number.parseFloat(computed.borderBottomWidth) || 0)
        const minRows = typeof autoSize === 'object' ? autoSize.minRows : undefined
        const maxRows = typeof autoSize === 'object' ? autoSize.maxRows : undefined
        const borderBox = computed.boxSizing === 'border-box'
        const chrome = borderBox ? padding + border : 0
        const minHeight = minRows ? minRows * lineHeight + chrome : 0
        const maxHeight = maxRows ? maxRows * lineHeight + chrome : Number.POSITIVE_INFINITY

        textarea.style.height = 'auto'
        const contentHeight = textarea.scrollHeight + (borderBox ? border : -padding)
        const desiredHeight = Math.max(minHeight, Math.min(contentHeight, maxHeight))
        textarea.style.height = `${desiredHeight}px`
        textarea.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden'
      }
      const scheduleMeasure = () => {
        if (!active) return
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(measure)
      }

      measure()
      const resizeObserver =
        typeof ResizeObserver === 'undefined'
          ? undefined
          : new ResizeObserver(([entry]) => {
              const width = entry?.contentRect.width ?? textarea.getBoundingClientRect().width
              if (width === observedWidth) return
              observedWidth = width
              scheduleMeasure()
            })
      resizeObserver?.observe(textarea)
      window.addEventListener('resize', scheduleMeasure)
      document.fonts?.addEventListener?.('loadingdone', scheduleMeasure)
      void document.fonts?.ready.then(scheduleMeasure)

      return () => {
        active = false
        cancelAnimationFrame(frame)
        resizeObserver?.disconnect()
        window.removeEventListener('resize', scheduleMeasure)
        document.fonts?.removeEventListener?.('loadingdone', scheduleMeasure)
      }
    }, [autoSize, currentValue])

    const textarea = (
      <textarea
        {...nativeProps}
        aria-invalid={nativeProps['aria-invalid'] ?? (resolvedStatus === 'error' || undefined)}
        className={
          wrapped
            ? classNames(`${prefixCls}-slot-textarea`, slotClasses?.textarea)
            : getRootClassName(visualSize, {
                className,
                disabled,
                focused,
                kind: `${prefixCls}-textarea`,
                rootClassName,
                semanticRoot: slotClasses?.root,
                status: resolvedStatus,
                variant,
              })
        }
        data-theme={config.mode}
        dir={config.direction}
        disabled={disabled}
        maxLength={maxLength}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        onChange={(event) => {
          if (!controlled) setCurrentValue(event.target.value)
          onChange?.(event)
        }}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        ref={textareaRef}
        style={
          wrapped
            ? slotStyles?.textarea
            : ({
                ...getYakitTokenVariables(config.token),
                ...slotStyles?.root,
                ...slotStyles?.textarea,
                ...style,
              } as YakitCSSProperties)
        }
        value={currentValue}
      />
    )

    if (!wrapped) return textarea
    const clearIcon = typeof allowClear === 'object' ? allowClear.clearIcon : undefined
    return (
      <span
        className={getRootClassName(visualSize, {
          className,
          disabled,
          focused,
          kind: `${prefixCls}-textarea ${prefixCls}-textarea-wrapper`,
          rootClassName,
          semanticRoot: classNames(`${prefixCls}-slot-root`, slotClasses?.root),
          status: resolvedStatus,
          variant,
        })}
        data-theme={config.mode}
        dir={config.direction}
        style={
          {
            ...getYakitTokenVariables(config.token),
            ...slotStyles?.root,
            ...style,
          } as YakitCSSProperties
        }
      >
        {textarea}
        {allowClear && currentValue && !disabled && !nativeProps.readOnly && (
          <button
            aria-label={config.locale.Input?.clear ?? '清除'}
            className={classNames(`${prefixCls}-control-clear-icon`, `${prefixCls}-slot-clear`, slotClasses?.clear)}
            onClick={() => {
              if (textareaRef.current) setNativeValue(textareaRef.current, '')
              onClear?.()
            }}
            style={slotStyles?.clear}
            type="button"
          >
            {clearIcon ?? '×'}
          </button>
        )}
        {showCount && (
          <span
            className={classNames(
              `${prefixCls}-control-show-count-suffix`,
              `${prefixCls}-slot-count`,
              slotClasses?.count,
            )}
            style={slotStyles?.count}
          >
            {renderCount(currentValue, maxLength, showCount, count)}
          </span>
        )}
      </span>
    )
  },
)

export const Password = forwardRef<InputRef, PasswordProps>(
  ({ iconRender, visibilityToggle = true, suffix, type: _type, ...props }, ref) => {
    const config = useYakitConfig()
    const disabled = props.disabled ?? config.componentDisabled
    const visibilityConfig = typeof visibilityToggle === 'object' ? visibilityToggle : undefined
    const controlled = visibilityConfig?.visible !== undefined
    const [innerVisible, setInnerVisible] = useState(false)
    const visible = controlled ? Boolean(visibilityConfig?.visible) : innerVisible
    const inputRef = useRef<InputRef>(null)
    useImperativeHandle(ref, () => inputRef.current as InputRef)

    const toggle = useCallback(() => {
      if (disabled) return
      const next = !visible
      if (!controlled) setInnerVisible(next)
      visibilityConfig?.onVisibleChange?.(next)
      inputRef.current?.focus()
    }, [controlled, disabled, visibilityConfig, visible])

    const visibilityControl = visibilityToggle ? (
      <button
        aria-label={
          visible
            ? (config.locale.Input?.hidePassword ?? '隐藏密码')
            : (config.locale.Input?.showPassword ?? '显示密码')
        }
        className={`${prefixCls}-password-toggle`}
        disabled={disabled}
        onClick={toggle}
        tabIndex={disabled ? -1 : (visibilityConfig?.tabIndex ?? 0)}
        type="button"
      >
        {iconRender?.(visible) ?? (visible ? '◉' : '○')}
      </button>
    ) : null

    return (
      <Input
        {...props}
        className={classNames(`${prefixCls}-password`, props.className)}
        disabled={disabled}
        ref={inputRef}
        suffix={
          <>
            {suffix}
            {visibilityControl}
          </>
        }
        type={visible ? 'text' : 'password'}
      />
    )
  },
)

const splitOTP = (value: string, length: number) => Array.from(value).slice(0, length)
const trimOTPValues = (values: string[]) => {
  let end = values.length
  while (end > 0 && !values[end - 1]) end -= 1
  return values.slice(0, end)
}

export const OTP = forwardRef<OTPRef, OTPProps>(
  (
    {
      autoComplete,
      className,
      classNames: semanticClassNames,
      defaultValue,
      disabled: disabledProp,
      error,
      formatter,
      inputMode = 'text',
      length = 6,
      mask,
      onChange,
      onCompositionEnd,
      onCompositionStart,
      onInput,
      onKeyDown,
      onPaste,
      readOnly,
      rootClassName,
      separator,
      size: sizeProp,
      status,
      style,
      styles: semanticStyles,
      value,
      ...nativeProps
    },
    ref,
  ) => {
    const config = useYakitConfig()
    const disabled = disabledProp ?? config.componentDisabled
    const size = sizeProp ?? (config.componentSize === 'huge' ? 'large' : config.componentSize)
    const controlled = value !== undefined
    const [innerValues, setInnerValues] = useState(() =>
      Array.from({ length }, (_, index) => splitOTP(toStringValue(defaultValue), length)[index] ?? ''),
    )
    const controlledValue = formatter?.(toStringValue(value)) ?? toStringValue(value)
    const values = controlled
      ? Array.from({ length }, (_, index) => splitOTP(controlledValue, length)[index] ?? '')
      : Array.from({ length }, (_, index) => innerValues[index] ?? '')
    const currentValue = values.join('')
    const rootRef = useRef<HTMLDivElement>(null)
    const inputRefs = useRef<Array<HTMLInputElement | null>>([])
    const composingRef = useRef(false)
    const visualSize = normalizeSize(size)
    const resolvedStatus = getStatus(status, error)
    const semanticInfo = { disabled: Boolean(disabled), value: currentValue }
    const slotClasses = typeof semanticClassNames === 'function' ? semanticClassNames(semanticInfo) : semanticClassNames
    const slotStyles = typeof semanticStyles === 'function' ? semanticStyles(semanticInfo) : semanticStyles

    useImperativeHandle(ref, () => ({
      nativeElement: rootRef.current,
      focus: (index = 0) => inputRefs.current[Math.max(0, Math.min(index, length - 1))]?.focus(),
      blur: () => inputRefs.current.forEach((input) => input?.blur()),
    }))

    useEffect(() => {
      const form = inputRefs.current[0]?.form
      if (!form || controlled) return
      const reset = () =>
        setInnerValues(Array.from({ length }, (_, index) => splitOTP(toStringValue(defaultValue), length)[index] ?? ''))
      form.addEventListener('reset', reset)
      return () => form.removeEventListener('reset', reset)
    }, [controlled, defaultValue, length])

    const commit = (nextValues: string[], focusIndex?: number) => {
      const normalized = nextValues.slice(0, length)
      const nextValue = normalized.join('')
      if (!controlled) setInnerValues(normalized)
      onInput?.(trimOTPValues(normalized))
      if (normalized.length === length && normalized.every(Boolean)) onChange?.(nextValue)
      if (focusIndex !== undefined) inputRefs.current[Math.min(focusIndex, length - 1)]?.focus()
    }

    const distribute = (text: string, start: number) => {
      const characters = splitOTP(formatter?.(text) ?? text, length - start)
      if (!characters.length) return
      const next = [...values]
      characters.forEach((character, offset) => {
        next[start + offset] = character
      })
      commit(next, Math.min(start + characters.length, length - 1))
    }

    return (
      <div
        className={classNames(
          prefixCls,
          `${prefixCls}-otp`,
          `${prefixCls}-${visualSize}`,
          resolvedStatus && `${prefixCls}-control-status-${resolvedStatus}`,
          {
            [`${prefixCls}-disabled`]: disabled,
            [`${prefixCls}-error`]: resolvedStatus === 'error',
          },
          `${prefixCls}-slot-root`,
          slotClasses?.root,
          className,
          rootClassName,
        )}
        data-theme={config.mode}
        dir={config.direction}
        ref={rootRef}
        style={
          {
            ...getYakitTokenVariables(config.token),
            ...slotStyles?.root,
            ...style,
          } as YakitCSSProperties
        }
      >
        {values.map((slotValue, index) => (
          <Fragment key={index}>
            <input
              {...nativeProps}
              aria-label={nativeProps['aria-label'] ?? `验证码第 ${index + 1} 位`}
              aria-invalid={nativeProps['aria-invalid'] ?? (resolvedStatus === 'error' || undefined)}
              autoComplete={autoComplete}
              className={classNames(`${prefixCls}-otp-slot-input`, slotClasses?.input)}
              disabled={disabled}
              inputMode={inputMode}
              maxLength={1}
              onChange={(event) => {
                if (composingRef.current) return
                const nextValue = event.target.value
                if (Array.from(nextValue).length > 1) distribute(nextValue, index)
                else {
                  const next = [...values]
                  next[index] = nextValue
                  commit(next, nextValue && index < length - 1 ? index + 1 : undefined)
                }
              }}
              onCompositionEnd={(event) => {
                composingRef.current = false
                onCompositionEnd?.(event)
                distribute(event.currentTarget.value, index)
              }}
              onCompositionStart={(event) => {
                composingRef.current = true
                onCompositionStart?.(event)
              }}
              onKeyDown={(event) => {
                onKeyDown?.(event)
                if (event.defaultPrevented) return
                if (event.key === 'Backspace') {
                  event.preventDefault()
                  const next = [...values]
                  const hadCurrentValue = Boolean(next[index])
                  if (hadCurrentValue) next[index] = ''
                  else if (index > 0) next[index - 1] = ''
                  commit(next, hadCurrentValue ? index : Math.max(0, index - 1))
                } else if (event.key === 'ArrowLeft') inputRefs.current[Math.max(0, index - 1)]?.focus()
                else if (event.key === 'ArrowRight') inputRefs.current[Math.min(length - 1, index + 1)]?.focus()
                else if (event.key === 'Home') inputRefs.current[0]?.focus()
                else if (event.key === 'End') inputRefs.current[length - 1]?.focus()
              }}
              onPaste={(event) => {
                onPaste?.(event)
                if (event.defaultPrevented) return
                event.preventDefault()
                distribute(event.clipboardData.getData('text'), index)
              }}
              readOnly={readOnly}
              ref={(node) => {
                inputRefs.current[index] = node
              }}
              style={slotStyles?.input}
              type={mask ? 'password' : 'text'}
              value={slotValue}
            />
            {index < length - 1 && separator !== undefined ? (
              <span
                className={classNames(`${prefixCls}-otp-slot-separator`, slotClasses?.separator)}
                style={slotStyles?.separator}
              >
                {typeof separator === 'function' ? separator(index) : separator}
              </span>
            ) : null}
          </Fragment>
        ))}
      </div>
    )
  },
)

Input.displayName = 'Input'
TextArea.displayName = 'Input.TextArea'
Password.displayName = 'Input.Password'
OTP.displayName = 'Input.OTP'

import { CheckOutlined, LoadingOutlined, XOutlined } from '@yakit-libs/yakit-ui-icons/outline'
import classNames from 'classnames'
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react'

import useYakitConfig from '../../hooks/useYakitConfig'
import { getYakitTokenVariables } from '../../styles/tokenVariables'
import type { YakitCSSProperties } from '../../styles/tokenVariables'

import { resolveSwitchSize, supportsInnerExtra } from './sizeUtils'
import './style/index.css'
import type {
  SemanticValue,
  SwitchProps,
  SwitchRef,
  SwitchSemanticClassNames,
  SwitchSemanticInfo,
  SwitchSemanticStyles,
} from './type'

const yakitPrefix = 'yakit-switch'
/** antd 兼容前缀，供主项目 theme / 页面 :global(.ant-switch-*) 命中 */
const antPrefix = 'ant-switch'

const resolveSemantic = <T,>(value: SemanticValue<T> | undefined, info: SwitchSemanticInfo): T | undefined =>
  typeof value === 'function' ? (value as (semanticInfo: SwitchSemanticInfo) => T)(info) : value

export const Switch = forwardRef<SwitchRef, SwitchProps>(function Switch(allProps, ref) {
  const {
    checked: checkedProp,
    defaultChecked = false,
    disabled: disabledProp,
    loading = false,
    autoFocus,
    size: sizeProp,
    checkedChildren,
    unCheckedChildren,
    showInnerText,
    showInnerIcon,
    wrapperClassName,
    label,
    description,
    children,
    classNames: semanticClassNames,
    styles: semanticStyles,
    onChange,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    onKeyDown,
    className,
    rootClassName,
    style,
    title,
    tabIndex,
    id: idProp,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
  } = allProps

  const config = useYakitConfig()
  const switchToken = config.token.YakitSwitch
  const reactId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const labelId = `${yakitPrefix}-label-${reactId}`
  const descriptionId = `${yakitPrefix}-description-${reactId}`

  const resolvedSize = resolveSwitchSize(
    sizeProp ?? (config.componentSize === 'large' ? 'large' : config.componentSize === 'small' ? 'small' : 'middle'),
  )
  const disabled = disabledProp ?? config.componentDisabled ?? false
  const id = idProp ?? `${yakitPrefix}-${reactId}`

  const isControlled = checkedProp !== undefined
  const [innerChecked, setInnerChecked] = useState(defaultChecked)
  const checked = isControlled ? Boolean(checkedProp) : innerChecked

  const semanticInfo = { props: allProps as Readonly<SwitchProps> }
  const slotClasses = resolveSemantic<SwitchSemanticClassNames>(semanticClassNames, semanticInfo) ?? {}
  const slotStyles = resolveSemantic<SwitchSemanticStyles>(semanticStyles, semanticInfo) ?? {}

  useImperativeHandle(ref, () => ({
    nativeElement: buttonRef.current,
    focus: (options) => buttonRef.current?.focus(options),
    blur: () => buttonRef.current?.blur(),
  }))

  useEffect(() => {
    if (autoFocus) {
      buttonRef.current?.focus()
    }
  }, [autoFocus])

  const labelContent = label ?? children
  const hasDescription = description != null && description !== false && description !== ''
  const hasLabel = labelContent != null && labelContent !== false && labelContent !== ''
  const isField = hasLabel || hasDescription

  let resolvedCheckedChildren: ReactNode = checkedChildren
  let resolvedUnCheckedChildren: ReactNode = unCheckedChildren
  const canShowExtra = supportsInnerExtra(resolvedSize)
  // 对齐 antd：显式传 checkedChildren / unCheckedChildren（含 null）即视为「有显式内容」，不回退默认文案
  const hasExplicitChildren = 'checkedChildren' in allProps || 'unCheckedChildren' in allProps

  if (!hasExplicitChildren && canShowExtra) {
    if (showInnerIcon) {
      const iconSize = resolvedSize === 'large' ? 12 : 10
      const iconClass = resolvedSize === 'large' ? `${yakitPrefix}-large-icon` : `${yakitPrefix}-middle-icon`
      resolvedCheckedChildren = <CheckOutlined className={iconClass} size={iconSize} color="currentColor" />
      resolvedUnCheckedChildren = <XOutlined className={iconClass} size={iconSize} color="currentColor" />
    } else if (showInnerText) {
      resolvedCheckedChildren = '开'
      resolvedUnCheckedChildren = '关'
    }
  }

  const hasInnerChildren = !!(resolvedCheckedChildren || resolvedUnCheckedChildren)
  const interactiveDisabled = disabled || loading

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (interactiveDisabled) return
    const next = !checked
    if (!isControlled) {
      setInnerChecked(next)
    }
    onChange?.(next, event)
    onClick?.(next, event)
  }

  const tokenStyle = {
    ...getYakitTokenVariables(config.token),
    '--yakit-switch-height-sm': switchToken?.heightSM,
    '--yakit-switch-height-md': switchToken?.heightMD,
    '--yakit-switch-height-lg': switchToken?.heightLG,
    '--yakit-switch-height-xl': switchToken?.heightXL,
    '--yakit-switch-min-width-sm': switchToken?.minWidthSM,
    '--yakit-switch-min-width-md': switchToken?.minWidthMD,
    '--yakit-switch-min-width-lg': switchToken?.minWidthLG,
    '--yakit-switch-min-width-xl': switchToken?.minWidthXL,
    '--yakit-switch-handle-size-sm': switchToken?.handleSizeSM,
    '--yakit-switch-handle-size-md': switchToken?.handleSizeMD,
    '--yakit-switch-handle-size-lg': switchToken?.handleSizeLG,
    '--yakit-switch-handle-size-xl': switchToken?.handleSizeXL,
    '--yakit-switch-border-radius': switchToken?.borderRadius,
    '--yakit-switch-gap': switchToken?.gap,
    '--yakit-switch-font-size-md': switchToken?.fontSizeMD,
    '--yakit-switch-font-size-lg': switchToken?.fontSizeLG,
    '--yakit-switch-line-height-md': switchToken?.lineHeightMD,
    '--yakit-switch-line-height-lg': switchToken?.lineHeightLG,
    '--yakit-switch-description-font-size': switchToken?.descriptionFontSize,
    '--yakit-switch-description-line-height': switchToken?.descriptionLineHeight,
    ...style,
  } as YakitCSSProperties

  const rootStyle: CSSProperties = {
    ...(isField ? undefined : tokenStyle),
    ...slotStyles.root,
  }

  const switchCls = classNames(
    antPrefix,
    {
      [`${antPrefix}-checked`]: checked,
      [`${antPrefix}-disabled`]: disabled,
      [`${antPrefix}-loading`]: loading,
      [`${antPrefix}-small`]: resolvedSize === 'small' || resolvedSize === 'middle', // antd small ~= Figma md 28x16, override default 44x22
    },
    yakitPrefix,
    `${yakitPrefix}-${resolvedSize}`,
    {
      [`${yakitPrefix}-checked`]: checked,
      [`${yakitPrefix}-disabled`]: disabled,
      [`${yakitPrefix}-loading`]: loading,
      [`${yakitPrefix}-has-children`]: hasInnerChildren,
    },
    className,
    rootClassName,
    slotClasses.root,
  )

  const contentClassName = classNames(`${antPrefix}-inner-checked`, `${yakitPrefix}-inner-checked`, slotClasses.content)
  const uncheckedContentClassName = classNames(
    `${antPrefix}-inner-unchecked`,
    `${yakitPrefix}-inner-unchecked`,
    slotClasses.content,
  )

  const switchNode = (
    <button
      ref={buttonRef}
      id={id}
      type="button"
      role="switch"
      title={title}
      tabIndex={tabIndex}
      disabled={interactiveDisabled}
      aria-checked={checked}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby ?? (!ariaLabel && hasLabel ? labelId : undefined)}
      aria-describedby={
        [ariaDescribedby, hasDescription ? descriptionId : undefined].filter(Boolean).join(' ') || undefined
      }
      data-theme={config.mode}
      dir={config.direction}
      className={switchCls}
      style={rootStyle}
      onClick={handleClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseEnter={isField ? undefined : onMouseEnter}
      onMouseLeave={isField ? undefined : onMouseLeave}
    >
      <div
        className={classNames(`${antPrefix}-handle`, `${yakitPrefix}-handle`, slotClasses.indicator)}
        style={slotStyles.indicator}
      >
        {loading && (
          <span className={classNames(`${antPrefix}-loading-icon`, `${yakitPrefix}-loading-icon`)}>
            <LoadingOutlined
              spin
              size={resolvedSize === 'small' ? 8 : resolvedSize === 'large' || resolvedSize === 'max-large' ? 12 : 10}
            />
          </span>
        )}
      </div>
      <span className={classNames(`${antPrefix}-inner`, `${yakitPrefix}-inner`)}>
        <span className={contentClassName} style={slotStyles.content}>
          {resolvedCheckedChildren}
        </span>
        <span className={uncheckedContentClassName} style={slotStyles.content}>
          {resolvedUnCheckedChildren}
        </span>
      </span>
    </button>
  )

  if (!isField) {
    return <span className={classNames(`${yakitPrefix}-wrapper`, wrapperClassName)}>{switchNode}</span>
  }

  return (
    <div
      className={classNames(
        `${yakitPrefix}-field`,
        `${yakitPrefix}-field-${resolvedSize}`,
        {
          [`${yakitPrefix}-field-disabled`]: disabled,
          [`${yakitPrefix}-field-checked`]: checked,
        },
        wrapperClassName,
      )}
      title={title}
      data-theme={config.mode}
      dir={config.direction}
      style={tokenStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {switchNode}
      <span className={`${yakitPrefix}-content`}>
        {hasLabel && (
          <span
            id={labelId}
            className={`${yakitPrefix}-label`}
            onClick={(e) => {
              if (interactiveDisabled) return
              e.preventDefault()
              buttonRef.current?.click()
            }}
          >
            {labelContent}
          </span>
        )}
        {hasDescription && (
          <span id={descriptionId} className={`${yakitPrefix}-description`}>
            {description}
          </span>
        )}
      </span>
    </div>
  )
})

Switch.displayName = 'Switch'

/** 主项目同名导出，便于迁移 */
export const YakitSwitch = Switch

export default Switch

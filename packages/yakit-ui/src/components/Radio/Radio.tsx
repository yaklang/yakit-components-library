import classNames from 'classnames'
import {
  forwardRef,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'

import useYakitConfig from '../../hooks/useYakitConfig'
import { getYakitTokenVariables } from '../../styles/tokenVariables'
import type { YakitCSSProperties } from '../../styles/tokenVariables'

import { RadioGroupContext, RadioOptionTypeContext } from './GroupContext'
import { resolveCircularSize } from './sizeUtils'
import './style/index.css'
import type { RadioChangeEvent, RadioProps, RadioRef } from './type'

const yakitPrefix = 'yakit-radio'
/** antd 兼容前缀，供主项目 theme / 页面 :global(.ant-radio-*) 命中 */
const antPrefix = 'ant-radio'

const createChangeEvent = (
  nativeEvent: ChangeEvent<HTMLInputElement>,
  checked: boolean,
  value: RadioProps['value'],
  extras?: Pick<RadioChangeEvent['target'], 'name' | 'id' | 'disabled'>,
): RadioChangeEvent => ({
  target: {
    type: 'radio',
    checked,
    value,
    ...extras,
  },
  stopPropagation: () => nativeEvent.stopPropagation(),
  preventDefault: () => nativeEvent.preventDefault(),
  nativeEvent: nativeEvent.nativeEvent as globalThis.MouseEvent,
})

export const Radio = forwardRef<RadioRef, RadioProps>(function Radio(
  {
    checked: checkedProp,
    defaultChecked = false,
    value,
    disabled: disabledProp,
    autoFocus,
    name: nameProp,
    id: idProp,
    size: sizeProp,
    label,
    description,
    children,
    onChange,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    onKeyDown,
    onKeyPress,
    className,
    rootClassName,
    style,
    title,
    tabIndex,
    required,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-describedby': ariaDescribedby,
  },
  ref,
) {
  const config = useYakitConfig()
  const radioToken = config.token.YakitRadio
  const group = useContext(RadioGroupContext)
  const optionTypeFromButton = useContext(RadioOptionTypeContext)
  const reactId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLLabelElement>(null)

  const isButtonType = group?.optionType === 'button' || optionTypeFromButton === 'button'

  const resolvedSize = resolveCircularSize(
    sizeProp ?? group?.size ?? (config.componentSize === 'large' ? 'large' : 'medium'),
  )

  const disabled = disabledProp ?? group?.disabled ?? config.componentDisabled ?? false
  const name = nameProp ?? group?.name
  const id = idProp ?? `${yakitPrefix}-${reactId}`

  const isGrouped = group != null
  const isControlled = isGrouped || checkedProp !== undefined
  const [innerChecked, setInnerChecked] = useState(defaultChecked)

  const checked = isGrouped ? group!.value === value : isControlled ? Boolean(checkedProp) : innerChecked

  useImperativeHandle(ref, () => ({
    input: inputRef.current,
    nativeElement: rootRef.current,
    focus: (options) => inputRef.current?.focus(options),
    blur: () => inputRef.current?.blur(),
  }))

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
    }
  }, [autoFocus])

  const labelContent = label ?? children
  const hasDescription = !isButtonType && description != null && description !== false && description !== ''
  const hasLabel = labelContent != null && labelContent !== false && labelContent !== ''

  // 无障碍：文案/描述各自生成 ID，input 通过 aria-labelledby/describedby 关联；
  // 消费方显式传入的 aria 属性优先（对齐 Checkbox）。
  const labelTextId = hasLabel ? `${id}-label` : undefined
  const descriptionTextId = hasDescription ? `${id}-description` : undefined
  const resolvedAriaDescribedby =
    ariaDescribedby ?? (hasDescription && (hasLabel || ariaLabel || ariaLabelledby) ? descriptionTextId : undefined)
  const resolvedAriaLabelledby =
    ariaLabelledby ??
    (!ariaLabel && hasLabel ? labelTextId : !ariaLabel && !hasLabel && hasDescription ? descriptionTextId : undefined)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const nextChecked = e.target.checked
    if (!isControlled) {
      setInnerChecked(nextChecked)
    }
    const event = createChangeEvent(e, nextChecked, value, { name, id, disabled })
    onChange?.(event)
    group?.onChange?.(event)
  }

  /**
   * onClick 挂在 input 上（对齐 antd / rc-checkbox），不要挂 label：
   * 点 label 文案时浏览器会再向嵌套 input 合成一次 click，挂 label 会双触发。
   */
  const handleInputClick = (e: MouseEvent<HTMLInputElement>) => {
    if (disabled) return
    onClick?.(e as unknown as MouseEvent<HTMLElement>)
  }

  const sharedInputProps = {
    id,
    type: 'radio' as const,
    name,
    // boolean 序列化为 "true"/"false"，避免原生 form 提交变成 "on"；onChange 仍传原始 boolean
    value: value === undefined ? undefined : String(value),
    checked,
    disabled,
    autoFocus,
    tabIndex,
    required,
    'aria-checked': checked,
    'aria-label': ariaLabel,
    'aria-labelledby': resolvedAriaLabelledby,
    'aria-describedby': resolvedAriaDescribedby,
    onChange: handleChange,
    onFocus: (e: FocusEvent<HTMLInputElement>) => onFocus?.(e),
    onBlur: (e: FocusEvent<HTMLInputElement>) => onBlur?.(e),
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => onKeyDown?.(e),
    onKeyPress: (e: KeyboardEvent<HTMLInputElement>) => onKeyPress?.(e),
    onClick: handleInputClick,
  }

  const tokenStyle = {
    ...getYakitTokenVariables(config.token),
    '--yakit-radio-size-md': radioToken?.sizeMD,
    '--yakit-radio-size-lg': radioToken?.sizeLG,
    '--yakit-radio-gap': radioToken?.gap,
    '--yakit-radio-font-size-md': radioToken?.fontSizeMD,
    '--yakit-radio-font-size-lg': radioToken?.fontSizeLG,
    '--yakit-radio-line-height-md': radioToken?.lineHeightMD,
    '--yakit-radio-line-height-lg': radioToken?.lineHeightLG,
    '--yakit-radio-description-font-size': radioToken?.descriptionFontSize,
    '--yakit-radio-description-line-height': radioToken?.descriptionLineHeight,
    '--yakit-radio-button-border-radius': radioToken?.buttonBorderRadius,
    ...style,
  } as YakitCSSProperties

  // ---------- Button 形态（antd Radio.Button / optionType=button） ----------
  if (isButtonType) {
    const antBtn = `${antPrefix}-button`
    const wrapperCls = classNames(
      `${antBtn}-wrapper`,
      {
        [`${antBtn}-wrapper-checked`]: checked,
        [`${antBtn}-wrapper-disabled`]: disabled,
        [`${antBtn}-wrapper-block`]: Boolean(group?.block),
      },
      'yakit-radio-group-button-item',
      {
        'yakit-radio-group-button-item-checked': checked,
        'yakit-radio-group-button-item-disabled': disabled,
      },
      className,
      rootClassName,
    )

    return (
      <label
        ref={rootRef}
        className={wrapperCls}
        title={title}
        data-theme={config.mode}
        dir={config.direction}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={tokenStyle}
      >
        <span
          className={classNames(antBtn, {
            [`${antBtn}-checked`]: checked,
            [`${antBtn}-disabled`]: disabled,
          })}
        >
          <input
            ref={inputRef}
            {...sharedInputProps}
            className={classNames(`${antBtn}-input`, 'yakit-radio-group-button-input')}
          />
          <span className={`${antBtn}-inner`} aria-hidden="true" />
        </span>
        {hasLabel && (
          <span className="yakit-radio-group-button-label" id={labelTextId}>
            {labelContent}
          </span>
        )}
      </label>
    )
  }

  // ---------- 圆形（Figma + antd Radio DOM） ----------
  const wrapperCls = classNames(
    `${antPrefix}-wrapper`,
    {
      [`${antPrefix}-wrapper-checked`]: checked,
      [`${antPrefix}-wrapper-disabled`]: disabled,
    },
    yakitPrefix,
    `${yakitPrefix}-${resolvedSize}`,
    {
      [`${yakitPrefix}-checked`]: checked,
      [`${yakitPrefix}-disabled`]: disabled,
      [`${yakitPrefix}-with-description`]: hasDescription,
      [`${antPrefix}-wrapper-block`]: Boolean(group?.block),
    },
    className,
    rootClassName,
  )

  return (
    <label
      ref={rootRef}
      className={wrapperCls}
      title={title}
      data-theme={config.mode}
      dir={config.direction}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={tokenStyle}
    >
      <span
        className={classNames(
          antPrefix,
          {
            [`${antPrefix}-checked`]: checked,
            [`${antPrefix}-disabled`]: disabled,
          },
          `${yakitPrefix}-control`,
        )}
      >
        <input
          ref={inputRef}
          {...sharedInputProps}
          className={classNames(`${antPrefix}-input`, `${yakitPrefix}-input`)}
        />
        <span className={classNames(`${antPrefix}-inner`, `${yakitPrefix}-inner`)} aria-hidden="true" />
      </span>
      {(hasLabel || hasDescription) && (
        <span className={classNames(`${antPrefix}-label`, `${yakitPrefix}-content`)}>
          {hasLabel && (
            <span className={`${yakitPrefix}-label`} id={labelTextId}>
              {labelContent}
            </span>
          )}
          {hasDescription && (
            <span className={`${yakitPrefix}-description`} id={descriptionTextId}>
              {description}
            </span>
          )}
        </span>
      )}
    </label>
  )
})

Radio.displayName = 'Radio'

export default Radio

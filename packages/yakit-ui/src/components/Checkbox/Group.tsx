import classNames from 'classnames'
import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import { Checkbox } from './Checkbox'
import { CheckboxGroupContext } from './GroupContext'
import type { CheckboxGroupProps, CheckboxOptionType, CheckboxProps, CheckboxValueType } from './type'

const prefixCls = 'yakit-checkbox-group'

/** key 需区分类型：1 / '1'、true / 'true' 都是合法 options，String() 会碰撞 */
const optionKey = (value: CheckboxValueType) => `${typeof value}:${String(value)}`

const normalizeOptions = (options: CheckboxGroupProps['options']): CheckboxOptionType[] => {
  if (!options?.length) return []
  return options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number' || typeof opt === 'boolean') {
      return { label: String(opt), value: opt }
    }
    return opt
  })
}

/**
 * 带 value 的 Checkbox 需为直接子节点或 Fragment 子节点；再深的自定义包装请用 options。
 * 注意：注入的布尔 checked 同时是 Checkbox 侧判定「参与组控」的信号（见 Checkbox.tsx inGroup），
 * 不能因值未变化等理由条件省略注入。
 */
function mapGroupChildren(nodes: ReactNode, valueSet: Set<CheckboxValueType>): ReactNode {
  return Children.map(nodes, (child) => {
    if (!isValidElement(child)) return child

    if (child.type === Fragment) {
      const fragmentChildren = (child.props as { children?: ReactNode }).children
      return mapGroupChildren(fragmentChildren, valueSet)
    }

    /** 只对 Checkbox 注入组选中态；其他带 value 的元素（如 Select）不碰 */
    if (child.type === Checkbox) {
      const value = (child.props as CheckboxProps).value
      if (value !== undefined) {
        return cloneElement(child as ReactElement<CheckboxProps>, {
          checked: valueSet.has(value),
        })
      }
    }

    return child
  })
}

export function CheckboxGroup({
  value: valueProp,
  defaultValue,
  onChange,
  disabled,
  name,
  options,
  children,
  className,
  rootClassName,
  style,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: CheckboxGroupProps) {
  const isControlled = valueProp !== undefined
  const [innerValue, setInnerValue] = useState<CheckboxValueType[]>(() => defaultValue ?? [])
  const value = useMemo(() => (isControlled ? (valueProp ?? []) : innerValue), [isControlled, valueProp, innerValue])

  /** 用 Set 做 O(1) 成员判断（选中态与 toggle） */
  const valueSet = useMemo(() => new Set<CheckboxValueType>(value), [value])

  /** 同步最新选中，避免连点/批量 toggle 读到旧闭包 */
  const valueRef = useRef(value)
  valueRef.current = value

  const toggleOption = useCallback(
    (optionValue: CheckboxValueType) => {
      const current = valueRef.current
      const set = new Set(current)
      if (set.has(optionValue)) {
        set.delete(optionValue)
      } else {
        set.add(optionValue)
      }
      const next = Array.from(set)
      // 仅非受控写回 valueRef + state；受控依赖渲染期 valueRef.current = value 同步，
      // 避免父组件忽略 onChange 时 valueRef 漂移导致连点变成取消选中
      if (!isControlled) {
        valueRef.current = next
        setInnerValue(next)
      }
      onChange?.(next)
    },
    [isControlled, onChange],
  )

  /** 瘦 context：不含 value，选中态通过逐项 checked 传入 */
  const contextValue = useMemo(
    () => ({
      name,
      disabled,
      toggleOption,
    }),
    [name, disabled, toggleOption],
  )

  const parsedOptions = useMemo(() => normalizeOptions(options), [options])

  const optionNodes = useMemo(
    () =>
      parsedOptions.map((opt) => (
        <Checkbox
          key={optionKey(opt.value)}
          checked={valueSet.has(opt.value)}
          className={opt.className}
          disabled={opt.disabled}
          onChange={opt.onChange}
          style={opt.style}
          title={opt.title}
          value={opt.value}
        >
          {opt.label}
        </Checkbox>
      )),
    [parsedOptions, valueSet],
  )

  const childNodes = useMemo(() => mapGroupChildren(children, valueSet), [children, valueSet])

  return (
    <CheckboxGroupContext.Provider value={contextValue}>
      <div
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        className={classNames(prefixCls, className, rootClassName)}
        role="group"
        style={style}
      >
        {optionNodes}
        {childNodes}
      </div>
    </CheckboxGroupContext.Provider>
  )
}

CheckboxGroup.displayName = 'Checkbox.Group'

export type { CheckboxGroupProps }

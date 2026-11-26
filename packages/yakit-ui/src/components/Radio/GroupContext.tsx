import { createContext } from 'react'

import type { RadioChangeEvent, RadioGroupOptionType, RadioValue } from './type'

export interface RadioGroupContextValue {
  value?: RadioValue
  disabled?: boolean
  name?: string
  /** 传给子 Radio 的圆形尺寸（已归一为 medium | large） */
  size?: 'medium' | 'large'
  /** 对齐 antd：Group optionType，驱动子 Radio / Radio.Button 形态 */
  optionType?: RadioGroupOptionType
  block?: boolean
  onChange?: (e: RadioChangeEvent) => void
}

export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

/** 对齐 antd RadioOptionTypeContext：Radio.Button 注入 "button" */
export const RadioOptionTypeContext = createContext<RadioGroupOptionType | null>(null)

import type { CSSProperties } from 'react'

export interface BaseProps {
  /** 给组件根元素自定义类名 */
  rootClassName?: string
  /** 给组件根元素自定义样式 */
  className?: string
  /** 给组件根元素自定义样式 */
  style?: CSSProperties
}

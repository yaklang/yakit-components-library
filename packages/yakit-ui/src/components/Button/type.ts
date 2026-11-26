import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, MouseEvent, ReactNode } from 'react'

import type { BaseProps } from '../../types/common'

export type ButtonType =
  | 'primary'
  | 'secondary1'
  | 'secondary2'
  | 'outline1'
  | 'outline2'
  | 'text'
  | 'text2'
  | 'link1'
  | 'link2'

/** 与 YakitButton `colors` 一致。`danger` 使用错误色。 */
export type ButtonColors = 'primary' | 'success' | 'danger' | 'infoBlue'

export type ButtonSize = 'small' | 'medium' | 'large' | 'huge'

export type ButtonShape = 'default' | 'round'

export type ButtonHTMLType = 'button' | 'submit' | 'reset'

export interface ButtonLoading {
  /**
   * 延迟显示加载状态，单位毫秒。与 antd 一致：delay 只延迟加载图标的
   * 显示，期间按钮**不会被禁用**，点击仍会触发 `onClick`。需要防重复
   * 提交时请勿依赖带 delay 的 `loading`，应在 `onClick` 中自行加锁。
   */
  delay?: number
  /** 自定义加载图标，默认使用旋转的 Loading。 */
  icon?: ReactNode
}

export interface ButtonSemanticClassNames {
  icon?: string
}

export interface ButtonSemanticStyles {
  icon?: CSSProperties
}

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'type' | 'color' | 'onClick' | 'className' | 'style'
>

export interface ButtonProps extends BaseProps, NativeButtonProps {
  /**
   * 按钮类型。
   * @default primary
   */
  type?: ButtonType
  /**
   * 语义色，与 YakitButton `colors` 一致。
   * `colors` 和 `danger` 同时存在时，以 `colors` 为准。
   */
  colors?: ButtonColors
  /**
   * 按钮尺寸。
   * @default medium
   */
  size?: ButtonSize
  /**
   * 按钮形状。`round` 对应设计稿全圆角。
   * @default default
   */
  shape?: ButtonShape
  /**
   * 使用错误色。对应设计稿 Error=Yes，也对应 YakitButton / antd 的 `danger`。
   * 仅在未传 `colors` 时生效。
   * @default false
   */
  danger?: boolean
  /**
   * 保持悬停样式，与 YakitButton `isHover` 一致。
   * @default false
   */
  isHover?: boolean
  /**
   * 保持按下样式，与 YakitButton `isActive` 一致。激活态优先于悬停态。
   * @default false
   */
  isActive?: boolean
  /**
   * 圆角。`true` 为 8px，数字按像素，字符串按 CSS 值。与 YakitButton `radius` 一致。
   */
  radius?: boolean | number | string
  /** 按钮内容。 */
  children?: ReactNode
  /** 纯图标按钮的无障碍名称。 */
  'aria-label'?: string
  /** 禁用。未传入时继承 ConfigProvider。 */
  disabled?: boolean
  /**
   * 点击波纹。文本和链接按钮默认关闭。
   * @default wave
   */
  animation?: 'wave' | false
  /**
   * 原生 button 的 type。
   * @default button
   */
  htmlType?: ButtonHTMLType
  /**
   * 图标位置。
   * @default start
   */
  iconPosition?: 'start' | 'end'
  /** 图标。 */
  icon?: ReactNode
  /**
   * 加载状态。传入 `{ delay }` 时延迟进入加载，与 antd 一致。
   */
  loading?: boolean | ButtonLoading
  /** 宽度撑满容器。 */
  block?: boolean
  /**
   * 传入后渲染为 `<a>`。
   */
  href?: string
  target?: string
  rel?: string
  classNames?: ButtonSemanticClassNames
  styles?: ButtonSemanticStyles
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void
}

export interface ButtonGroupProps extends BaseProps, Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> {
  /**
   * 统一子按钮尺寸。子按钮自己的 `size` 优先。
   */
  size?: ButtonSize
  /**
   * `round` 对应设计稿全圆角按钮组。
   * @default default
   */
  shape?: 'default' | 'round'
  children?: ReactNode
}

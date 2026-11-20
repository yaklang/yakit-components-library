import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react'

import type { BaseProps } from '../../types/common'

/**
 * Figma：sm-12 / md-16 / lg-20；主项目另有 maxLarge。
 * - small → sm-12
 * - middle / medium / default → md-16
 * - large → lg-20
 * - maxLarge → 44×22（主项目扩展）
 */
export type SwitchSize = 'small' | 'middle' | 'medium' | 'large' | 'maxLarge' | 'default'

type NativeFocusOptions = Parameters<HTMLElement['focus']>[0]

/** 命令式 focus/blur，对齐 antd SwitchRef */
export interface SwitchRef {
  nativeElement: HTMLButtonElement | null
  focus: (options?: NativeFocusOptions) => void
  blur: () => void
}

/** 对齐 antd 6 Switch 语义化槽：root / content / indicator（把手） */
export interface SwitchSemanticClassNames {
  root?: string
  content?: string
  indicator?: string
}

export interface SwitchSemanticStyles {
  root?: CSSProperties
  content?: CSSProperties
  indicator?: CSSProperties
}

export interface SwitchSemanticInfo {
  props: Readonly<SwitchProps>
}

export type SemanticValue<T> = T | ((info: SwitchSemanticInfo) => T)

export interface SwitchProps extends BaseProps {
  /** 指定当前是否选中（受控） */
  checked?: boolean
  /** 初始是否选中（非受控） */
  defaultChecked?: boolean
  /** 禁用 */
  disabled?: boolean
  /** 加载中（不可切换） */
  loading?: boolean
  /** 自动获取焦点 */
  autoFocus?: boolean
  /**
   * 尺寸：small→sm-12，middle/medium→md-16，large→lg-20，maxLarge→主项目扩展
   * @default middle
   */
  size?: SwitchSize
  /** 选中时的内容（轨道内） */
  checkedChildren?: ReactNode
  /** 非选中时的内容（轨道内） */
  unCheckedChildren?: ReactNode
  /**
   * 是否显示里面「开/关」文字；仅 large / middle（及 medium）生效
   * 优先级低于显式传入的 checkedChildren / unCheckedChildren
   */
  showInnerText?: boolean
  /**
   * 是否显示里面图标（勾 / 叉）；仅 large / middle（及 medium）生效
   * 优先级低于 checkedChildren / unCheckedChildren；高于 showInnerText
   */
  showInnerIcon?: boolean
  /** 外层装饰 className（对齐主项目 wrapperClassName） */
  wrapperClassName?: string
  /** 主文案（Figma Text，开关外侧） */
  label?: ReactNode
  /** 副文案 / description（Figma Sub Text） */
  description?: ReactNode
  /** 子节点，通常作为 label */
  children?: ReactNode
  /**
   * 语义化 className（对齐 antd 6：root / content / indicator）
   * 支持对象或 `(info) => object`
   */
  classNames?: SemanticValue<SwitchSemanticClassNames>
  /**
   * 语义化 style（对齐 antd 6：root / content / indicator）
   * 支持对象或 `(info) => object`
   */
  styles?: SemanticValue<SwitchSemanticStyles>
  /** 变化时回调，对齐 antd：(checked, event) */
  onChange?: (checked: boolean, event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) => void
  /** 点击回调，对齐 antd：(checked, event) */
  onClick?: (checked: boolean, event: MouseEvent<HTMLButtonElement>) => void
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void
  onMouseLeave?: (e: MouseEvent<HTMLElement>) => void
  onFocus?: (e: FocusEvent<HTMLButtonElement>) => void
  onBlur?: (e: FocusEvent<HTMLButtonElement>) => void
  onKeyDown?: (e: KeyboardEvent<HTMLButtonElement>) => void
  /** 原生 title */
  title?: string
  /** tabIndex */
  tabIndex?: number
  /** 原生 id */
  id?: string
  /** 无障碍名称 */
  'aria-label'?: string
  'aria-labelledby'?: string
  /** 无障碍描述 */
  'aria-describedby'?: string
}

/** 主项目同名 Props 别名 */
export type YakitSwitchProps = SwitchProps

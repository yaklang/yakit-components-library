import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react';

import type { BaseProps } from '../../types/common';

/** Figma 圆形：medium→md-16，large→lg-20；middle 为兼容别名（等同 medium） */
export type RadioSize = 'medium' | 'large' | 'middle';

/**
 * 按钮组尺寸，对齐主项目 YakitSizeType（YakitRadioButtons）
 * - small / middle / large / maxLarge：主项目同名同义
 * - medium：库内别名，视觉等同 middle
 */
export type RadioButtonsSize = 'small' | 'middle' | 'medium' | 'large' | 'maxLarge';

export type RadioValue = string | number | boolean;

type NativeFocusOptions = Parameters<HTMLElement['focus']>[0];

export type RadioGroupButtonStyle = 'outline' | 'solid';

export type RadioGroupOptionType = 'default' | 'button';

export type RadioGroupOrientation = 'horizontal' | 'vertical';

// Match Ant Design's target.value type so consumers can pass it to literal-union setters.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RadioChangeEventTarget<Value = any> {
  /** 是否选中 */
  checked: boolean;
  /** 当前项 value（主项目 / antd 常用 e.target.value） */
  value: Value | undefined;
  /** 对齐 antd：input 类型，事件中恒为 'radio' */
  type?: 'radio';
  /** 扩展字段：更接近 antd RadioChangeEventTarget */
  name?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * 变化事件，形态对齐 antd RadioChangeEvent（主项目 onChange 可直接用 e.target.value）
 */
export interface RadioChangeEvent {
  target: RadioChangeEventTarget;
  stopPropagation: () => void;
  preventDefault: () => void;
  /** 对齐 antd RadioChangeEvent */
  nativeEvent: globalThis.MouseEvent;
}

/** 命令式 focus/blur，对齐 antd RadioRef / InputRef 习惯 */
export interface RadioRef {
  input: HTMLInputElement | null;
  nativeElement: HTMLElement | null;
  focus: (options?: NativeFocusOptions) => void;
  blur: () => void;
}

export interface RadioProps extends BaseProps {
  /** 指定当前是否选中（受控） */
  checked?: boolean;
  /** 初始是否选中（非受控） */
  defaultChecked?: boolean;
  /** 根据 value 进行比较，判断是否选中 */
  value?: RadioValue;
  /** 禁用 */
  disabled?: boolean;
  /** 自动获取焦点 */
  autoFocus?: boolean;
  /** input 的 name */
  name?: string;
  /** input 的 id；不传时自动生成 */
  id?: string;
  /**
   * 尺寸：medium → md-16，large → lg-20；middle 兼容别名 → medium
   * @default medium
   */
  size?: RadioSize;
  /** 主文案；也可用 children */
  label?: ReactNode;
  /** 副文案 / description */
  description?: ReactNode;
  /** 子节点，通常作为 label */
  children?: ReactNode;
  /** 变化时回调 */
  onChange?: (e: RadioChangeEvent) => void;
  /** 点击回调（主项目圆形 Radio 常用；与 antd AbstractCheckboxProps 对齐） */
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  onMouseEnter?: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLElement>) => void;
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** 原生 title */
  title?: string;
  /** tabIndex */
  tabIndex?: number;
  /** 原生 required */
  required?: boolean;
  /** 无障碍名称；无文案时建议传入 */
  'aria-label'?: string;
  /** 无障碍名称引用；显式传入时优先于内部文案生成的 ID */
  'aria-labelledby'?: string;
  /** 无障碍描述引用；显式传入时优先于内部 description 生成的 ID */
  'aria-describedby'?: string;
}

export interface RadioOptionType {
  label: ReactNode;
  value: RadioValue;
  disabled?: boolean;
  description?: ReactNode;
  /** 悬停提示（antd option.title 兼容） */
  title?: string;
  /** 原生 id（antd option.id 兼容） */
  id?: string;
  /** 原生 required（antd option.required 兼容） */
  required?: boolean;
  style?: CSSProperties;
  className?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  /** 选项级 onChange，触发顺序在 Group onChange 之前（对齐 antd） */
  onChange?: (e: RadioChangeEvent) => void;
}

export type RadioGroupOption = string | number | RadioOptionType;

export interface RadioGroupProps extends BaseProps {
  /** 指定选中的选项（受控） */
  value?: RadioValue;
  /** 默认选中的选项（非受控） */
  defaultValue?: RadioValue;
  /** 禁用整组 */
  disabled?: boolean;
  /** RadioGroup 下所有 input 的 name */
  name?: string;
  /** 以配置形式设置子元素 */
  options?: RadioGroupOption[];
  /**
   * 选项类型
   * @default default
   */
  optionType?: RadioGroupOptionType;
  /**
   * 按钮风格（optionType="button" 时生效），对齐 antd / 主项目 YakitRadioButtons
   * @default outline
   */
  buttonStyle?: RadioGroupButtonStyle;
  /**
   * 尺寸
   * - 圆形组：medium / large（middle→medium）
   * - 按钮组：兼容 small | middle | large | maxLarge（及 medium→middle）
   * @default medium（圆形）/ middle（按钮，经由 YakitRadioButtons 默认）
   */
  size?: RadioSize | RadioButtonsSize;
  /**
   * 布局方向；默认横排（对齐 antd / yakit 常见用法）
   * @default horizontal
   */
  orientation?: RadioGroupOrientation;
  /** 等价 orientation="vertical" */
  vertical?: boolean;
  /** 按钮组是否撑满容器宽度（对齐 antd block） */
  block?: boolean;
  /**
   * 外层包裹 className（对齐主项目 YakitRadioButtons.wrapClassName）
   * 挂在外层包装 div 上；Group 根（ant-radio-group）仍只挂 className / 兼容 class
   */
  wrapClassName?: string;
  /** RadioGroup 下的子元素 */
  children?: ReactNode;
  /** 变化时回调 */
  onChange?: (e: RadioChangeEvent) => void;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
  onFocus?: (e: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (e: FocusEvent<HTMLDivElement>) => void;
  /** 原生 id */
  id?: string;
  /** 无障碍名称；未传时若有显式 name 则用 name 兜底，不硬编文案 */
  'aria-label'?: string;
  /** 无障碍名称引用 */
  'aria-labelledby'?: string;
}

/**
 * 主项目 YakitRadioButtons 同名同义 Props（Omit optionType，强制 button）
 */
export interface YakitRadioButtonsProps
  extends Omit<RadioGroupProps, 'optionType' | 'size' | 'orientation' | 'vertical'> {
  /**
   * 默认 middle；对齐主项目 YakitSizeType
   */
  size?: RadioButtonsSize;
}

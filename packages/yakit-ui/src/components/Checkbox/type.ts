import type { ChangeEvent, CSSProperties, InputHTMLAttributes, MouseEvent, ReactNode } from 'react';

import type { BaseProps } from '../../types/common';

export type CheckboxSize = 'medium' | 'large';

/** 对齐 antd CheckboxValueType：Group 内选项标识 */
export type CheckboxValueType = string | number | boolean;

export interface CheckboxChangeEvent {
  target: {
    /** 对齐原生 / antd，供 Form.Item 的 getValueFromEvent 识别 */
    type: 'checkbox';
    checked: boolean;
    /** Group 选项标识；独立 Checkbox 透传 value */
    value?: CheckboxValueType;
  };
  stopPropagation: () => void;
  preventDefault: () => void;
  nativeEvent: Event;
}

export interface CheckboxOptionType {
  label: ReactNode;
  value: CheckboxValueType;
  disabled?: boolean;
  /**
   * 悬停提示（antd Option.title 兼容），挂在选项根节点
   */
  title?: string;
  style?: CSSProperties;
  className?: string;
  /**
   * 透传到选项 Checkbox 的 onChange
   */
  onChange?: (e: CheckboxChangeEvent) => void;
}

export interface CheckboxProps
  extends BaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'type' | 'value' | 'title'> {
  /**
   * 根元素 className（挂在外层 label 上）。
   * 从接入方 `YakitCheckbox` 迁移时：把原来的 `wrapperClassName` 换成 `className`
   *（或下面的 `rootClassName`，二者都会加到根节点）。
   */
  className?: string;
  /**
   * 根元素额外 className，与 `className` 一并挂在 label 上。
   * 迁移对照：接入方 `wrapperClassName` → 库 `className` / `rootClassName`。
   */
  rootClassName?: string;
  /**
   * 尺寸：medium=16（Figma md-16），large=20（Figma lg-20）
   * @default medium
   */
  size?: CheckboxSize;
  /**
   * 指定当前是否选中（受控）
   */
  checked?: boolean;
  /**
   * 初始是否选中（非受控）
   * @default false
   */
  defaultChecked?: boolean;
  /**
   * 半选（含全选半态）
   * @default false
   */
  indeterminate?: boolean;
  /**
   * 禁用
   */
  disabled?: boolean;
  /**
   * Group 内选项标识（antd 兼容）；不在 Group 内时作为原生 value 透传
   */
  value?: CheckboxValueType;
  /**
   * 主文案（Figma Text）
   */
  children?: ReactNode;
  /**
   * 副文案（Figma Sub Text）
   */
  description?: ReactNode;
  /**
   * 悬停提示（原生 title）；Group `options[].title` 也会传到这里
   */
  title?: string;
  /**
   * 无障碍名称；无文案时建议传入
   */
  'aria-label'?: string;
  /**
   * 无障碍描述引用；显式传入时优先于内部 description 生成的 ID
   */
  'aria-describedby'?: string;
  /**
   * 无障碍名称引用；显式传入时优先于内部文案/描述生成的 ID
   */
  'aria-labelledby'?: string;
  /**
   * 选中态变化
   */
  onChange?: (e: CheckboxChangeEvent) => void;
  /**
   * 点击（透传到原生 input）
   */
  onClick?: (e: MouseEvent<HTMLInputElement>) => void;
}

export interface CheckboxGroupProps extends BaseProps {
  /**
   * 根元素 className。接入方若曾给 Group 外层包 class，迁到库时用本字段（无 `wrapperClassName`）。
   */
  className?: string;
  /**
   * 根元素额外 className，与 `className` 一并生效。
   */
  rootClassName?: string;
  /**
   * 指定选中的选项（受控）
   */
  value?: CheckboxValueType[];
  /**
   * 默认选中的选项（非受控）
   */
  defaultValue?: CheckboxValueType[];
  /**
   * 变化时回调
   */
  onChange?: (checkedValue: CheckboxValueType[]) => void;
  /**
   * 整组禁用
   */
  disabled?: boolean;
  /**
   * 透传到子 Checkbox 的 name（表单）
   */
  name?: string;
  /**
   * 通过配置生成选项；与 children 可并存（options 先渲染）
   */
  options?: Array<CheckboxValueType | CheckboxOptionType>;
  children?: ReactNode;
  /**
   * 组合无障碍名称
   */
  'aria-label'?: string;
  /**
   * 组合无障碍名称引用
   */
  'aria-labelledby'?: string;
}

export type CheckboxRef = HTMLInputElement;

/** @internal 供实现文件复用，不作为公开 API 文档重点 */
export type CheckboxNativeChangeEvent = ChangeEvent<HTMLInputElement>;

/** @internal Group context 形状：不含 value，避免选中变化时 context 引用抖动 */
export interface CheckboxGroupContextValue {
  name?: string;
  disabled?: boolean;
  toggleOption: (optionValue: CheckboxValueType) => void;
}

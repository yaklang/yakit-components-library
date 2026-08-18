import type { InputHTMLAttributes, ReactNode } from 'react';

import type { BaseProps } from '../../types/common';

export interface InputProps
  extends BaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> {
  /** 输入框尺寸，对应设计稿 S / M / L。 */
  size?: 'small' | 'medium' | 'large';
  /** 前置附加元素，例如搜索或用户图标。 */
  prefix?: ReactNode;
  /** 后置附加元素，例如清除或下拉图标。 */
  suffix?: ReactNode;
  /** 使用错误色边框和焦点外圈。 */
  error?: boolean;
}

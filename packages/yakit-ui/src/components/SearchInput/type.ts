import type { InputHTMLAttributes, ReactNode } from 'react';

import type { BaseProps } from '../../types/common';

export type SearchInputSize = 'small' | 'medium' | 'large' | 'huge';
export type SearchInputVariant =
  | 'box'
  | 'main-bg'
  | 'dropdown'
  | 'icon-only'
  | 'default'
  | 'primary';
export type SearchIconPosition = 'front' | 'back' | 'both' | 'only';

export interface SearchInputProps
  extends BaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** 对应设计稿 S-20 / M-24 / L-28 / Huge-32。 */
  size?: SearchInputSize;
  /** Box、主色搜索按钮、下拉搜索或仅图标形态。 */
  variant?: SearchInputVariant;
  /** Box 形态的搜索图标位置。 */
  iconPosition?: SearchIconPosition;
  /** 自定义搜索图标；传入 false 时不展示图标。 */
  icon?: ReactNode | false;
  /** Box 形态的后置附加元素。 */
  suffix?: ReactNode;
  /** Dropdown 形态的筛选标签。 */
  dropdownLabel?: ReactNode;
  /** 点击主色搜索按钮或仅图标按钮时触发。 */
  onSearch?: (value: string) => void;
}

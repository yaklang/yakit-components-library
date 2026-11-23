import type { ReactNode } from 'react';

import type { YakitTheme } from '../theme';

import type { YakitButtonToken } from './YakitButton';
import type { YakitCardToken } from './YakitCard';
import type { YakitCheckboxToken } from './YakitCheckbox';
import type { YakitDropdownToken } from './YakitDropdown';
import type { YakitRadioToken } from './YakitRadio';
import type { YakitSelectToken } from './YakitSelect';
import type { YakitSwitchToken } from './YakitSwitch';
import type { YakitTagToken } from './YakitTag';
import type { YakitTreeToken } from './YakitTree';

// 扩展的组件 tokens
export interface YakitThemeComponents {
  YakitButton?: Partial<YakitButtonToken>;
  YakitCard?: Partial<YakitCardToken>;
  YakitCheckbox?: Partial<YakitCheckboxToken>;
  YakitDropdown?: Partial<YakitDropdownToken>;
  YakitRadio?: Partial<YakitRadioToken>;
  YakitSwitch?: Partial<YakitSwitchToken>;
  YakitTag?: Partial<YakitTagToken>;
  YakitSelect?: Partial<YakitSelectToken>;
  YakitTree?: YakitTreeToken;
}
export type YakitThemeMode = 'light' | 'dark';

export interface CustomThemeConfig {
  components?: YakitThemeComponents;
  mode?: YakitThemeMode;
  token?: Partial<YakitTheme>;
}

export type GlobalToken = YakitTheme & YakitThemeComponents;

export interface YakitLocale {
  locale: string;
  Input?: {
    clear?: string;
    showPassword?: string;
    hidePassword?: string;
  };
  InputNumber?: {
    decrement?: string;
    increment?: string;
  };
  Search?: {
    search?: string;
    scope?: string;
  };
  Tag?: {
    close?: string;
    /** 复制按钮无障碍名称 */
    copy?: string;
  };
  Checkbox?: {
    /** 无障碍：半选状态说明 */
    indeterminate?: string;
  };
  Select?: {
    /** 下拉项删除按钮的无障碍名称 */
    removeOption?: string;
  };
  CollapseText?: {
    /** 展开按钮文案 */
    expand?: string;
    /** 收起按钮文案 */
    collapse?: string;
  };
}

export type YakitComponentSize = 'small' | 'medium' | 'large' | 'huge';

export interface YakitConfigProviderProps {
  children?: ReactNode;
  componentDisabled?: boolean;
  componentSize?: YakitComponentSize;
  direction?: 'ltr' | 'rtl';
  locale?: YakitLocale;
  theme?: CustomThemeConfig;
}

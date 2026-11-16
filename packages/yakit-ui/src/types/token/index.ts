import type { ReactNode } from 'react';

import type { YakitTheme } from '../theme';

import type { YakitButtonToken } from './YakitButton';
import type { YakitTagToken } from './YakitTag';

// 扩展的组件 tokens
export interface YakitThemeComponents {
  YakitButton?: Partial<YakitButtonToken>;
  YakitTag?: Partial<YakitTagToken>;
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

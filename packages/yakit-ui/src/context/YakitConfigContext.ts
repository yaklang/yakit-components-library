import { createContext } from 'react'

import yakitTheme from '../styles/theme'
import type { GlobalToken, YakitComponentSize, YakitLocale, YakitThemeMode } from '../types/token'

export interface YakitConfigContextValue {
  componentDisabled?: boolean
  componentSize?: YakitComponentSize
  direction: 'ltr' | 'rtl'
  locale: YakitLocale
  mode: YakitThemeMode
  token: GlobalToken
}

export const defaultYakitLocale: YakitLocale = {
  locale: 'zh-CN',
  Input: {
    clear: '清除',
    hidePassword: '隐藏密码',
    showPassword: '显示密码',
  },
  InputNumber: {
    decrement: 'Decrease Value',
    increment: 'Increase Value',
  },
  Search: {
    scope: '搜索范围',
    search: '搜索',
  },
  Tag: {
    close: '关闭',
    copy: '复制',
  },
  Checkbox: {
    indeterminate: '部分选中',
  },
  Select: {
    removeOption: '删除选项',
  },
  CollapseText: {
    expand: '展开',
    collapse: '收起',
  },
}

export const defaultYakitConfig: YakitConfigContextValue = {
  direction: 'ltr',
  locale: defaultYakitLocale,
  mode: 'light',
  token: yakitTheme,
}

export const YakitConfigContext = createContext<YakitConfigContextValue>(defaultYakitConfig)

export const mergeDefined = <T extends object>(parent: T, overrides?: Partial<T>): T => {
  if (!overrides) return parent
  return Object.fromEntries([
    ...Object.entries(parent),
    ...Object.entries(overrides).filter(([, value]) => value !== undefined),
  ]) as T
}

export const mergeYakitLocale = (parent: YakitLocale, locale?: YakitLocale): YakitLocale => ({
  ...mergeDefined(parent, locale),
  Input: mergeDefined(parent.Input ?? {}, locale?.Input),
  InputNumber: mergeDefined(parent.InputNumber ?? {}, locale?.InputNumber),
  Search: mergeDefined(parent.Search ?? {}, locale?.Search),
  Tag: mergeDefined(parent.Tag ?? {}, locale?.Tag),
  Checkbox: mergeDefined(parent.Checkbox ?? {}, locale?.Checkbox),
  Select: mergeDefined(parent.Select ?? {}, locale?.Select),
  CollapseText: mergeDefined(parent.CollapseText ?? {}, locale?.CollapseText),
})

import type {
  GlobalToken as AntdGlobalToken,
  ThemeConfig,
  ConfigProviderProps as AntdConfigProviderProps,
} from 'antd';

import type { YakitTheme } from '../theme';

import type { YakitButtonToken } from './YakitButton';
import type { YakitTagToken } from './YakitTag';

// 扩展的组件 tokens
export interface YakitThemeComponents {
  YakitButton?: Partial<YakitButtonToken>;
  YakitTag?: Partial<YakitTagToken>;
}

// 扩展 antd 的 ThemeConfig
export type CustomThemeConfig = Omit<ThemeConfig, 'components'> & {
  components?: NonNullable<ThemeConfig['components']> & YakitThemeComponents;
};

// 扩展 antd 的全局 token
export type GlobalToken = AntdGlobalToken & YakitTheme & YakitThemeComponents;

// ConfigProvider Props
export interface YakitConfigProviderProps extends Omit<AntdConfigProviderProps, 'theme'> {
  theme?: CustomThemeConfig;
}

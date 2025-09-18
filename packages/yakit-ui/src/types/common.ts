import type {
  GlobalToken as AntdGlobalToken,
  ThemeConfig,
  ConfigProviderProps as AntdConfigProviderProps,
} from 'antd';

export interface BaseProps {
  /** 给组件根元素自定义类名 */
  rootClassName?: string;
}

export interface TestToken {
  /** 测试属性 */
  test?: string;
}

export interface CustomThemeComponents {
  Test?: Partial<TestToken>;
}

export type CustomThemeConfig = ThemeConfig & {
  components?: ThemeConfig['components'] & CustomThemeComponents;
};

export interface CustomConfigProviderProps extends Omit<AntdConfigProviderProps, 'theme'> {
  theme?: CustomThemeConfig;
}

export type GlobalToken = AntdGlobalToken & CustomThemeComponents;

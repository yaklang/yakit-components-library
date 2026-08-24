import type { Preview } from '@storybook/react';
import { theme } from 'antd';
import type { Locale } from 'antd/es/locale';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useEffect } from 'react';

import { ConfigProvider } from '../src/components';

const antdLocales: Record<'zh' | 'en', Locale> = { zh: zhCN, en: enUS };

export const globalTypes = {
  locale: {
    name: '语言',
    description: '切换语言',
    defaultValue: 'zh',
    toolbar: {
      icon: 'globe',
      items: [
        { value: 'zh', title: '中文' },
        { value: 'en', title: 'English' },
      ],
      showName: true,
    },
  },
  theme: {
    name: '主题',
    description: '切换主题',
    defaultValue: 'light',
    toolbar: {
      icon: 'circlehollow',
      items: [
        { value: 'light', title: '浅色' },
        { value: 'dark', title: '深色' },
      ],
      showName: true,
    },
  },
};

const preview: Preview = {
  decorators: [
    (Story, context) => {
      // 获取当前主题
      const currentTheme = context.globals.theme as 'light' | 'dark';

      // 设置 HTML 的 data-theme 属性
      useEffect(() => {
        document.documentElement.setAttribute('data-theme', currentTheme);
      }, [currentTheme]);

      // 显式指定 locale 类型
      const locale = context.globals.locale as 'zh' | 'en';

      // 根据主题选择算法
      const algorithm = currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

      return (
        <ConfigProvider
          theme={{
            algorithm,
          }}
          locale={antdLocales[locale]}
        >
          <div data-theme={currentTheme}>
            <Story />
          </div>
        </ConfigProvider>
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;

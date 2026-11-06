import type { Preview } from '@storybook/react';
import { useEffect } from 'react';

import { ConfigProvider } from '../src/components';
import type { YakitLocale } from '../src/components';
import '../src/styles/index.css';

const locales: Record<'zh' | 'en', YakitLocale> = {
  zh: {
    locale: 'zh-CN',
    Input: { clear: '清除', hidePassword: '隐藏密码', showPassword: '显示密码' },
    InputNumber: { decrement: '减少', increment: '增加' },
    Search: { scope: '搜索范围', search: '搜索' },
    Modal: { ok: '确定', cancel: '取消', close: '关闭', help: '帮助', ariaLabel: '对话框' },
  },
  en: {
    locale: 'en-US',
    Input: { clear: 'Clear', hidePassword: 'Hide password', showPassword: 'Show password' },
    InputNumber: { decrement: 'Decrease', increment: 'Increase' },
    Search: { scope: 'Search scope', search: 'Search' },
    Modal: { ok: 'OK', cancel: 'Cancel', close: 'Close', help: 'Help', ariaLabel: 'Dialog' },
  },
};

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

      return (
        <ConfigProvider theme={{ mode: currentTheme }} locale={locales[locale]}>
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

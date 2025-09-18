import type { Preview } from '@storybook/react';
import { ConfigProvider } from 'antd';
import type { ConfigProviderProps } from 'antd/es/config-provider';
import type { Locale } from 'antd/es/locale';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import type { ComponentType } from 'react';

const antdLocales: Record<'zh' | 'en', Locale> = { zh: zhCN, en: enUS };

const CP = ConfigProvider as ComponentType<ConfigProviderProps>;

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
};

const preview: Preview = {
  decorators: [
    (Story, context) => {
      // 显式指定 locale 类型
      const locale = context.globals.locale as 'zh' | 'en';
      return (
        <CP
          theme={{
            token: {
              colorPrimary: '#5c6ac4',
            },
            components: {
              Button: {
                colorPrimary: '#5c6ac4',
              },
            },
          }}
          locale={antdLocales[locale]}
        >
          <Story />
        </CP>
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

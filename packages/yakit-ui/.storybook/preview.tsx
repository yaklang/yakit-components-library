import type { Preview } from '@storybook/react';
import { applyThemeColors, generateColors } from '@yakit-libs/color';
import { useEffect, useMemo } from 'react';

import { ConfigProvider } from '../src/components';
import type { YakitLocale } from '../src/components';
import '../src/styles/index.css';

import { brandThemes, type BrandTheme } from './brand-themes';
import './preview.css';

const locales: Record<'zh' | 'en', YakitLocale> = {
  zh: {
    locale: 'zh-CN',
    Input: { clear: '清除', hidePassword: '隐藏密码', showPassword: '显示密码' },
    InputNumber: { decrement: '减少', increment: '增加' },
    Search: { scope: '搜索范围', search: '搜索' },
  },
  en: {
    locale: 'en-US',
    Input: { clear: 'Clear', hidePassword: 'Hide password', showPassword: 'Show password' },
    InputNumber: { decrement: 'Decrease', increment: 'Increase' },
    Search: { scope: 'Search scope', search: 'Search' },
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
  brand: {
    name: '主题色',
    description: '切换主题色',
    toolbar: {
      icon: 'paintbrush',
      title: '主题色',
      items: Object.entries(brandThemes).map(([value, { name }]) => ({ value, title: name })),
      showName: true,
      dynamicTitle: true,
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
  initialGlobals: { locale: 'zh', theme: 'light', brand: 'yakit' },
  decorators: [
    (Story, context) => {
      const currentTheme = context.globals.theme === 'dark' ? 'dark' : 'light';
      const brand: BrandTheme = Object.prototype.hasOwnProperty.call(
        brandThemes,
        context.globals.brand,
      )
        ? (context.globals.brand as BrandTheme)
        : 'yakit';
      const palettes = useMemo(
        () => ({
          light: generateColors('light', brandThemes[brand].light),
          dark: generateColors('dark', brandThemes[brand].dark),
        }),
        [brand],
      );
      // Components also set data-theme themselves; override their static palettes too.
      const themeCss = useMemo(
        () =>
          Object.entries(palettes)
            .map(
              ([mode, colors]) =>
                `html [data-theme="${mode}"] {${Object.entries(colors)
                  .map(([key, value]) => `${key}:${value};`)
                  .join('')}}`,
            )
            .join('\n'),
        [palettes],
      );

      useEffect(() => {
        applyThemeColors(currentTheme, palettes[currentTheme]);
      }, [palettes, currentTheme]);

      // 显式指定 locale 类型
      const locale = context.globals.locale as 'zh' | 'en';

      return (
        <ConfigProvider theme={{ mode: currentTheme }} locale={locales[locale]}>
          <div>
            <style>{themeCss}</style>
            <Story />
          </div>
        </ConfigProvider>
      );
    },
  ],
  parameters: {
    // The theme toolbar owns the canvas background.
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;

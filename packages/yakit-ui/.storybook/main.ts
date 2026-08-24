import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

import { createSvgReactPlugin } from '../config/svgReactTransform';

const config: StorybookConfig = {
  stories: ['../../src/**/*.mdx', './**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    // '@storybook/addon-onboarding',
    '@chromatic-com/storybook',
    '@storybook/experimental-addon-test',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (viteConfig) =>
    mergeConfig(viteConfig, {
      plugins: [createSvgReactPlugin()],
    }),
};
export default config;

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

import { createSvgReactPlugin } from '../config/svgReactTransform';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dirname, '..');
const srcDir = path.resolve(packageRoot, 'src');

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
      resolve: {
        // Storybook / local dev: always compile from src so component CSS/TSX HMR works.
        // Never serve the built dist package entry during storybook dev.
        // Exact package -> src; subpaths like .../components/Radio -> src/components/Radio.
        alias: [
          {
            find: '@yakit-libs/yakit-ui/style.css',
            replacement: path.join(srcDir, 'styles/index.css'),
          },
          {
            find: /^@yakit-libs\/yakit-ui(\/.*)?$/,
            replacement: `${srcDir}$1`,
          },
        ],
        dedupe: ['react', 'react-dom'],
      },
      optimizeDeps: {
        exclude: ['@yakit-libs/yakit-ui'],
      },
      server: {
        watch: {
          // Watch source + stories; ignore build artifacts that would thrash or hide HMR.
          ignored: ['**/dist/**', '**/storybook-static/**', '**/node_modules/**'],
        },
        fs: {
          allow: [packageRoot, path.resolve(packageRoot, '..')],
        },
      },
    }),
};
export default config;

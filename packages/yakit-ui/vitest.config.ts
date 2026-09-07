import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import type {} from '@vitest/browser/providers/playwright';

import { createSvgReactPlugin } from './config/svgReactTransform';

const executablePath = (
  globalThis as {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env?.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

const componentCoverageExcludes = [
  'src/components/**/assets/**',
  'src/components/**/style/**',
  'src/components/**/type.ts',
  'src/**/*.d.ts',
  'src/icons/**',
  'src/components/index.tsx',
  'src/components/Button/index.tsx',
  'src/components/ConfigProvider/index.tsx',
  'src/components/InputNumber/index.tsx',
  'src/components/SearchInput/index.tsx',
  'src/components/Tag/index.tsx',
  'src/components/Animation/Wave/index.tsx',
];

export default defineConfig({
  plugins: [createSvgReactPlugin()],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-dom/server',
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
    ],
  },
  test: {
    setupFiles: ['./test/setup.ts'],
    browser: {
      enabled: true,
      headless: true,
      instances: [
        {
          browser: 'chromium',
          launch: executablePath ? { executablePath } : undefined,
        },
      ],
      provider: 'playwright',
    },
    include: ['test/components/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      all: true,
      clean: true,
      include: ['src/components/**/*.{ts,tsx}'],
      exclude: [...coverageConfigDefaults.exclude, ...componentCoverageExcludes],
      reportsDirectory: 'coverage/components',
      reporter: ['text', 'json', 'json-summary', 'html', 'lcov'],
      thresholds: {
        perFile: false,
        statements: 99,
        lines: 99,
        functions: 99,
        branches: 87,
        'src/components/Animation/**': {
          statements: 100,
          lines: 100,
          functions: 100,
          branches: 87,
        },
        'src/components/Button/**': {
          statements: 100,
          lines: 100,
          functions: 100,
          branches: 95,
        },
        'src/components/ConfigProvider/**': {
          statements: 100,
          lines: 100,
          functions: 100,
          branches: 100,
        },
        'src/components/Input/**': {
          statements: 99,
          lines: 99,
          functions: 98,
          branches: 86,
        },
        'src/components/InputNumber/**': {
          statements: 96,
          lines: 96,
          functions: 100,
          branches: 89,
        },
        'src/components/SearchInput/**': {
          statements: 100,
          lines: 100,
          functions: 100,
          branches: 100,
        },
        'src/components/Tag/**': {
          statements: 100,
          lines: 100,
          functions: 100,
          branches: 87,
        },
      },
    },
  },
});

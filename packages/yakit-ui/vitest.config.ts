import { defineConfig } from 'vitest/config';
import type {} from '@vitest/browser/providers/playwright';

import { createSvgReactPlugin } from './config/svgReactTransform';

const executablePath = (
  globalThis as {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env?.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

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
    include: ['test/components/**/*.test.tsx'],
  },
});

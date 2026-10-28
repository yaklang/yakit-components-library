import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

import react from '@vitejs/plugin-react';
import type {} from '@vitest/browser/providers/playwright';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);
const react18 = dirname(require.resolve('react-18/package.json'));
const reactDom18 = dirname(require.resolve('react-dom-18/package.json'));

const executablePath = (
  globalThis as {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env?.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

// 用同一份 Wave 源码，在 React 18 下再跑一遍子节点 ref 用例。
export default defineConfig({
  plugins: [react()],
  define: {
    __EXPECTED_REACT_MAJOR__: JSON.stringify('18'),
  },
  resolve: {
    alias: [
      { find: 'react/jsx-dev-runtime', replacement: join(react18, 'jsx-dev-runtime.js') },
      { find: 'react/jsx-runtime', replacement: join(react18, 'jsx-runtime.js') },
      { find: 'react-dom/client', replacement: join(reactDom18, 'client.js') },
      { find: /^react-dom$/, replacement: reactDom18 },
      { find: /^react$/, replacement: react18 },
    ],
    dedupe: ['react', 'react-dom'],
  },
  test: {
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
    include: ['test/components/wave-child-ref.test.tsx'],
  },
});

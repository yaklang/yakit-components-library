import { defineConfig } from 'vitest/config'
import type {} from '@vitest/browser/providers/playwright'

const executablePath = (
  globalThis as {
    process?: { env?: Record<string, string | undefined> }
  }
).process?.env?.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

export default defineConfig({
  plugins: [],
  define: {
    __EXPECTED_REACT_MAJOR__: JSON.stringify('19'),
  },
  resolve: {
    // antd CJS 预打包会内嵌独立 React 副本，须强制归一到同实例（否则双 React 实例 useContext 崩）
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'antd',
      'react',
      'react-dom',
      'react-dom/client',
      'react-dom/server',
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
      'antd',
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
})

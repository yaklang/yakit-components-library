import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [],
  test: {
    environment: 'node',
    include: ['test/icons/**/*.test.ts', 'test/ssr/**/*.test.tsx'],
  },
});

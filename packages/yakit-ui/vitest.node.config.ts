import { defineConfig } from 'vitest/config';

import { createSvgReactPlugin } from './config/svgReactTransform';

export default defineConfig({
  plugins: [createSvgReactPlugin()],
  test: {
    environment: 'node',
    include: ['test/icons/**/*.test.ts'],
  },
});

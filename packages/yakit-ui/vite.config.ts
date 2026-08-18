import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  const plugins = [react(), svgr()];

  if (mode === 'lib') {
    return {
      build: {
        lib: {
          entry: './src/index.ts',
          fileName: 'index',
          formats: ['es'],
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'react/jsx-runtime'],
        },
      },
      plugins,
    };
  }

  return {
    root: './test',
    plugins,
    server: {
      port: 3000,
    },
  };
});

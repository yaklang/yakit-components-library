import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { createSvgReactPlugin } from './config/svgReactTransform';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

function nodeCompatibleExternalPath(id: string) {
  if (!id.startsWith('antd/es/')) return id;
  const relativePath = id.slice('antd/'.length);
  const antdRoot = path.join(packageRoot, 'node_modules/antd');
  if (existsSync(path.join(antdRoot, `${relativePath}.js`))) return `${id}.js`;
  if (existsSync(path.join(antdRoot, relativePath, 'index.js'))) return `${id}/index.js`;
  throw new Error(`Cannot resolve a Node-compatible Ant Design ESM path for ${id}`);
}

export default defineConfig(({ mode }) => {
  const plugins = [react(), createSvgReactPlugin()];

  if (mode === 'lib') {
    return {
      build: {
        copyPublicDir: false,
        lib: {
          entry: {
            index: './src/index.ts',
            'icons/index': './src/icons/index.tsx',
            'icons/outline/index': './src/icons/outline/index.tsx',
            'icons/solid/index': './src/icons/solid/index.tsx',
            'icons/registry': './src/icons/registry.ts',
          },
          cssFileName: 'index',
          fileName: (_format, entryName) => `${entryName}.js`,
          formats: ['es'],
        },
        rollupOptions: {
          external: (id) =>
            [
              '@ant-design/cssinjs',
              '@yakit-libs/color',
              'antd',
              'classnames',
              'react',
              'react-dom',
            ].some((dependency) => id === dependency || id.startsWith(`${dependency}/`)),
          output: {
            paths: nodeCompatibleExternalPath,
          },
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

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { createIconPureAnnotationPlugin, createSvgReactPlugin } from './config/svgReactTransform';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const iconSourceRoot = path.resolve(packageRoot, 'src');
const iconCss = readFileSync(path.join(packageRoot, 'icon.css'), 'utf8');
const oldiconSourceRoot = path.join(iconSourceRoot, 'oldicon/icons');
const oldiconEntries = Object.fromEntries(
  readdirSync(oldiconSourceRoot)
    .filter((fileName) => fileName.endsWith('.tsx'))
    .sort()
    .map((fileName) => {
      const exportName = path.basename(fileName, '.tsx');
      return [`oldicon/icons/${exportName}`, path.join(oldiconSourceRoot, fileName)];
    }),
);

function iconBrowserFacades() {
  const facades: Record<string, readonly [string, string]> = {
    'browser/index.js': ['../icon.css', '../index.js'],
    'browser/colorful/index.js': ['../../icon.css', '../../colorful/index.js'],
    'browser/oldicon/index.js': ['../../icon.css', '../../oldicon/index.js'],
    'browser/outline/index.js': ['../../icon.css', '../../outline/index.js'],
    'browser/registry.js': ['../icon.css', '../registry.js'],
    'browser/solid/index.js': ['../../icon.css', '../../solid/index.js'],
    ...Object.fromEntries(
      Object.keys(oldiconEntries).map((entryName) => [
        `browser/${entryName}.js`,
        ['../../../icon.css', `../../../${entryName}.js`],
      ]),
    ),
  };

  return {
    name: 'yakit-icon-browser-facades',
    generateBundle(this: { emitFile: (asset: object) => void }) {
      this.emitFile({ fileName: 'icon.css', source: iconCss, type: 'asset' });
      for (const [fileName, [cssPath, runtimePath]] of Object.entries(facades)) {
        this.emitFile({
          fileName,
          source: `import ${JSON.stringify(cssPath)};\nexport * from ${JSON.stringify(runtimePath)};\n`,
          type: 'asset',
        });
      }
    },
  };
}

export default defineConfig({
  build: {
    copyPublicDir: false,
    lib: {
      entry: {
        'colorful/index': path.join(iconSourceRoot, 'colorful/index.tsx'),
        index: path.join(iconSourceRoot, 'index.tsx'),
        'oldicon/index': path.join(iconSourceRoot, 'oldicon/index.tsx'),
        ...oldiconEntries,
        'outline/index': path.join(iconSourceRoot, 'outline/index.tsx'),
        registry: path.join(iconSourceRoot, 'registry.ts'),
        'solid/index': path.join(iconSourceRoot, 'solid/index.tsx'),
      },
      fileName: (_format, entryName) => `${entryName}.js`,
      formats: ['es'],
    },
    rollupOptions: {
      external: (id) =>
        id === '@yakit-libs/color' ||
        id.startsWith('@yakit-libs/color/') ||
        id === 'react' ||
        id.startsWith('react/'),
    },
  },
  plugins: [
    createIconPureAnnotationPlugin(),
    react(),
    createSvgReactPlugin(),
    iconBrowserFacades(),
  ],
});

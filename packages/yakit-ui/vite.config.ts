import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const iconCss = '@import "@yakit-libs/yakit-ui-icons/icon.css";\n';

function iconBrowserFacades(): Plugin {
  const facades = {
    'browser/icons/index.js': ['../../icon.css', '../../icons/index.js'],
    'browser/icons/colorful/index.js': ['../../../icon.css', '../../../icons/colorful/index.js'],
    'browser/icons/outline/index.js': ['../../../icon.css', '../../../icons/outline/index.js'],
    'browser/icons/registry.js': ['../../icon.css', '../../icons/registry.js'],
    'browser/icons/solid/index.js': ['../../../icon.css', '../../../icons/solid/index.js'],
  } as const;

  return {
    name: 'yakit-icon-browser-facades',
    generateBundle() {
      this.emitFile({ fileName: 'icon.css', source: iconCss, type: 'asset' });
      for (const [fileName, [_cssPath, runtimePath]] of Object.entries(facades)) {
        this.emitFile({
          fileName,
          source: `import "@yakit-libs/yakit-ui-icons/icon.css";\nexport * from ${JSON.stringify(runtimePath)};\n`,
          type: 'asset',
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const plugins = [react()];

  if (mode === 'lib') {
    return {
      build: {
        copyPublicDir: false,
        lib: {
          entry: {
            index: './src/index.ts',
            'icons/index': './src/icons/index.tsx',
            'icons/colorful/index': './src/icons/colorful/index.tsx',
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
              '@yakit-libs/yakit-ui-icons',
              '@yakit-libs/color',
              'antd',
              'classnames',
              'react',
              'react-dom',
            ].some((dependency) => id === dependency || id.startsWith(`${dependency}/`)),
        },
      },
      plugins: [...plugins, iconBrowserFacades()],
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

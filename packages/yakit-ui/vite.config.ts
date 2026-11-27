import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  const plugins = [react()]

  if (mode === 'lib') {
    return {
      // yakit 的图标守卫不允许 `import { Foo as Bar }`；库构建不能压缩导入标识符。
      esbuild: {
        minifyIdentifiers: false,
      },
      build: {
        copyPublicDir: false,
        lib: {
          entry: { index: './src/index.ts' },
          cssFileName: 'index',
          fileName: (_format, entryName) => `${entryName}.js`,
          formats: ['es'],
        },
        rollupOptions: {
          external: (id) =>
            ['@yakit-libs/yakit-ui-icons', '@yakit-libs/color', 'antd', 'classnames', 'react', 'react-dom'].some(
              (dependency) => id === dependency || id.startsWith(`${dependency}/`),
            ),
        },
      },
      plugins,
    }
  }

  return {
    root: './test',
    plugins,
    server: {
      port: 3000,
    },
  }
})

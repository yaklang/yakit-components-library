const { build } = require('vite')
const path = require('path')

async function buildVite() {
  await build({
    configFile: false,
    build: {
      outDir: path.resolve(__dirname, '../dist/electron'),
      emptyOutDir: true,
      lib: {
        entry: {
          main: path.resolve(__dirname, '../src/main/index.ts'),
          preload: path.resolve(__dirname, '../src/preload/index.ts')
        },
        formats: ['cjs'],
        fileName: (_, name) => `${name}.js`
      },
      rollupOptions: {
        external: ['electron', 'path', 'fs']
      }
    }
  })
  console.log('✅ Electron TS 打包完成')
}

buildVite().catch((err) => {
  console.error('❌ 打包失败:', err)
  process.exit(1)
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'), // React 子窗口源码目录
  plugins: [react()],
  server: {
    port: 3001
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'), // 打包输出目录
    emptyOutDir: true
  },
})

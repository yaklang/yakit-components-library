import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'test/main/index.ts'),
          console: resolve(__dirname, 'src/main/index.ts')
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'test/preload/index.ts'),
          console: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [react()],
    root: 'test/renderer',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'test/renderer/index.html'),
          console: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    }
  }
})

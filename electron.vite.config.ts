import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    build: {
      rollupOptions: {
        input: {
          // 主应用入口
          index: resolve('src/renderer/index.html'),
          // 工具栏独立入口
          toolbar: resolve('src/renderer/toolbar.html'),
          // 功能窗口独立入口
          selection: resolve('src/renderer/selection.html')
        }
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'zustand',
        'lucide-react',
        'clsx',
        'tailwind-merge',
        'i18next',
        'react-i18next',
        '@radix-ui/react-dialog',
        '@radix-ui/react-switch',
        '@radix-ui/react-radio-group',
        '@radix-ui/react-slider',
        '@radix-ui/react-select',
        '@radix-ui/react-tabs'
      ]
    },
    plugins: [react(), tailwindcss()]
  }
})

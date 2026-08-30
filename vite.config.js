import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

/** 与 workflow_center_ui 部署目录一致：站点根为 /uniflow/front/ */
export default defineConfig({
  base: '/uniflow/front/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: 'localhost',
    port: 5180,
    open: false,
    proxy: {
      '/api': {
        target: 'https://flow-test.clamc.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'static',
    sourcemap: false,
  },
})

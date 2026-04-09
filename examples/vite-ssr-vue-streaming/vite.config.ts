import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { DevTools } from '@vitejs/devtools'
import { Unhead } from '@unhead/vue/vite'

export default defineConfig({
  plugins: [
    DevTools(),
    vue(),
    Unhead({ streaming: true }),
  ],
  devtools: {
    enabled: true,
    clientAuth: false,
  },
  build: {
    minify: false,
  },
})

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { Unhead } from '@unhead/vue/vite'

export default defineConfig(({ command }) => ({
  plugins: [
    vue(),
    Unhead({ streaming: true }),
  ],
  devtools: {
    enabled: command === 'serve',
    clientAuth: false,
  },
  build: {
    minify: false,
  },
}))

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { Unhead } from '@unhead/vue/vite'

export default defineConfig({
  plugins: [
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

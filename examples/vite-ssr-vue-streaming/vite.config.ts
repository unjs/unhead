import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import unhead from '@unhead/vue/vite'

export default defineConfig({
  plugins: [
    vue(),
    unhead({ streaming: true }),
  ],
  build: {
    minify: false,
  },
})

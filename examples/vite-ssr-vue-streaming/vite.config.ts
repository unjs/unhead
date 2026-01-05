import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { unheadVuePlugin } from '@unhead/vue/stream/vite'

export default defineConfig({
  plugins: [
    vue(),
    // Streaming mode: transforms useHead() calls to output inline scripts during SSR streaming
    unheadVuePlugin(),
  ],
  build: {
    minify: false,
  },
})

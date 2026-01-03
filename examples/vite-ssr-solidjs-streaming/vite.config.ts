import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { unheadSolidPlugin } from '@unhead/solid-js/stream/vite'

export default defineConfig({
  plugins: [
    solid({ ssr: true }),
    // Streaming mode: transforms useHead() calls to output inline scripts during SSR streaming
    unheadSolidPlugin(),
  ],
  build: {
    minify: false,
  },
})

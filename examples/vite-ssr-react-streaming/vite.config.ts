import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { unheadReactPlugin } from '@unhead/react/stream/vite'

export default defineConfig({
  plugins: [
    react(),
    // Streaming mode: transforms useHead() calls to output inline scripts during SSR streaming
    unheadReactPlugin({ streaming: true }),
  ],
  build: {
    minify: false,
  },
})

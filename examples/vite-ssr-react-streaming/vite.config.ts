import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { unheadReactPlugin } from '@unhead/react/stream/vite'

export default defineConfig({
  plugins: [
    react(),
    unheadReactPlugin(),
  ],
  build: {
    minify: false,
  },
})

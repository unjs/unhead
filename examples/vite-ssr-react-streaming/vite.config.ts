import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { unheadReactPlugin } from '@unhead/react/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    // Automatically transforms Suspense → SuspenseWithHead in files using useHead
    unheadReactPlugin(),
  ],
  build: {
    minify: false,
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { unheadReactPlugin } from '@unhead/react/stream/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), unheadReactPlugin()],
  resolve: {
    alias: {
      '@unhead/react/shared': path.resolve(__dirname, '../../packages/react/dist/shared'),
    },
  },
  ssr: {
    noExternal: ['@unhead/react'],
  },
})

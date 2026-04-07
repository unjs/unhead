import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import unhead from '@unhead/react/vite'

export default defineConfig({
  plugins: [react(), unhead()],
})

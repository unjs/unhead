import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Unhead } from '@unhead/react/vite'

export default defineConfig({
  plugins: [react(), Unhead()],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Unhead from "@unhead/addons/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), Unhead()],
})

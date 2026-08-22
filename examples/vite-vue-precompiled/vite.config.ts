import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { Unhead } from '@unhead/vue/vite'

// Compiled mode example: every head call is static and gets precompiled into
// render-ready plans. The neutral `@unhead/vue/precompiled` entry is rewritten
// per build target (server / client). Dynamic input is rejected at build time
// by design; use the normal `@unhead/vue` runtime when a page needs it.
export default defineConfig({
  plugins: [
    vue(),
    Unhead({
      devtools: false,
      validate: false,
      experimental: { precompile: true },
    }),
  ],
})

import process from 'node:process'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: false },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  ui: {
    fonts: false,
  },
  colorMode: {
    preference: 'light',
  },
  icon: {
    provider: 'none',
    serverBundle: false,
    clientBundle: { scan: true },
  },
  nitro: {
    preset: 'node-server',
    output: {
      dir: process.env.NUXT_BENCH_OUTPUT_DIR || '.output',
    },
  },
})

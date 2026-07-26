import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-18',
  nitro: { preset: 'cloudflare_module' },
  routeRules: { '/**': { prerender: true } },
})

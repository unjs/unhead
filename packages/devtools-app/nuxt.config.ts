import { resolve } from 'pathe'

export default defineNuxtConfig({
  ssr: false,

  modules: [
    '@nuxt/ui',
    '@vueuse/nuxt',
  ],

  css: [resolve(__dirname, 'assets/css/global.css')],

  imports: {
    autoImport: true,
  },

  devtools: {
    enabled: false,
  },

  compatibilityDate: '2026-03-13',

  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/'],
      failOnError: false,
    },
    output: {
      publicDir: resolve(__dirname, 'dist'),
    },
  },

  vite: {
    optimizeDeps: {
      include: [
        '@vueuse/core',
      ],
      exclude: ['jiti'],
    },
    resolve: {
      alias: {
        jiti: 'data:text/javascript,export default () => {}',
      },
    },
  },

  app: {
    baseURL: '/__unhead/',
  },
})

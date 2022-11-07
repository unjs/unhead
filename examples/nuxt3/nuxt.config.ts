import { resolve } from 'pathe'

export default defineNuxtConfig({
  alias: {
    'nuxt-unhead': resolve(__dirname, '../../packages/nuxt/src/module'),
  },
  modules: [
    'nuxt-unhead',
  ],
  app: {
    head: {
      link: [
        {
          href: '/',
        },
      ],
      viewport: 'width=device-width, initial-scale=1',
    },
  },
  workspaceDir: resolve(__dirname, '../../'),
  imports: {
    autoImport: true,
  },
})

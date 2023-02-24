import { fileURLToPath } from 'url'
import { defineNuxtConfig } from 'nuxt/config'
import { addPlugin } from '@nuxt/kit'
import { resolve } from 'pathe'

const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
const rootDir = fileURLToPath(new URL('../../', import.meta.url))

// https://v3.nuxtjs.org/api/configuration/nuxt.config
export default defineNuxtConfig({
  alias: {
    '@unhead/vue': `${rootDir}/packages/vue/src`,
    '@unhead/ssr': `${rootDir}/packages/ssr/src`,
    '@unhead/dom': `${rootDir}/packages/dom/src`,
    'unhead': `${rootDir}/packages/unhead/src`,
  },
  app: {
    head: {
      title: 'default title',
    },
  },

  plugins: [
    '~/plugins/script',
  ],
})

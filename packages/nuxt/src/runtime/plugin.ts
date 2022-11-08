import { createHead } from '@unhead/vue'
import { defineNuxtPlugin } from '#app'

// Note: This should always be a partial match to nuxt's internal vueuse-head plugin

export default defineNuxtPlugin((nuxtApp) => {
  const head = createHead()
  head.install(nuxtApp.vueApp)
})

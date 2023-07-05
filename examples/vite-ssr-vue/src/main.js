import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'
import { VueHeadMixin, createHead } from '@unhead/vue'
import App from './App.vue'
import { createRouter } from './router'

// SSR requires a fresh app instance per request, therefore we export a function
// that creates a fresh app instance. If using Vuex, we'd also be creating a
// fresh store here.
export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  const router = createRouter()
  app.use(router)
  const head = createHead()
  app.use(head)
  app.mixin(VueHeadMixin)

  head.push({
    htmlAttrs: {
      class: 'layout-default',
    },
    bodyAttrs: {
      style: 'overflow: hidden;',
    },
  })
  return { app, router, head }
}

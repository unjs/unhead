import { createApp } from './main'
import { VueHeadMixin, createStreamableHead } from '@unhead/vue/stream/client'

const { app, router } = createApp()

// Get head instance created by iife script (loaded early in <head>)
const head = createStreamableHead()!
app.use(head)
app.mixin(VueHeadMixin)

// Wait until router is ready before mounting to ensure hydration match
router.isReady().then(() => {
  app.mount('#app')
  console.log('entry-client.ts head', head)
})

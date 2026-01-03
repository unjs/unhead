import { createApp } from './main'
import { VueHeadMixin, createStreamableHead } from '@unhead/vue/stream/client'

const { app, router } = createApp()

// Reuse head instance created by virtual:@unhead/streaming-client (loaded early in <head>)
// Falls back to creating new one if virtual module didn't load
const head = (window as any).__unheadInstance__ || createStreamableHead()
app.use(head)
app.mixin(VueHeadMixin)

// Wait until router is ready before mounting to ensure hydration match
router.isReady().then(() => {
  app.mount('#app')
  console.log('entry-client.ts head', head)
})

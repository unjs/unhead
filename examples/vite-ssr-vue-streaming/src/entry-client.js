import { createApp } from './main'
import { VueHeadMixin, createStreamableHead } from "@unhead/vue/client";

const { app, router } = createApp()

// Reuse head instance created by head-client.ts (loaded early in <head>)
// Falls back to creating new one if head-client didn't load
const head = (window).__unheadInstance__ || createStreamableHead()
app.use(head)
app.mixin(VueHeadMixin)

// wait until router is ready before mounting to ensure hydration match
router.isReady().then(() => {
  app.mount('#app')
})

import { createApp } from './main'
import { VueHeadMixin, createStreamableHead } from "@unhead/vue/client";

const { app, router } = createApp()

// Use createStreamableHead to consume streaming queue
const head = createStreamableHead()
app.use(head)
app.mixin(VueHeadMixin)

// wait until router is ready before mounting to ensure hydration match
router.isReady().then(() => {
  app.mount('#app')
})

import { createApp } from './main'
import { VueHeadMixin, createHead } from "@unhead/vue/client";

const { app, router } = createApp()

const head = createHead()
app.use(head)
app.mixin(VueHeadMixin)

// wait until router is ready before mounting to ensure hydration match
router.isReady().then(() => {
  app.mount('#app')
})

import { createApp } from './main'
import { createStreamableHead, VueHeadMixin } from '@unhead/vue/stream/server'
import { renderToWebStream } from 'vue/server-renderer'

export function render(url: string) {
  const { app, router } = createApp()

  // Use createStreamableHead for streaming SSR
  const head = createStreamableHead()
  app.use(head)
  app.mixin(VueHeadMixin)

  // Push the URL to router
  router.push(url)

  // Create Vue's web stream
  const vueStream = renderToWebStream(app)

  return { vueStream, head, router }
}

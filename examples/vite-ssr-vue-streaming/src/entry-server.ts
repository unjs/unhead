import { renderToWebStream } from 'vue/server-renderer'
import { createStreamableHead, VueHeadMixin } from '@unhead/vue/stream/server'
import { createApp } from './main'

export async function render(url: string, template: string) {
  const { app, router } = createApp()
  const { head, wrapStream } = createStreamableHead()

  app.use(head)
  app.mixin(VueHeadMixin)
  router.push(url)

  // Create stream first - Vue starts rendering synchronously
  const vueStream = renderToWebStream(app)

  // Wait for router - by now Vue's sync render has pushed head entries
  await router.isReady()

  return wrapStream(vueStream, template)
}

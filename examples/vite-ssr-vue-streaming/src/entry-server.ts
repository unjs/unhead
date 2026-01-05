import { renderToWebStream } from 'vue/server-renderer'
import { createStreamableHead } from '@unhead/vue/stream/server'
import { VueHeadMixin } from '@unhead/vue'
import { createApp } from './main'

export async function render(url: string, template: string) {
  const { app, router } = createApp()
  const { head, wrapStream } = createStreamableHead()

  app.use(head)
  app.mixin(VueHeadMixin)
  router.push(url)

  // Wait for router before rendering (lazy-loaded route components need this)
  await router.isReady()

  // Now render with all route components loaded
  const vueStream = renderToWebStream(app)

  return wrapStream(vueStream, template)
}

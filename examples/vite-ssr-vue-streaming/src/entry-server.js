import { createApp } from './main'
import { createHead, createStreamableHead, VueHeadMixin } from "@unhead/vue/stream/server"
import { renderToWebStream, renderToString } from 'vue/server-renderer'

export function render(url, ssrContext = {}, renderFn = renderToWebStream) {
  const { app } = createApp()
  // Use createStreamableHead for streaming SSR
  const head = renderFn === renderToWebStream
    ? createStreamableHead()
    : createHead()
  app.use(head)
  app.mixin(VueHeadMixin)

  const ctx = { ...ssrContext }

  // Support both streaming and string rendering
  if (renderFn === renderToString) {
    return {
      appHtml: renderFn(app, ctx),
      head,
      ctx
    }
  }
  const vueStream = renderFn(app, ctx)
  return { vueStream, head, ctx }
}

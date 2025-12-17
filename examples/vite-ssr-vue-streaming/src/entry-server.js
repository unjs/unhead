import { createApp } from './main'
import { createHead, VueHeadMixin } from "@unhead/vue/server"
import { renderToWebStream, renderToString } from 'vue/server-renderer'

export function render(url, ssrContext = {}, renderFn = renderToWebStream) {
  const { app } = createApp()
  const head = createHead()
  app.use(head)
  app.mixin(VueHeadMixin)

  // passing SSR context object which will be available via useSSRContext()
  // @vitejs/plugin-vue injects code into a component's setup() that registers
  // itself on ctx.modules. After the render, ctx.modules would contain all the
  // components that have been instantiated during this render call.
  const ctx = { ...ssrContext }

  // Support both streaming and string rendering
  if (renderFn === renderToString) {
    // For bots: return promise of complete HTML
    return {
      appHtml: renderFn(app, ctx),
      head,
      ctx
    }
  }
  // For users: return stream
  const vueStream = renderFn(app, ctx)
  return { vueStream, head, ctx }
}

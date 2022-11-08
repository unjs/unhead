import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'

export async function ssrRenderHeadToString(fn: () => void) {
  const head = await createHead()
  const app = createSSRApp({
    setup() {
      fn()
      return () => '<div>hi</div>'
    },
  })
  app.use(head)
  await renderToString(app)

  return renderSSRHead(head)
}

export async function ssrRenderOptionsHead(input: any) {
  const head = await createHead()
  const app = createSSRApp({
    head() {
      return input
    },
    setup() {
      return () => '<div>hi</div>'
    },
  })
  app.use(head)
  await renderToString(app)

  return renderSSRHead(head)
}

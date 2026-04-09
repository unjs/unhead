import { renderToString } from 'vue/server-renderer'
import { createApp } from './main'
import { createHead } from '@unhead/vue/server'

export async function render(url: string) {
  const { app, router } = createApp()
  const head = createHead()
  app.use(head)

  router.push(url)
  await router.isReady()

  const html = await renderToString(app)

  return { html, head }
}

import { renderToString } from 'vue/server-renderer'
import { createApp } from './main'
import { createHead } from '@unhead/vue/server'
import { useSeoMeta } from '@unhead/vue'

export async function render(_url: string) {
  const { app } = createApp()
  const head = createHead()
  app.use(head)
  // no client-side hydration needed
  useSeoMeta({
    title: 'My Awesome Site',
    description: 'My awesome site description',
  }, { head })
  const ctx = {}
  const html = await renderToString(app, ctx)

  return { html, head }
}

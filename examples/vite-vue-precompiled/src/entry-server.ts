import { renderToString } from 'vue/server-renderer'
import type { SSRHeadPayload } from 'unhead/types'
import { createHead, renderSSRHead } from '@unhead/vue/precompiled/server'
import { createApp } from './app'

export async function render(_url: string): Promise<{ html: string, payload: SSRHeadPayload }> {
  const app = createApp()
  const head = createHead({ disableDefaults: true })
  app.use(head)

  const html = await renderToString(app)
  const payload = renderSSRHead(head)

  return { html, payload }
}

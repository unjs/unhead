import { createHead, useHead } from '@unhead/vue'
import { createSSRApp, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { renderSSRHead } from '@unhead/ssr'
import { describe, it } from 'vitest'

describe('vue ssr asyncSetup', () => {
  it('basic', async () => {
    const head = createHead()
    const app = createSSRApp({
      async setup() {
        const title = ref('initial title')
        useHead({
          title,
        })
        await new Promise(resolve => setTimeout(resolve, 200))
        title.value = 'new title'
        return () => '<div>hi</div>'
      },
    })
    app.use(head)
    await renderToString(app)

    const { headTags } = await renderSSRHead(head, {
      appendHash: false,
    })
    expect(headTags).eq('<title>new title</title>')
  })
})

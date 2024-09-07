import { renderSSRHead } from '@unhead/ssr'
import { createHead, useHead } from '@unhead/vue'
import { renderToString } from '@vue/server-renderer'
import { describe, it } from 'vitest'
import { createSSRApp, ref } from 'vue'

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

    const { headTags } = await renderSSRHead(head)
    expect(headTags).eq('<title>new title</title>')
  })
})

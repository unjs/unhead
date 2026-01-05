import type { SerializableHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { injectHead } from '@unhead/vue'
import { createHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { createSSRApp, ref } from 'vue'

describe('vue ssr custom augmentation', () => {
  it('link auto-completion', async () => {
    interface CustomHead extends SerializableHead {
      title: string
      link: ({
        ['data-test']: any
        href: 'link-one' | 'link/two' | 'link/number/three'
        CUSTOM_FIELD: 10
      })[]
    }

    const head = createHead({
      disableDefaults: true,
    })
    const app = createSSRApp({
      setup() {
        const title = ref('')
        const head = injectHead()
        const f = {
          title: 'foo',
          link: [
            {
              'data-test': () => 'test',
              'href': 'link/two',
              'CUSTOM_FIELD': 10,
            },
          ],
        } satisfies CustomHead
        head.push(f)
        title.value = 'hello'
        return () => '<div>hi</div>'
      },
    })
    app.use(head)
    await renderToString(app)

    const headResult = renderSSRHead(head)
    expect(headResult.headTags).toMatchInlineSnapshot(
      `
      "<title>foo</title>
      <link data-test="test" href="link/two" CUSTOM_FIELD="10">"
    `,
    )
  })
})

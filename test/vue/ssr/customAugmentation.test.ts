import { renderSSRHead } from '@unhead/ssr'
import { createHead, useHead } from '@unhead/vue'
import { renderToString } from '@vue/server-renderer'
import { createSSRApp, ref } from 'vue'
import type { MergeHead } from '@unhead/schema'

describe('vue ssr custom augmentation', () => {
  it('link auto-completion', async () => {
    interface CustomHead extends MergeHead {
      link: {
        href: 'link-one' | 'link/two' | 'link/number/three'
        CUSTOM_FIELD: 10
      }
    }

    const head = createHead<CustomHead>()
    const app = createSSRApp({
      setup() {
        const title = ref('')
        useHead<CustomHead>({
          title: title.value,
          link: [
            {
              'data-test': () => 'test',
              'href': 'link-one',
              'CUSTOM_FIELD': 10,
            },
          ],
        })
        title.value = 'hello'
        return () => '<div>hi</div>'
      },
    })
    app.use(head)
    await renderToString(app)

    const headResult = await renderSSRHead(head)
    expect(headResult.headTags).toMatchInlineSnapshot(
      `"<link data-test="test" href="link-one" CUSTOM_FIELD="10">"`,
    )
  })
})

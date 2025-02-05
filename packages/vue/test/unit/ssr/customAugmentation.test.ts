import type { MergeHead } from '@unhead/schema'
import { renderSSRHead } from '@unhead/ssr'
import { useHead } from '@unhead/vue'
import { createHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { createSSRApp, ref } from 'vue'

describe('vue ssr custom augmentation', () => {
  it('link auto-completion', async () => {
    interface CustomHead extends MergeHead {
      link: {
        href: 'link-one' | 'link/two' | 'link/number/three'
        CUSTOM_FIELD: 10
      }
    }

    const head = createHead<CustomHead>({
      disableDefaults: true,
    })
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

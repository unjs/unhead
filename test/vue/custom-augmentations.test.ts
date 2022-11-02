import { createSSRApp, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import type { MergeHead } from '@zhead/schema'
import { createHead, renderHeadToString, useHead } from '../src'

describe('custom augmentation', () => {
  test('link auto-completion', async () => {
    interface CustomHead extends MergeHead {
      link: {
        href: 'link-one' | 'link/two' | 'link/number/three'
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
            },
          ],
        })
        title.value = 'hello'
        return () => '<div>hi</div>'
      },
    })
    app.use(head)
    await renderToString(app)

    const headResult = await renderHeadToString(head)
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title></title><link data-test=\\"test\\" href=\\"link-one\\"><meta name=\\"head:count\\" content=\\"1\\">"',
    )
  })
})

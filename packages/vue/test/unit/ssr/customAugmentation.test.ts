import { renderSSRHead } from '@unhead/ssr'
import { injectHead } from '@unhead/vue'
import { createHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { createSSRApp, ref } from 'vue'

describe('vue ssr custom augmentation', () => {
  it('link auto-completion', async () => {
    const head = createHead({
      disableDefaults: true,
    })
    const app = createSSRApp({
      setup() {
        const title = ref('')
        const head = injectHead()
        head.push({
          title: 'foo',
          link: [
            // Non-standard link attributes require a type cast via GenericLink or as any.
            // At runtime, unhead serializes all provided attributes to the DOM.
            {
              'data-test': () => 'test',
              'rel': 'stylesheet',
              'href': 'link/two',
              'CUSTOM_FIELD': 10,
            } as any,
          ],
        })
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
      <link data-test="test" rel="stylesheet" href="link/two" custom_field="10">"
    `,
    )
  })
})

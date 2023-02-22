import { describe, it } from 'vitest'
import { ref } from 'vue'
import { ssrRenderOptionsHead } from '../util'

describe('ssr vue templateParams', () => {
  it('basic', async () => {
    const separator = ref('/')

    const headResult = await ssrRenderOptionsHead({
      title: 'hello world',
      titleTemplate: '%s %separator %siteName',
      meta: [
        {
          name: 'description',
          content: 'Welcome to %siteName!',
        },
      ],
      templateParams: {
        separator,
        siteName: () => 'My Awesome Site',
      },
    })

    expect(headResult).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>hello world &#x2F; My Awesome Site</title>
      <meta name=\\"description\\" content=\\"Welcome to My Awesome Site!\\">",
        "htmlAttrs": "",
      }
    `)
  })
})

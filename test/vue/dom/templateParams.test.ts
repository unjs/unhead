import { describe, it } from 'vitest'
import { createHead, useHead } from '@unhead/vue'
import { renderDOMHead } from '@unhead/dom'
import { ref } from 'vue'
import { useDom } from '../../fixtures'

describe('vue templateParams', () => {
  it('basic', async () => {
    const dom = useDom()
    const head = createHead()

    const separator = ref('/')

    useHead({
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

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <title>hello world / My Awesome Site</title><meta name=\\"description\\" content=\\"Welcome to My Awesome Site!\\"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

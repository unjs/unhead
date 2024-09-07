import { renderDOMHead } from '@unhead/dom'
import { createHead, setHeadInjectionHandler, useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { ref } from 'vue'
import { useDom } from '../../fixtures'

describe('vue templateParams', () => {
  it('basic', async () => {
    const dom = useDom()
    const head = createHead()
    setHeadInjectionHandler(() => head)

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

      <title>hello world / My Awesome Site</title><meta name="description" content="Welcome to My Awesome Site!"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('nuxt/nuxt issue #22363', async () => {
    const dom = useDom()
    const head = createHead()
    setHeadInjectionHandler(() => head)

    const separator = ref('/')

    useHead({
      title: 'XYZ training, certification and compliance for $17.95',
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

      <title>XYZ training, certification and compliance for $17.95 / My Awesome Site</title><meta name="description" content="Welcome to My Awesome Site!"></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

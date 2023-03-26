import { describe, it } from 'vitest'
import type { ReactiveHead } from '@unhead/vue'
import { createHead, useHead, useServerHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('vue e2e templateParams', () => {
  it('ssr / csr hydration', async () => {
    const AppSchema: ReactiveHead = {
      title: 'My app',
      titleTemplate: '%s %separator %siteName',
      templateParams: {
        separator: '-',
        siteName: 'My Awesome Site',
        nested: {
          refValue: ref('test'),
        },
      },
    }
    const IndexSchema: ReactiveHead = { title: 'Home page %nested.refValue' }
    const AboutSchema: ReactiveHead = { title: 'About page' }

    // ssr render on the index page
    const ssrHead = createHead()

    useServerHead(AppSchema)
    useHead(IndexSchema)

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Home page - My Awesome Site</title>",
        "htmlAttrs": "",
      }
    `)

    // mount client side with same data
    const dom = useDom(data)
    const csrHead = createHead({
      document: dom.window.document,
    })

    const index = csrHead.push(IndexSchema)

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.window.document.title).toBe('Home page - My Awesome Site')
    index.dispose()

    const about = csrHead.push(AboutSchema)

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <title>About page</title>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    about.dispose()

    useHead(IndexSchema)

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <title>Home page</title>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

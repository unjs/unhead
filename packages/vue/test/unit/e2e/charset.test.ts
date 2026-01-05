import type { ReactiveHead } from '@unhead/vue'
import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { useDom } from '../../../../unhead/test/fixtures'
import { csrVueAppWithUnhead, ssrVueAppWithUnhead } from '../../util'

describe('vue e2e charset', () => {
  it('ssr / csr hydration', async () => {
    const AppSchema: ReactiveHead = {
      title: 'My app',
      meta: [
        {
          charset: 'utf-8',
        },
      ],
    }

    const IndexSchema: ReactiveHead = {
      title: 'Home page',
      meta: [
        {
          charset: () => 'utf-8',
        },
      ],
    }

    const AboutSchema: ReactiveHead = {
      title: 'About page',
    }

    // ssr render on the index page
    const ssrHead = await ssrVueAppWithUnhead(() => {
      useHead(AppSchema)
      useHead(IndexSchema)
    })

    const data = renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8">
      <title>Home page</title>",
        "htmlAttrs": "",
      }
    `)

    // mount client side with same data
    const dom = useDom(data)
    const csrHead = csrVueAppWithUnhead(dom, () => {
      useHead(AppSchema)
    })
    const index = csrHead.push(IndexSchema)

    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Home page</title>
      </head>
      <body><div id="app"></div></body></html>"
    `)

    index.dispose()

    const about = csrHead.push(AboutSchema)

    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <title>About page</title>
      </head>
      <body><div id="app"></div></body></html>"
    `)

    about.dispose()

    useHead(IndexSchema, {
      head: csrHead,
    })

    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <title>Home page</title>
      <meta charset="utf-8"></head>
      <body><div id="app"></div></body></html>"
    `)
  })
})

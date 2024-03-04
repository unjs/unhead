import { describe, it } from 'vitest'
import { createHead, setHeadInjectionHandler, useSeoMeta } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('unhead vue e2e useSeoMeta', () => {
  it('duplicate articleTag', async () => {
    const ssrHead = createHead()
    setHeadInjectionHandler(() => ssrHead)
    useSeoMeta({
      articleTag: ['foo', 'bar'],
    })
    const data = await renderSSRHead(ssrHead)
    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta property="article:tag" content="foo">
      <meta property="article:tag" content="bar">",
        "htmlAttrs": "",
      }
    `)
    const dom = useDom(data)
    const csrHead = createHead()
    setHeadInjectionHandler(() => csrHead)
    const home = useSeoMeta({
      articleTag: ['foo', 'bar'],
    })
    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <meta property="article:tag" content="foo">
      <meta property="article:tag" content="bar">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    home!.dispose()
    useSeoMeta({
      articleTag: ['test'],
    })
    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <meta property="article:tag" content="test">

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

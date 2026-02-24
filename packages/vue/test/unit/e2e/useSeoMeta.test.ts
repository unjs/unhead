// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { useSeoMeta } from '@unhead/vue'
import { describe, it } from 'vitest'
import { useDom } from '../../../../unhead/test/fixtures'
import { csrVueAppWithUnhead, ssrVueAppWithUnhead } from '../../util'

describe('unhead vue e2e useSeoMeta', () => {
  it('duplicate articleTag', async () => {
    const ssrHead = await ssrVueAppWithUnhead(() => {
      useSeoMeta({
        articleTag: ['foo', 'bar'],
      })
    })
    const data = renderSSRHead(ssrHead)
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
    let home
    const csrHead = csrVueAppWithUnhead(dom, () => {
      home = useSeoMeta({
        articleTag: ['foo', 'bar'],
      })
    })
    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>
      <meta property="article:tag" content="foo">
      <meta property="article:tag" content="bar">
      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)

    home!.dispose()
    useSeoMeta({
      articleTag: ['test'],
    }, {
      head: csrHead,
    })
    renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>
      <meta property="article:tag" content="test">

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })
})

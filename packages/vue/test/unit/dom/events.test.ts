// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { csrVueAppWithUnhead, useDom } from '../../util'

describe('vue events', () => {
  it('basic', async () => {
    const dom = useDom()

    const head = csrVueAppWithUnhead(dom, () => {
      useHead({
        bodyAttrs: {
          onresize: () => {},
        },
      })

      useHead({
        bodyAttrs: {
          onresize: () => {},
        },
      })
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body data-onresize=""><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })
})

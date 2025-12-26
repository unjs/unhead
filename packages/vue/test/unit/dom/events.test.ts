// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { useDom } from '../../../../unhead/test/fixtures'
import { csrVueAppWithUnhead } from '../../util'

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

    renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })
})

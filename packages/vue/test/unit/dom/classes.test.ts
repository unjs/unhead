// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { computed, ref } from 'vue'
import { useDom } from '../../../../unhead/test/fixtures'
import { csrVueAppWithUnhead } from '../../util'

describe('vue dom classes', () => {
  it('empty class', async () => {
    const dom = useDom()

    const isNavActive = ref(false)
    const head = csrVueAppWithUnhead(dom, () => {
      useHead({
        bodyAttrs: {
          class: computed(() => {
            return isNavActive.value ? 'active-navbar-body' : ''
          }),
        },
      })
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)

    isNavActive.value = true

    // wait 100ms
    await new Promise(resolve => setTimeout(resolve, 100))
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body class="active-navbar-body"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })
})

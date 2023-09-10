import { describe, it } from 'vitest'
import { createHead, setHeadInjectionHandler, useHead } from '@unhead/vue'
import { computed, ref } from 'vue'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('vue dom classes', () => {
  it('empty class', async () => {
    const dom = useDom()

    const head = createHead({ document: dom.window.document })
    setHeadInjectionHandler(() => head)

    const isNavActive = ref(false)

    useHead({
      bodyAttrs: {
        class: computed(() => {
          return isNavActive.value ? 'active-navbar-body' : ''
        }),
      },
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    isNavActive.value = true

    // wait 100ms
    await new Promise(resolve => setTimeout(resolve, 100))
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body class=\\"active-navbar-body\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

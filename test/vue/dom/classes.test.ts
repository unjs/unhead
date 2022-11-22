import {describe, it} from "vitest";
import {createHead, useHead} from "@unhead/vue";
import {computed, ref} from "vue";
import {useDom} from "../../fixtures";
import {renderDOMHead} from "@unhead/dom";

describe('vue dom classes', () => {
  it('empty class', async () => {
    const dom = useDom()

    const head = createHead({ document: dom.window.document })

    const isNavActive = ref(false)

    useHead({
      bodyAttrs: {
        class: computed(() => {
          return isNavActive.value ? 'active-navbar-body' : ''
        })
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
    console.log('ref updated', isNavActive.value)

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

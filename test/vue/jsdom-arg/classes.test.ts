import { describe, it } from 'vitest'
import { createHead, useHead } from '@unhead/vue'
import {computed, defineComponent, nextTick, ref, onMounted} from 'vue'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'
import {mount} from "../util";

describe('vue dom classes', () => {
  it('empty class', async () => {
    const dom = useDom()

    const head = createHead({ document: dom.window.document })

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

  it('reactive string class', async () => {
    const dom = useDom()

    const Comp1 = defineComponent({
      setup() {
        const theme = ref('dark')

        useHead({
          htmlAttrs: {
            class: theme
          }
        })

        onMounted(() => {
          theme.value = 'light'
        })
      },
      render() {
        return '<h1>home</h1>'
      },
    })

    const app = mount(Comp1, () => ({ head: createHead({ document: dom.window.document }) }))
    await nextTick()
    expect(await app.head.resolveTags()).toMatchInlineSnapshot()
  })
})

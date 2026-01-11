// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { computed, onMounted, ref } from 'vue'
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

    renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)

    isNavActive.value = true

    // wait 100ms
    await new Promise(resolve => setTimeout(resolve, 100))
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body class="active-navbar-body"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })

  it('toggle class in onMounted - removes loading class', async () => {
    const dom = useDom()
    // simulate SSR hydration scenario - body already has loading class
    dom.window.document.body.className = 'loading'

    const isLoaded = ref(false)
    const head = csrVueAppWithUnhead(dom, () => {
      useHead({
        bodyAttrs: {
          class: computed(() => {
            return !isLoaded.value ? 'loading' : ''
          }),
        },
      })
      // this runs synchronously during component setup, before renderDOMHead
      onMounted(() => {
        isLoaded.value = true
      })
    })

    // wait for Vue's effect queue to flush
    await new Promise(resolve => setTimeout(resolve, 0))

    // first render - the patch from onMounted happened BEFORE this
    renderDOMHead(head, { document: dom.window.document })

    // bug: class should be '' but might still be 'loading' if patch was lost
    expect(dom.window.document.body.className).toBe('')
  })

  it('explicit patch before render - removes class', async () => {
    const dom = useDom()
    dom.window.document.body.className = 'loading'

    let entry: ReturnType<typeof useHead>
    const head = csrVueAppWithUnhead(dom, () => {
      entry = useHead({
        bodyAttrs: {
          class: 'loading',
        },
      })
    })

    // Explicitly patch before first render
    entry!.patch({ bodyAttrs: { class: '' } })

    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.body.className).toBe('')
  })
})

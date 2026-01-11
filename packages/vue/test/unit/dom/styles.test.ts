// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { computed, ref } from 'vue'
import { useDom } from '../../../../unhead/test/fixtures'
import { csrVueAppWithUnhead, ssrVueAppWithUnhead } from '../../util'

describe('vue dom styles', () => {
  it('empty style', async () => {
    const dom = useDom()
    const isNavActive = ref(false)

    const head = csrVueAppWithUnhead(dom, () => {
      useHead({
        bodyAttrs: {
          style: computed(() => {
            return isNavActive.value ? 'background-color: red' : ''
          }),
        },
      })
    })

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.body.getAttribute('style')).toEqual(null)
    isNavActive.value = true

    // wait 100ms
    await new Promise(resolve => setTimeout(resolve, 100))
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.body.getAttribute('style')).toEqual('background-color: red;')
  })
  it('url style', async () => {
    const dom = useDom()

    const head = csrVueAppWithUnhead(dom, () => {
      useHead({
        bodyAttrs: {
          style: '--cover-image: url(\'https://example-url-to-image.com\')',
        },
      })
    })

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.body.getAttribute('style')).toEqual('--cover-image: url(\'https://example-url-to-image.com\');')
  })
  it('array style', async () => {
    const dom = useDom()

    const head = csrVueAppWithUnhead(dom, () => {
      useHead({
        bodyAttrs: {
          style: [
            'background-color: red',
            'color: white',
          ],
        },
      })
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.body.getAttribute('style')).toEqual(`background-color: red; color: white;`)
  })
  it('object style', async () => {
    const dom = useDom()
    const isNavActive = ref(false)
    const head = csrVueAppWithUnhead(dom, () => {
      useHead({
        bodyAttrs: {
          style: {
            'color': 'white',
            'background-color': () => isNavActive.value ? 'red' : '',
          },
        },
      })
    })

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.body.getAttribute('style')).toEqual('color: white;')

    isNavActive.value = true

    // wait 100ms
    await new Promise(resolve => setTimeout(resolve, 100))
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.body.getAttribute('style')).toEqual('color: white; background-color: red;')
  })

  // Issue #530 - demonstrates working reactivity with functions
  it('style tag reactive update undefined to value', async () => {
    const dom = useDom()
    const styles = ref('')

    csrVueAppWithUnhead(dom, () => {
      useHead({
        style: [
          () => {
            if (!styles.value)
              return undefined
            return {
              key: 'reactive-styles',
              innerHTML: styles.value,
            }
          },
        ],
      })
    })

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(dom.window.document.querySelector('style[data-hid="reactive-styles"]')).toBeNull()

    styles.value = '.test { color: red; }'
    await new Promise(resolve => setTimeout(resolve, 50))

    const styleEl = dom.window.document.querySelector('style[data-hid="reactive-styles"]')
    expect(styleEl).not.toBeNull()
    expect(styleEl?.innerHTML).toBe('.test { color: red; }')
  })

  // Issue #530 - SSR hydration then toggle empty -> value
  it('ssr hydration toggle empty to value', async () => {
    const ssrHead = await ssrVueAppWithUnhead(() => {
      useHead({
        style: [{ key: 'toggle-styles', innerHTML: '.ssr { color: blue; }' }],
      })
    })

    const dom = useDom(renderSSRHead(ssrHead))
    const styles = ref('.ssr { color: blue; }')

    csrVueAppWithUnhead(dom, () => {
      useHead({
        style: [
          () => styles.value ? { key: 'toggle-styles', innerHTML: styles.value } : undefined,
        ],
      })
    })

    await new Promise(resolve => setTimeout(resolve, 50))
    expect(dom.window.document.querySelector('style[data-hid="toggle-styles"]')?.innerHTML).toBe('.ssr { color: blue; }')

    styles.value = ''
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(dom.window.document.querySelector('style[data-hid="toggle-styles"]')).toBeNull()

    styles.value = '.new { color: red; }'
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(dom.window.document.querySelector('style[data-hid="toggle-styles"]')?.innerHTML).toBe('.new { color: red; }')
  })
})

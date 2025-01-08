// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { computed, ref } from 'vue'
import { useDom } from '../../../../test/fixtures'
import { csrVueAppWithUnhead } from '../util'

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
})

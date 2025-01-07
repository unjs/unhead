// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { ref } from 'vue'
import { useDom } from '../../../../test/fixtures'
import { csrVueAppWithUnhead } from '../util'

describe('vue templateParams', () => {
  it('basic', async () => {
    const dom = useDom()
    const head = csrVueAppWithUnhead(dom, () => {
      const separator = ref('/')

      useHead({
        title: 'hello world',
        titleTemplate: '%s %separator %siteName',
        meta: [
          {
            name: 'description',
            content: 'Welcome to %siteName!',
          },
        ],
        templateParams: {
          separator,
          siteName: () => 'My Awesome Site',
        },
      })
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      <title>hello world / My Awesome Site</title><meta name="description" content="Welcome to My Awesome Site!"></head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })

  it('nuxt/nuxt issue #22363', async () => {
    const dom = useDom()
    const head = csrVueAppWithUnhead(dom, () => {
      const separator = ref('/')

      useHead({
        title: 'XYZ training, certification and compliance for $17.95',
        titleTemplate: '%s %separator %siteName',
        meta: [
          {
            name: 'description',
            content: 'Welcome to %siteName!',
          },
        ],
        templateParams: {
          separator,
          siteName: () => 'My Awesome Site',
        },
      })
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      <title>XYZ training, certification and compliance for $17.95 / My Awesome Site</title><meta name="description" content="Welcome to My Awesome Site!"></head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })
})

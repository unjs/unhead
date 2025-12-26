// @vitest-environment jsdom

import { describe, it } from 'vitest'
import { ref } from 'vue'
import { useDom } from '../../../../unhead/test/fixtures'
import { useHeadSafe } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { csrVueAppWithUnhead } from '../../util'

describe('vue dom useHeadSafe', () => {
  it('basic', async () => {
    const dom = useDom()
    const head = csrVueAppWithUnhead(dom, () => {
      useHeadSafe({
        htmlAttrs: {
          lang: 'en',
          dir: 'ltr',
        },
        bodyAttrs: {
          class: 'dark',
        },
        script: [
          {
            // @ts-expect-error intentionally invalid
            src: 'https://cdn.example.com/script.js',
          },
        ],
        meta: [
          {
            charset: 'utf-8',
          },
        ],
        link: [
          {
            rel: 'icon',
            type: 'image/x-icon',
            href: 'https://cdn.example.com/favicon.ico',
          },
        ],
      })

      useHeadSafe({
        bodyAttrs: {
          // @ts-expect-error intentionally invalid
          'onresize': ref('alert(1)'),
          'data-bar': 'foo',
        },
        link: [
          {
            'rel': 'icon',
            'href': '/valid.png',
            'data-bar': 'foo',
          },
          {
            rel: 'icon',
            href: () => 'alert(1)',
          },
          {
            'rel': 'stylesheet',
            'href': 'https://cdn.example.com/style.css',
            'data-bar': 'foo',
          },
        ],
        style: [
          {
            // @ts-expect-error not allowed
            'innerHTML': 'body { background: url("javascript:alert(1)") }',
            'data-foo': 'bar',
          },
        ],
        script: () => [
          {
            src: 'https://cdn.example.com/script.js',
            onload: 'alert(1)',
          },
          {
            'innerHTML': 'alert(1)',
            // 'textContent': { value: 'alert(1)' }, // Breaks tests
            'data-foo': 'test',
          },
        ],
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

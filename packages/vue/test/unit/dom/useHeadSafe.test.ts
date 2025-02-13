// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { useHeadSafe } from '@unhead/vue'
import { describe, it } from 'vitest'
import { ref } from 'vue'
import { basicSchema, useDom } from '../../../../unhead/test/fixtures'
import { csrVueAppWithUnhead } from '../../util'

describe('vue dom useHeadSafe', () => {
  it('basic', async () => {
    const dom = useDom()
    const head = csrVueAppWithUnhead(dom, () => {
      // @ts-expect-error intentionally invalid
      useHeadSafe(basicSchema)

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
            'innerHTML': 'body { background: url("javascript:alert(1)") }',
            'data-foo': 'bar',
          },
        ],
        // @ts-expect-error intentionally invalid
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

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html lang="en" dir="ltr"><head>

      <meta charset="utf-8"><link href="https://cdn.example.com/favicon.ico" rel="icon" type="image/x-icon"><link data-bar="foo" href="/valid.png" rel="icon"><link href="alert(1)" rel="icon"></head>
      <body class="dark" data-bar="foo"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })
})

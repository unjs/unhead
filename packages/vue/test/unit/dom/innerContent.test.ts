// @vitest-environment jsdom

import { renderDOMHead } from '@unhead/dom'
import { createHead } from '@unhead/vue/client'
import { describe, it } from 'vitest'
import { useDom } from '../../util'

describe('vue dom innerContent', () => {
  it('update innerHtml', async () => {
    const head = createHead()

    const entry = head.push({
      script: [
        {
          innerHTML: 'console.log(\'hello\')',
        },
      ],
    })

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      <script>console.log('hello')</script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>


      </body></html>"
    `)

    entry.patch({
      script: [
        {
          innerHTML: 'console.log(\'hello world\')',
        },
      ],
    })

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      <script>console.log('hello world')</script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>


      </body></html>"
    `)

    entry.dispose()

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>


      </body></html>"
    `)
  })
})

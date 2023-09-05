import { describe, it } from 'vitest'
import { createHead, setHeadInjectionHandler } from '@unhead/vue'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('vue dom innerContent', () => {
  it('update innerHtml', async () => {
    const head = createHead()
    setHeadInjectionHandler(() => head)

    const entry = head.push({
      script: [
        {
          children: 'console.log(\'hello\')',
        },
      ],
    })

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

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
          children: 'console.log(\'hello world\')',
        },
      ],
    })

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

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
      "<!DOCTYPE html><html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

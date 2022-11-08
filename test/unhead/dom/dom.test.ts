import { describe, it } from 'vitest'
import { createHead } from 'unhead'
import { renderDOMHead } from '@unhead/dom'
import { basicSchema, useDom } from '../../fixtures'

describe('dom', () => {
  it('basic', async () => {
    const head = createHead()

    head.push(basicSchema)

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.documentElement.outerHTML).toMatchInlineSnapshot(`
      "<html lang=\\"en\\" dir=\\"ltr\\"><head>

      <meta charset=\\"utf-8\\"><script src=\\"https://cdn.example.com/script.js\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\"></head>
      <body class=\\"dark\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('boolean attributes respected', async () => {
    const head = createHead()

    head.push({
      script: [
        {
          defer: true,
          async: false,
          src: 'https://cdn.example.com/script.js',
        },
      ],
    })

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.documentElement.outerHTML).toMatchInlineSnapshot(`
      "<html><head>

      <script defer=\\"\\" src=\\"https://cdn.example.com/script.js\\"></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

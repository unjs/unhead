import { HydratesStatePlugin, createHead } from 'unhead'
import { describe, it } from 'vitest'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('dom', () => {
  it('basic', async () => {
    const head = createHead({
      plugins: [
        HydratesStatePlugin(),
      ],
    })

    const entry = head.push({
      meta: [
        {
          name: 'description',
          content: 'desc',
        },
        {
          name: 'description',
          content: 'desc 2',
        },
      ],
    })

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <meta name=\\"description\\" content=\\"desc\\" data-h-889faf=\\"\\"><meta name=\\"description\\" content=\\"desc 2\\" data-h-889faf1=\\"\\"></head>
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

import { describe, it } from 'vitest'
import { renderDOMHead } from '@unhead/dom'
import { basicSchema } from '../../fixtures'
import { activeDom, useDOMHead, useDelayedSerializedDom } from '../dom/util'

describe('hooks', () => {
  it('delay dom', async () => {
    let isDomPaused = true
    const head = useDOMHead({
      hooks: {
        dom: {
          beforeRender(ctx) {
            ctx.shouldRender = !isDomPaused
          },
        },
      },
    })

    head.push(basicSchema)
    // even try a force render
    await renderDOMHead(head, { document: activeDom!.window.document })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    isDomPaused = false
    await renderDOMHead(head, { document: activeDom!.window.document })
    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"en\\" dir=\\"ltr\\"><head>

      <meta charset=\\"utf-8\\"><script src=\\"https://cdn.example.com/script.js\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\"></head>
      <body class=\\"dark\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

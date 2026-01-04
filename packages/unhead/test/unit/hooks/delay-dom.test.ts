import { renderDOMHead } from '@unhead/dom'
import { describe, it } from 'vitest'
import { activeDom, basicSchema, useDelayedSerializedDom, useDOMHead } from '../../util'

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
    renderDOMHead(head, { document: activeDom!.window.document })

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
    renderDOMHead(head, { document: activeDom!.window.document })
    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang="en" dir="ltr"><head>

      <script src="https://cdn.example.com/script.js"></script><meta charset="utf-8"><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

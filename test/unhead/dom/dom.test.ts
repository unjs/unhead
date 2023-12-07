import { describe, it } from 'vitest'
import { useHead } from 'unhead'
import { basicSchema } from '../../fixtures'
import { useDOMHead, useDelayedSerializedDom } from './util'

describe('dom', () => {
  it('basic', async () => {
    useDOMHead()

    useHead(basicSchema)

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang="en" dir="ltr"><head>

      <meta charset="utf-8"><script src="https://cdn.example.com/script.js"></script><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('boolean attributes respected', async () => {
    const head = useDOMHead()

    head.push({
      script: [
        {
          defer: true,
          async: false,
          src: 'https://cdn.example.com/script.js',
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      <script defer="" src="https://cdn.example.com/script.js"></script></head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

import { describe, expect, it } from 'vitest'
import { useHead } from '../../../src'
import { basicSchema, useDelayedSerializedDom, useDOMHead } from '../../util'

describe('dom', () => {
  it('renders numeric zero meta content', async () => {
    const head = useDOMHead()

    head.push({
      meta: [{ name: 'numeric-zero', content: 0 }],
    })

    expect(await useDelayedSerializedDom()).toContain('<meta name="numeric-zero" content="0">')
  })

  it('renders a numeric zero title', async () => {
    const head = useDOMHead()

    head.push({
      title: 0,
    })

    await useDelayedSerializedDom()
    expect(head.resolvedOptions.document?.title).toBe('0')
  })

  it('basic', async () => {
    const head = useDOMHead()

    useHead(head, basicSchema)

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

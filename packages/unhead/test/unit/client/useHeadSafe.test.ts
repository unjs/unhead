import { describe, it } from 'vitest'
import { useHeadSafe } from '../../../src'
import { basicSchema, useDelayedSerializedDom, useDOMHead } from '../../util'

describe('dom useHeadSafe', () => {
  it('basic', async () => {
    const head = useDOMHead()

    useHeadSafe(head, basicSchema)

    useHeadSafe(head, {
      bodyAttrs: {
        // @ts-expect-error intentional ts error
        onresize: 'alert(1)',
      },
      link: [
        {
          rel: 'icon',
          href: 'javascript:alert(1)',
        },
        {
          rel: 'stylesheet',
          href: 'https://cdn.example.com/style.css',
        },
      ],
      style: [
        {
          textContent: 'body { background: url("javascript:alert(1)") }',
        },
      ],
      script: [
        {
          // @ts-expect-error intentional ts error
          src: 'https://cdn.example.com/script.js',
          onload: 'alert(1)',
        },
        {
          textContent: { value: 'alert(1)' },
          type: 'application/json',
        },
        {
          innerHTML: 'alert(1)',
        },
      ],
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang="en" dir="ltr"><head>

      <meta charset="utf-8"><link href="https://cdn.example.com/style.css" rel="stylesheet"><link href="https://cdn.example.com/favicon.ico" rel="icon" type="image/x-icon"><script type="application/json">{"value":"alert(1)"}</script></head>
      <body class="dark">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

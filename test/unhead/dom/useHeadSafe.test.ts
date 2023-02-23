import { describe, it } from 'vitest'
import { useHeadSafe } from 'unhead'
import { basicSchema } from '../../fixtures'
import { useDOMHead, useDelayedSerializedDom } from './util'

describe('dom useHeadSafe', () => {
  it('basic', async () => {
    useDOMHead()

    useHeadSafe(basicSchema)

    useHeadSafe({
      bodyAttrs: {
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
          innerHTML: 'body { background: url("javascript:alert(1)") }',
        }
      ],
      script: [
        {
          src: 'https://cdn.example.com/script.js',
          onload: 'alert(1)',
        },
        {
          innerHTML: 'alert(1)',
          textContent: { value: 'alert(1)' },
        }
      ]
    })

    expect(await useDelayedSerializedDom()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"en\\" dir=\\"ltr\\"><head>

      <meta charset=\\"utf-8\\"><link href=\\"https://cdn.example.com/favicon.ico\\" rel=\\"icon\\" type=\\"image/x-icon\\"><script>{\\"value\\":\\"alert(1)\\"}</script></head>
      <body class=\\"dark\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

import { describe, it } from 'vitest'
import { useHeadSafe } from 'unhead'
import { createHead } from '@unhead/vue'
import { renderDOMHead } from '@unhead/dom'
import { ref } from 'vue'
import { basicSchema, useDom } from '../../fixtures'

describe('vue dom useHeadSafe', () => {
  it('basic', async () => {
    const dom = useDom()
    const head = createHead()

    useHeadSafe(basicSchema)

    useHeadSafe({
      bodyAttrs: {
        onresize: ref('alert(1)'),
      },
      link: [
        {
          rel: 'icon',
          href: () => 'javascript:alert(1)',
        },
        {
          rel: 'stylesheet',
          href: 'https://cdn.example.com/style.css',
        },
      ],
      style: [
        {
          innerHTML: 'body { background: url("javascript:alert(1)") }',
        },
      ],
      script: () => [
        {
          src: 'https://cdn.example.com/script.js',
          onload: 'alert(1)',
        },
        {
          innerHTML: 'alert(1)',
          textContent: { value: 'alert(1)' },
        },
      ],
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
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

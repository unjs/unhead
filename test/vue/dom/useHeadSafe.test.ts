import { describe, it } from 'vitest'
import { useHeadSafe } from 'unhead'
import { createHead, setHeadInjectionHandler } from '@unhead/vue'
import { renderDOMHead } from '@unhead/dom'
import { ref } from 'vue'
import { basicSchema, useDom } from '../../fixtures'

describe('vue dom useHeadSafe', () => {
  it('basic', async () => {
    const dom = useDom()
    const head = createHead()
    setHeadInjectionHandler(() => head)

    useHeadSafe(basicSchema)

    useHeadSafe({
      bodyAttrs: {
        onresize: ref('alert(1)'),
        ['data-bar']: 'foo',
      },
      link: [
        {
          rel: 'icon',
          href: '/valid.png',
          'data-bar': 'foo',
        },
        {
          rel: 'icon',
          href: () => 'javascript:alert(1)',
        },
        {
          rel: 'stylesheet',
          href: 'https://cdn.example.com/style.css',
          'data-bar': 'foo',
        },
      ],
      style: [
        {
          innerHTML: 'body { background: url("javascript:alert(1)") }',
          'data-foo': 'bar',
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
          ['data-foo']: 'test'
        },
      ],
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"en\\" dir=\\"ltr\\"><head>

      <meta charset=\\"utf-8\\"><link href=\\"https://cdn.example.com/favicon.ico\\" rel=\\"icon\\" type=\\"image/x-icon\\"><link data-bar=\\"foo\\" href=\\"/valid.png\\" rel=\\"icon\\"><script data-foo=\\"test\\">{\\"value\\":\\"alert(1)\\"}</script></head>
      <body class=\\"dark\\" data-bar=\\"foo\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

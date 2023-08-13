import { describe, it } from 'vitest'
import { ref } from 'vue'
import { createHead, useHead } from '@unhead/vue'
import { renderDOMHead } from '@unhead/dom'
import { basicSchema, useDom } from '../../fixtures'

describe('vue dom', () => {
  it('basic ref', async () => {
    const dom = useDom()
    const head = createHead({
      document: dom.window.document,
    })

    const lang = ref('de')

    useHead(basicSchema)

    useHead({
      htmlAttrs: {
        lang: lang.value,
      },
    })

    await renderDOMHead(head)

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"de\\" dir=\\"ltr\\"><head>

      <meta charset=\\"utf-8\\"><script src=\\"https://cdn.example.com/script.js\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\"></head>
      <body class=\\"dark\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('update', async () => {
    const dom = useDom()
    const head = createHead({
      document: dom.window.document,
    })
    const lang = ref('de')

    useHead(basicSchema)

    const pageSchema = useHead({
      htmlAttrs: {
        'class': 'pre-update',
        'lang': lang.value,
        'data-something-to-remove': 'test',
      },
    })

    await renderDOMHead(head)
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"de\\" dir=\\"ltr\\" class=\\"pre-update\\" data-something-to-remove=\\"test\\"><head>

      <meta charset=\\"utf-8\\"><script src=\\"https://cdn.example.com/script.js\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\"></head>
      <body class=\\"dark\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    lang.value = 'en'

    pageSchema.patch({
      htmlAttrs: {
        class: 'post-update',
        lang: lang.value,
      },
      bodyAttrs: {
        class: 'test',
      },
    })

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"en\\" dir=\\"ltr\\" class=\\"post-update\\"><head>

      <meta charset=\\"utf-8\\"><script src=\\"https://cdn.example.com/script.js\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\"></head>
      <body class=\\"dark test\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('dispose', async () => {
    const head = createHead()

    const entry = head.push(basicSchema)

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"en\\" dir=\\"ltr\\"><head>

      <meta charset=\\"utf-8\\"><script src=\\"https://cdn.example.com/script.js\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\"></head>
      <body class=\\"dark\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    entry.dispose()

    expect(head.headEntries()).toMatchInlineSnapshot('[]')

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body class=\\"\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('update + dispose', async () => {
    const head = createHead()

    const entry = head.push(basicSchema)

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"en\\" dir=\\"ltr\\"><head>

      <meta charset=\\"utf-8\\"><script src=\\"https://cdn.example.com/script.js\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\"></head>
      <body class=\\"dark\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    entry.patch({
      htmlAttrs: {
        lang: 'de',
        dir: 'rtl',
      },
      bodyAttrs: {
        class: ['test'],
      },
      script: [
        {
          children: 'console.log(\'hello\')',
          tagPosition: 'bodyClose',
        },
      ],
    })

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"de\\" dir=\\"rtl\\"><head>

      </head>
      <body class=\\"test\\">

      <div>
      <h1>hello world</h1>
      </div>



      <script>console.log('hello')</script></body></html>"
    `)

    entry.dispose()

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body class=\\"\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

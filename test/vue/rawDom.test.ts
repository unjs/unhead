import { describe, it } from 'vitest'
import { ref } from 'vue'
import { createHead } from '../../packages/vue/src'
import { useHead } from '../../packages/vue/src/runtime/client'
import { renderDOMHead } from '../../packages/unhead/src/runtime/client'
import { basicSchema, useDom } from '../fixtures'

describe('vue dom', () => {
  it('basic', async () => {
    const head = createHead()

    const lang = ref('de')

    useHead(basicSchema)

    useHead({
      htmlAttrs: {
        lang: lang.value,
      },
    })

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"de\\"><head>

      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\"><script src=\\"https://cdn.example.com/script.js\\" data-h-4bccad=\\"\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\" data-h-533738=\\"\\"></head>
      <body class=\\"dark\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('update', async () => {
    const head = createHead()

    const lang = ref('de')

    useHead(basicSchema)

    const pageSchema = head.push({
      htmlAttrs: {
        lang: lang.value,
      },
    })

    const dom = useDom()

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"de\\"><head>

      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\"><script src=\\"https://cdn.example.com/script.js\\" data-h-4bccad=\\"\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\" data-h-533738=\\"\\"></head>
      <body class=\\"dark\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    lang.value = 'en'

    pageSchema.patch({
      htmlAttrs: {
        lang: lang.value,
      },
    })

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"en\\"><head>

      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\"><script src=\\"https://cdn.example.com/script.js\\" data-h-4bccad=\\"\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\" data-h-533738=\\"\\"></head>
      <body class=\\"dark\\">

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

      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\"><script src=\\"https://cdn.example.com/script.js\\" data-h-4bccad=\\"\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\" data-h-533738=\\"\\"></head>
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

      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\"><script src=\\"https://cdn.example.com/script.js\\" data-h-4bccad=\\"\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\" data-h-533738=\\"\\"></head>
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
    })

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"de\\" dir=\\"rtl\\"><head>

      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\"><script src=\\"https://cdn.example.com/script.js\\" data-h-4bccad=\\"\\"></script><link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\" data-h-533738=\\"\\"></head>
      <body class=\\"dark\\">

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
      <body class=\\"\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

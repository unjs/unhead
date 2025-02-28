// @vitest-environment jsdom

import { setTimeout } from 'node:timers/promises'
import { describe, it } from 'vitest'
import { ref } from 'vue'
import { basicSchema, useDom } from '../../../../unhead/test/fixtures'
import { useHead } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { csrVueAppWithUnhead } from '../../util'

describe('vue dom', () => {
  it('basic ref', async () => {
    const dom = useDom()
    const head = csrVueAppWithUnhead(dom, () => {
      const lang = ref('de')

      useHead(basicSchema)

      useHead({
        htmlAttrs: {
          lang: lang.value,
        },
      })
    })

    await renderDOMHead(head, {
      document: dom.window.document,
    })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html lang="de" dir="ltr"><head>

      <meta charset="utf-8"><script src="https://cdn.example.com/script.js"></script><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })

  it('update', async () => {
    const dom = useDom()
    const lang = ref('de')
    let pageSchema
    const head = csrVueAppWithUnhead(dom, () => {
      useHead(basicSchema)

      pageSchema = useHead({
        htmlAttrs: {
          'class': 'pre-update',
          'lang': lang.value,
          'data-something-to-remove': 'test',
        },
      })
    })

    await renderDOMHead(head, {
      document: dom.window.document,
    })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html lang="de" dir="ltr" class="pre-update" data-something-to-remove="test"><head>

      <meta charset="utf-8"><script src="https://cdn.example.com/script.js"></script><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)

    lang.value = 'en'

    pageSchema!.patch({
      htmlAttrs: {
        class: 'post-update',
        lang: lang.value,
      },
      bodyAttrs: {
        class: 'test',
      },
    })

    await renderDOMHead(head, {
      document: dom.window.document,
    })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html lang="en" dir="ltr" class="post-update"><head>

      <meta charset="utf-8"><script src="https://cdn.example.com/script.js"></script><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark test"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })

  it('dispose', async () => {
    const dom = useDom()
    let entry
    const head = csrVueAppWithUnhead(dom, () => {
      entry = useHead(basicSchema)
    })

    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html lang="en" dir="ltr" class="post-update"><head>

      <meta charset="utf-8"><script src="https://cdn.example.com/script.js"></script><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)

    entry!.dispose()

    expect(head.headEntries()).toMatchInlineSnapshot('[]')

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html class="post-update"><head>

      </head>
      <body class=""><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })

  it('update + dispose', async () => {
    const dom = useDom()
    const head = csrVueAppWithUnhead(dom, () => {})

    const entry = head.push(basicSchema)

    await renderDOMHead(head, { document: dom.window.document })

    await setTimeout(500)
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html class="post-update" lang="en" dir="ltr"><head>

      <meta charset="utf-8"><script src="https://cdn.example.com/script.js"></script><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
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
          innerHTML: 'console.log(\'hello\')',
          tagPosition: 'bodyClose',
        },
      ],
    })

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html class="post-update" lang="de" dir="rtl"><head>

      </head>
      <body class="test"><div id="app" data-v-app=""><div>hello world</div></div><script>console.log('hello')</script></body></html>"
    `)

    entry.dispose()

    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html class="post-update"><head>

      </head>
      <body class=""><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })
})

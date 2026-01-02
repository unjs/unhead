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

    renderDOMHead(head, {
      document: dom.window.document,
    })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
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

    renderDOMHead(head, {
      document: dom.window.document,
    })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
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

    renderDOMHead(head, {
      document: dom.window.document,
    })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })

  it('dispose', async () => {
    const dom = useDom()
    let entry
    const head = csrVueAppWithUnhead(dom, () => {
      entry = useHead(basicSchema)
    })

    renderDOMHead(head, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)

    entry!.dispose()

    expect([...head.entries.values()]).toMatchInlineSnapshot(`[]`)

    renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>

      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })

  it('update + dispose', async () => {
    const dom = useDom()
    const head = csrVueAppWithUnhead(dom, () => {})

    const entry = head.push(basicSchema)

    renderDOMHead(head, { document: dom.window.document })

    await setTimeout(500)
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html lang="en" dir="ltr"><head>

      <script src="https://cdn.example.com/script.js"></script><meta charset="utf-8"><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
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

    renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html lang="en" dir="ltr"><head>

      <script src="https://cdn.example.com/script.js"></script><meta charset="utf-8"><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)

    entry.dispose()

    renderDOMHead(head, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html lang="en" dir="ltr"><head>

      <script src="https://cdn.example.com/script.js"></script><meta charset="utf-8"><link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico"></head>
      <body class="dark"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })
})

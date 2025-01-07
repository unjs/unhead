import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { useServerHead } from 'unhead'
import { describe, it } from 'vitest'
import { useDom } from '../../fixtures'
import { createHeadWithContext } from '../../util'

describe('e2e double-space-class-list', () => {
  it('arrays', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHeadWithContext()
    // i.e App.vue
    useServerHead({
      htmlAttrs: {
        class: 'a bunch of  different classes',
      },
      bodyAttrs: {
        class: [
          // make sure we support this, just in case
          'foo   bar  baz',
          'relative   min-h-screen',
        ],
      },
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " class="foo bar baz relative min-h-screen"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": " class="a bunch of different classes"",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHeadWithContext()
    csrHead.push({
      bodyAttrs: {
        class: [
          // make sure we support this, just in case
          'foo   bar  baz',
          'relative   min-h-screen',
        ],
      },
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html class="a bunch of different classes"><head>

      </head>
      <body class="foo bar baz relative min-h-screen">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('objects', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHeadWithContext()
    // i.e App.vue
    useServerHead({
      htmlAttrs: {
        class: {
          'a bunch of  different classes': true,
        },
      },
      bodyAttrs: {
        class: {
          'foo          bar': true,
          ' baz ': false,
        },
      },
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " class="foo bar"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": " class="a bunch of different classes"",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHeadWithContext()
    csrHead.push({
      htmlAttrs: {
        class: {
          'a bunch of  different classes': true,
        },
      },
      bodyAttrs: {
        class: {
          'foo          bar': true,
          ' baz ': false,
        },
      },
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html class="a bunch of different classes"><head>

      </head>
      <body class="foo bar">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

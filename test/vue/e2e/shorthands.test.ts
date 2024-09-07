import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { createHead, setHeadInjectionHandler, useHead } from '@unhead/vue'
import { describe, it } from 'vitest'
import { useDom } from '../../fixtures'

describe('unhead vue e2e shorthands', () => {
  it('css', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    setHeadInjectionHandler(() => ssrHead)
    // i.e App.vue
    useHead({
      style: [
        '.test { color: red; }',
      ],
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<style>.test { color: red; }</style>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead()
    csrHead.push({
      style: [
        '.test { color: red; }',
      ],
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <style>.test { color: red; }</style>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
  it('script', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    setHeadInjectionHandler(() => ssrHead)
    // i.e App.vue
    useHead({
      script: [
        'console.log(\'Hello World\')',
      ],
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script>console.log('Hello World')</script>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead()
    csrHead.push({
      script: [
        'console.log(\'Hello World\')',
      ],
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <script>console.log('Hello World')</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
  it('noscript', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    setHeadInjectionHandler(() => ssrHead)
    // i.e App.vue
    useHead({
      noscript: [
        '<iframe src="https://www.googletagmanager.com/ns.html" height="0" width="0" style="display:none;visibility:hidden"></iframe>',
      ],
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<noscript><iframe src="https://www.googletagmanager.com/ns.html" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead()
    csrHead.push({
      noscript: [
        '<iframe src="https://www.googletagmanager.com/ns.html" height="0" width="0" style="display:none;visibility:hidden"></iframe>',
      ],
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <noscript></noscript><noscript>&lt;iframe src="https://www.googletagmanager.com/ns.html" height="0" width="0" style="display:none;visibility:hidden"&gt;&lt;/iframe&gt;</noscript></head><body><iframe src="https://www.googletagmanager.com/ns.html" height="0" width="0" style="display:none;visibility:hidden"></iframe>



      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

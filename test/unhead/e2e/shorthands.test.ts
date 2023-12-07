import { describe, it } from 'vitest'
import { createHead, useHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('unhead e2e shorthands', () => {
  it('css', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    // i.e App.vue
    useHead({
      meta: [
        'shorthand test',
      ],
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
    // i.e App.vue
    useHead({
      script: [
        'console.log(\'Hello World\')',
        '/my-script.js',
        'https://example.com/script.js',
      ],
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script>console.log('Hello World')</script>
      <script>/my-script.js</script>
      <script>https://example.com/script.js</script>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead()
    csrHead.push({
      script: [
        'console.log(\'Hello World\')',
        '/my-script.js',
        'https://example.com/script.js',
      ],
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <script>console.log('Hello World')</script>
      <script>/my-script.js</script>
      <script>https://example.com/script.js</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('script 2', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    const input = {
      script: [
        {
          innerHTML: 'console.log(\'Hello World\')',
        },
      ],
    }
    // i.e App.vue
    useHead(input)

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
    csrHead.push(input)

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

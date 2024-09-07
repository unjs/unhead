import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { createHead, useHead } from 'unhead'
import { describe, it } from 'vitest'
import { useDom } from '../../fixtures'

describe('unhead e2e deduping', () => {
  it('innerHTML', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    // i.e App.vue
    useHead({
      script: [
        {
          key: 'test',
          innerHTML: 'console.log(\'will log twice\')',
        },
      ],
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script data-hid="3104ae4">console.log('will log twice')</script>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead()
    csrHead.push({
      script: [
        {
          key: 'test',
          innerHTML: 'console.log(\'will log twice\')',
        },
      ],
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <script data-hid="3104ae4">console.log('will log twice')</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('description', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    // i.e App.vue
    useHead({
      meta: [
        {
          key: 'test',
          name: 'description',
          content: 'test',
        },
      ],
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="description" content="test">",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead()
    csrHead.push({
      meta: [
        {
          key: 'test',
          name: 'description',
          content: 'test',
        },
      ],
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <meta name="description" content="test">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('innerHTML dynamic', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
    // i.e App.vue
    useHead({
      script: [
        {
          key: 'test',
          innerHTML: 'console.log(\'server log\')',
        },
      ],
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script data-hid="3104ae4">console.log('server log')</script>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <script data-hid="3104ae4">console.log('server log')</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    const csrHead = createHead()
    csrHead.push({
      script: [
        {
          key: 'test',
          innerHTML: 'console.log(\'client log\')',
        },
      ],
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <script data-hid="3104ae4">console.log('client log')</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

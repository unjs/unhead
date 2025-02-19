import { useHead } from 'unhead'
import { renderDOMHead } from 'unhead/client'
import { renderSSRHead } from 'unhead/server'
import { describe, it } from 'vitest'
import { createClientHeadWithContext, useDom } from '../../util'

describe('unhead e2e deduping', () => {
  it('innerHTML', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createClientHeadWithContext()
    // i.e App.vue
    useHead(ssrHead, {
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
        "headTags": "<script data-hid="test">console.log('will log twice')</script>",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createClientHeadWithContext()
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
      <script data-hid="test">console.log('will log twice')</script>
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
    const ssrHead = createClientHeadWithContext()
    // i.e App.vue
    useHead(ssrHead, {
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

    const csrHead = createClientHeadWithContext()
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
    const ssrHead = createClientHeadWithContext()
    // i.e App.vue
    useHead(ssrHead, {
      script: [
        {
          key: 'test',
          innerHTML: 'console.log(\'server log\')',
        },
      ],
    })

    const data = await renderSSRHead(ssrHead)

    expect(data.headTags).toMatchInlineSnapshot(`"<script data-hid="test">console.log('server log')</script>"`)

    const dom = useDom(data)

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <script data-hid="test">console.log('server log')</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    const csrHead = createClientHeadWithContext()
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
      <script data-hid="test">console.log('client log')</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('duplicate no key', async () => {
    const input = {
      style: ['this will be inserted twice'],

      // this will be inserted once
      link: [
        {
          rel: 'canonical',
          href: 'https://test.com',
        },
      ],

      meta: [
        {
          name: 'x-test',
          content: 'once',
        },
      ],
    }
    const ssrHead = createClientHeadWithContext()
    ssrHead.push(input)
    ssrHead.push(input)
    const data = await renderSSRHead(ssrHead)
    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<style>this will be inserted twice</style>
      <link rel="canonical" href="https://test.com">
      <meta name="x-test" content="once">",
        "htmlAttrs": "",
      }
    `)
    const dom = useDom(data)
    const csrHead = createClientHeadWithContext()
    csrHead.push(input)
    csrHead.push(input)
    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <style>this will be inserted twice</style>
      <link rel="canonical" href="https://test.com">
      <meta name="x-test" content="once">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

import { describe, it } from 'vitest'
import { HashHydrationPlugin, createHead, useHead, useServerHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'
import { renderDOMHead } from '@unhead/dom'
import type { Head } from '@unhead/schema'
import { useDom } from '../../fixtures'

describe('unhead e2e ssrHash', () => {
  it('basic hydration', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead({
      plugins: [
        HashHydrationPlugin(),
      ],
    })
    // i.e App.vue
    useServerHead({
      title: 'My amazing site',
      htmlAttrs: {
        lang: 'en',
      },
      script: [
        {
          src: 'https://analytics.example.com/script.js',
          defer: true,
          async: true,
        },
      ],
      meta: [
        {
          name: 'description',
          content: 'My amazing site',
        },
        {
          property: 'og:title',
          content: 'My amazing site',
        },
        {
          property: 'og:description',
          content: 'This is my amazing site',
        },
        {
          property: 'og:image',
          content: [
            'https://cdn.example.com/image.jpg',
            'https://cdn.example.com/image2.jpg',
          ],
        },
        {
          charset: 'utf-8',
        },
      ],
    })
    // i.e pages/index.vue
    const HomeHead: Head = {
      title: 'Home',
      script: [
        {
          src: 'https://my-app.com/home.js',
        },
      ],
      meta: [
        {
          property: 'og:title',
          content: 'Home',
        },
        {
          name: 'description',
          content: 'This is the home page',
        },
      ],
    }
    useHead(HomeHead)

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\">
      <title>Home</title>
      <script src=\\"https://analytics.example.com/script.js\\" defer async></script>
      <meta property=\\"og:description\\" content=\\"This is my amazing site\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image.jpg\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image2.jpg\\">
      <script src=\\"https://my-app.com/home.js\\"></script>
      <meta property=\\"og:title\\" content=\\"Home\\">
      <meta name=\\"description\\" content=\\"This is the home page\\">
      <meta name=\\"unhead:ssr\\" content=\\"f033696\\">",
        "htmlAttrs": " lang=\\"en\\"",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead({
      document: dom.window.document,
      plugins: [
        HashHydrationPlugin(),
      ],
    })
    csrHead.push(HomeHead)

    let renderingTags = false
    csrHead.hooks.hook('dom:rendered', (ctx) => {
      // renderingTags = true
      renderingTags = true
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    // didn't render any tags, we hydrated
    expect(renderingTags).toBe(false)

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"en\\"><head>
      <meta charset=\\"utf-8\\">
      <title>Home</title>
      <script src=\\"https://analytics.example.com/script.js\\" defer=\\"\\" async=\\"\\"></script>
      <meta property=\\"og:description\\" content=\\"This is my amazing site\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image.jpg\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image2.jpg\\">
      <script src=\\"https://my-app.com/home.js\\"></script>
      <meta property=\\"og:title\\" content=\\"Home\\">
      <meta name=\\"description\\" content=\\"This is the home page\\">
      <meta name=\\"unhead:ssr\\" content=\\"f033696\\">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('ssr to csr', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead({
      plugins: [
        HashHydrationPlugin(),
      ],
    })
    // i.e App.vue
    useServerHead({
      title: 'My amazing site',
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>My amazing site</title>
      <script id=\\"unhead:payload\\" type=\\"application/json\\">{\\"title\\":\\"My amazing site\\"}</script>
      <meta name=\\"unhead:ssr\\" content=\\"6f28288\\">",
        "htmlAttrs": "",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead({
      document: dom.window.document,
      plugins: [
        HashHydrationPlugin(),
      ],
    })
    csrHead.push({
      title: 'new title',
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>
      <title>new title</title>
      <script id=\\"unhead:payload\\" type=\\"application/json\\">{\\"title\\":\\"My amazing site\\"}</script>
      <meta name=\\"unhead:ssr\\" content=\\"6f28288\\">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

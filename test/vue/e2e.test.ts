import { describe, it } from 'vitest'
import type { ReactiveHead } from '@unhead/vue'
import { createHead, useHead, useServerHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../fixtures'

describe('vue e2e', () => {
  it('hydration', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()
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
    useHead({
      title: 'Home',
      script: [
        {
          src: 'https://my-app.com/home.js',
        },
      ],
      meta: [
        {
          name: 'description',
          content: 'This is the home page',
        },
      ],
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <title>Home</title>
      <script src=\\"https://analytics.example.com/script.js\\" defer=\\"\\" async=\\"\\" data-h-c289ee=\\"\\"></script>
      <meta name=\\"description\\" content=\\"This is the home page\\" data-h-889faf=\\"\\">
      <meta property=\\"og:title\\" content=\\"My amazing site\\" data-h-e05a65=\\"\\">
      <meta property=\\"og:description\\" content=\\"This is my amazing site\\" data-h-2002f8=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image.jpg\\" data-h-3f17e7=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image2.jpg\\" data-h-56c382=\\"\\">
      <script src=\\"https://my-app.com/home.js\\" data-h-0a90d3=\\"\\"></script>",
        "htmlAttrs": " lang=\\"en\\"",
      }
    `)

    const dom = useDom(data)

    const csrHead = createHead()
    csrHead.push({
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
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html lang=\\"en\\"><head>
      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <title>Home</title>
      <script src=\\"https://analytics.example.com/script.js\\" defer=\\"\\" async=\\"\\" data-h-c289ee=\\"\\"></script>
      <meta name=\\"description\\" content=\\"This is the home page\\" data-h-889faf=\\"\\">
      <meta property=\\"og:title\\" content=\\"Home\\" data-h-e05a65=\\"\\">
      <meta property=\\"og:description\\" content=\\"This is my amazing site\\" data-h-2002f8=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image.jpg\\" data-h-3f17e7=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image2.jpg\\" data-h-56c382=\\"\\">
      <script src=\\"https://my-app.com/home.js\\" data-h-0a90d3=\\"\\"></script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('hydration breaking', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createHead()

    const schema = <ReactiveHead> {
      title: 'My amazing site',
      htmlAttrs: {
        class: 'layout-default',
        style: 'color: red',
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
    }
    // i.e App.vue
    ssrHead.push(schema)

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <title>My amazing site</title>
      <script src=\\"https://analytics.example.com/script.js\\" defer=\\"\\" async=\\"\\" data-h-c289ee=\\"\\"></script>
      <meta name=\\"description\\" content=\\"My amazing site\\" data-h-889faf=\\"\\">
      <meta property=\\"og:title\\" content=\\"My amazing site\\" data-h-e05a65=\\"\\">
      <meta property=\\"og:description\\" content=\\"This is my amazing site\\" data-h-2002f8=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image.jpg\\" data-h-3f17e7=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image2.jpg\\" data-h-56c382=\\"\\">",
        "htmlAttrs": " class=\\"layout-default\\" style=\\"color: red\\" lang=\\"en\\"",
      }
    `)

    const dom = useDom(data, {
      htmlAttrs: ' data-my-app="" ',
      bodyAttrs: ' class="test" ',
      headTags: '',
      bodyTags: '',
      bodyTagsOpen: '',
    })

    const csrHead = createHead()
    useHead(schema)

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app=\\"\\" class=\\"layout-default\\" style=\\"color: red\\" lang=\\"en\\"><head>
      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <title>My amazing site</title>
      <script src=\\"https://analytics.example.com/script.js\\" defer=\\"\\" async=\\"\\" data-h-c289ee=\\"\\"></script>
      <meta name=\\"description\\" content=\\"My amazing site\\" data-h-889faf=\\"\\">
      <meta property=\\"og:title\\" content=\\"My amazing site\\" data-h-e05a65=\\"\\">
      <meta property=\\"og:description\\" content=\\"This is my amazing site\\" data-h-2002f8=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image.jpg\\" data-h-3f17e7=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image2.jpg\\" data-h-56c382=\\"\\">
      </head>
      <body class=\\"test\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    // home page mount
    const homePageEntry = csrHead.push({
      title: 'Home',
      htmlAttrs: {
        class: 'page-home',
        style: 'background-color: red',
      },
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
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app=\\"\\" class=\\"layout-default page-home\\" style=\\"color: red background-color: red\\" lang=\\"en\\"><head>
      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <title>Home</title>
      <script src=\\"https://analytics.example.com/script.js\\" defer=\\"\\" async=\\"\\" data-h-c289ee=\\"\\"></script>
      <meta name=\\"description\\" content=\\"This is the home page\\" data-h-889faf=\\"\\">
      <meta property=\\"og:title\\" content=\\"Home\\" data-h-e05a65=\\"\\">
      <meta property=\\"og:description\\" content=\\"This is my amazing site\\" data-h-2002f8=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image.jpg\\" data-h-3f17e7=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image2.jpg\\" data-h-56c382=\\"\\">
      <script src=\\"https://my-app.com/home.js\\" data-h-0a90d3=\\"\\"></script></head>
      <body class=\\"test\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    homePageEntry.dispose()

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app=\\"\\" class=\\"layout-default\\" lang=\\"en\\" style=\\"color: red\\"><head>
      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <title>My amazing site</title>
      <script src=\\"https://analytics.example.com/script.js\\" defer=\\"\\" async=\\"\\" data-h-c289ee=\\"\\"></script>
      <meta name=\\"description\\" content=\\"My amazing site\\" data-h-889faf=\\"\\">
      <meta property=\\"og:title\\" content=\\"My amazing site\\" data-h-e05a65=\\"\\">
      <meta property=\\"og:description\\" content=\\"This is my amazing site\\" data-h-2002f8=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image.jpg\\" data-h-3f17e7=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image2.jpg\\" data-h-56c382=\\"\\">
      </head>
      <body class=\\"test\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    // about page mount
    const aboutPage = csrHead.push({
      title: 'About',
      htmlAttrs: {
        class: 'page-about',
      },
      bodyAttrs: {
        class: 'overflow-hidden',
      },
      script: [
        {
          src: 'https://my-app.com/about.js',
        },
      ],
      meta: [
        {
          property: 'og:title',
          content: 'About',
        },
        {
          name: 'description',
          content: 'This is the about page',
        },
      ],
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app=\\"\\" class=\\"layout-default page-about\\" lang=\\"en\\" style=\\"color: red\\"><head>
      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <title>About</title>
      <script src=\\"https://analytics.example.com/script.js\\" defer=\\"\\" async=\\"\\" data-h-c289ee=\\"\\"></script>
      <meta name=\\"description\\" content=\\"This is the about page\\" data-h-889faf=\\"\\">
      <meta property=\\"og:title\\" content=\\"About\\" data-h-e05a65=\\"\\">
      <meta property=\\"og:description\\" content=\\"This is my amazing site\\" data-h-2002f8=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image.jpg\\" data-h-3f17e7=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image2.jpg\\" data-h-56c382=\\"\\">
      <script src=\\"https://my-app.com/about.js\\" data-h-3697bd=\\"\\"></script></head>
      <body class=\\"test overflow-hidden\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)

    aboutPage.dispose()

    await renderDOMHead(csrHead, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app=\\"\\" class=\\"layout-default\\" lang=\\"en\\" style=\\"color: red\\"><head>
      <meta charset=\\"utf-8\\" data-h-207e30=\\"\\">
      <title>My amazing site</title>
      <script src=\\"https://analytics.example.com/script.js\\" defer=\\"\\" async=\\"\\" data-h-c289ee=\\"\\"></script>
      <meta name=\\"description\\" data-h-889faf=\\"\\" content=\\"My amazing site\\">
      <meta property=\\"og:title\\" data-h-e05a65=\\"\\" content=\\"My amazing site\\">
      <meta property=\\"og:description\\" content=\\"This is my amazing site\\" data-h-2002f8=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image.jpg\\" data-h-3f17e7=\\"\\">
      <meta property=\\"og:image\\" content=\\"https://cdn.example.com/image2.jpg\\" data-h-56c382=\\"\\">
      </head>
      <body class=\\"test\\">

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })
})

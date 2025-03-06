// @vitest-environment jsdom

import type { ReactiveHead } from '@unhead/vue'
import { renderDOMHead } from '@unhead/dom'
import { renderSSRHead } from '@unhead/ssr'
import { useHead, useServerHead } from '@unhead/vue'
import { createHead } from '@unhead/vue/client'
import { createHead as createServerHead } from '@unhead/vue/server'
import { describe, it } from 'vitest'
import { useDom } from '../../../../unhead/test/fixtures'
import { csrVueAppWithUnhead, ssrVueAppWithUnhead } from '../../util'

describe('vue e2e', () => {
  it('ssr / csr hydration', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = await ssrVueAppWithUnhead(() => {
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
            property: 'og:locale',
            content: 'en_US',
          },
          {
            property: 'og:locale',
            content: 'en_AU',
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
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8">
      <title>Home</title>
      <script src="https://analytics.example.com/script.js" defer async></script>
      <script src="https://my-app.com/home.js"></script>
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:locale" content="en_US">
      <meta property="og:locale" content="en_AU">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      <meta name="description" content="This is the home page">",
        "htmlAttrs": " lang="en"",
      }
    `)

    const dom = useDom(data)
    const csrHead = csrVueAppWithUnhead(dom, () => {})
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
      "<html lang="en"><head>
      <meta charset="utf-8">
      <title>Home</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <script src="https://my-app.com/home.js"></script>
      <meta property="og:title" content="Home">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:locale" content="en_US">
      <meta property="og:locale" content="en_AU">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      <meta name="description" content="This is the home page">
      </head>
      <body><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })

  it('hydration breaking', async () => {
    const schema = <ReactiveHead> {
      title: 'My amazing site',
      htmlAttrs: {
        class: 'layout-default',
        // style: 'color: red',
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
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = await ssrVueAppWithUnhead(() => {
      // i.e App.vue
      useHead(schema)
    })

    const data = await renderSSRHead(ssrHead)

    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8">
      <title>My amazing site</title>
      <script src="https://analytics.example.com/script.js" defer async></script>
      <meta name="description" content="My amazing site">
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">",
        "htmlAttrs": " class="layout-default" lang="en"",
      }
    `)

    const dom = useDom(data, {
      htmlAttrs: ' data-my-app="" ',
      bodyAttrs: ' class="test" ',
      headTags: '',
      bodyTags: '',
      bodyTagsOpen: '',
    })

    const csrHead = csrVueAppWithUnhead(dom, () => {})
    csrHead.push(schema)

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html data-my-app="" class="layout-default" lang="en"><head>
      <meta charset="utf-8">
      <title>My amazing site</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="My amazing site">
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      </head>
      <body class="test"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
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
      "<html data-my-app="" class="layout-default page-home" lang="en" style="background-color: red;"><head>
      <meta charset="utf-8">
      <title>Home</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="This is the home page">
      <meta property="og:title" content="Home">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      <script src="https://my-app.com/home.js"></script></head>
      <body class="test"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)

    homePageEntry.dispose()

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html data-my-app="" class="layout-default" lang="en" style=""><head>
      <meta charset="utf-8">
      <title>My amazing site</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="My amazing site">
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      </head>
      <body class="test"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
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
      "<html data-my-app="" class="layout-default page-about" lang="en" style=""><head>
      <meta charset="utf-8">
      <title>About</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="This is the about page">
      <meta property="og:title" content="About">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      <script src="https://my-app.com/about.js"></script></head>
      <body class="test overflow-hidden"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)

    aboutPage.dispose()

    await renderDOMHead(csrHead, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html data-my-app="" class="layout-default" lang="en" style=""><head>
      <meta charset="utf-8">
      <title>My amazing site</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="My amazing site">
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      </head>
      <body class="test"><div id="app" data-v-app=""><div>hello world</div></div></body></html>"
    `)
  })

  it('title', async () => {
    const ssrHead = createServerHead({
      disableDefaults: true,
    })

    // i.e App.vue
    ssrHead.push({
      title: 'Default title',
      titleTemplate: '%s | Company',
    }, {
      mode: 'server',
    })

    ssrHead.push({
      title: 'Home page',
    })

    const data = await renderSSRHead(ssrHead)

    expect(data.headTags).toMatchInlineSnapshot(`
      "<title>Home page | Company</title>
      <script id="unhead:payload" type="application/json">{"titleTemplate":"%s | Company"}</script>"
    `)
    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Home page | Company</title>
      <script id="unhead:payload" type="application/json">{"titleTemplate":"%s | Company"}</script>",
        "htmlAttrs": "",
      }
    `)
    const dom = useDom(data)

    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<html><head>
      <title>Home page | Company</title>
      <script id="unhead:payload" type="application/json">{"titleTemplate":"%s | Company"}</script>
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>


      </body></html>"
    `)

    const csrHead = createHead({
      document: dom.window.document,
    })

    const home = useHead({
      title: 'Home Page',
    }, {
      head: csrHead,
    })

    await renderDOMHead(csrHead, { document: dom.window.document })

    expect(dom.window.document.title).toMatchInlineSnapshot(`"Home Page | Company"`)
    home.dispose()

    await renderDOMHead(csrHead, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`"| Company"`)
  })
})

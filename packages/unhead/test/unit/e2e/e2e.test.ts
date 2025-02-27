import type { ResolvableHead } from '../../../src/types'
import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { renderSSRHead } from '../../../src/server'
import { createClientHeadWithContext, createServerHeadWithContext, useDom } from '../../util'

describe('unhead e2e', () => {
  it('basic hydration', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createServerHeadWithContext()
    // i.e App.vue
    useHead(ssrHead, {
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
    }, {
      mode: 'server',
    })

    // i.e pages/index.vue
    useHead(ssrHead, {
      title: 'Home',
      script: [
        {
          src: 'https://my-app.com/home.js',
        },
        {
          type: 'application/json',
          innerHTML: JSON.stringify({ val: '<' + '/script>' }),
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
        "headTags": "<meta charset="utf-8">
      <title>Home</title>
      <script src="https://analytics.example.com/script.js" defer async></script>
      <script src="https://my-app.com/home.js"></script>
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      <script type="application/json">{"val":"\\u003C/script>"}</script>
      <meta name="description" content="This is the home page">",
        "htmlAttrs": " lang="en"",
      }
    `)

    const dom = useDom(data)

    const csrHead = createClientHeadWithContext()
    csrHead.push({
      title: 'Home',
      script: [
        {
          src: 'https://my-app.com/home.js',
        },
        {
          type: 'application/json',
          innerHTML: JSON.stringify({ val: '<' + '/script>' }),
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
      "<!DOCTYPE html><html lang="en"><head>
      <meta charset="utf-8">
      <title>Home</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <script src="https://my-app.com/home.js"></script>
      <meta property="og:title" content="Home">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      <script type="application/json">{"val":"\\u003C/script>"}</script>
      <meta name="description" content="This is the home page">
      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>



      </body></html>"
    `)
  })

  it('hydration /w change page', async () => {
    // scenario: we are injecting root head schema which will not have a hydration step,
    // but we are also injecting a child head schema which will have a hydration step
    const ssrHead = createClientHeadWithContext()

    const schema = <ResolvableHead> {
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
        "headTags": "<meta charset="utf-8">
      <title>My amazing site</title>
      <script src="https://analytics.example.com/script.js" defer async></script>
      <meta name="description" content="My amazing site">
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">",
        "htmlAttrs": " class="layout-default" style="color:red" lang="en"",
      }
    `)

    const dom = useDom(data, {
      htmlAttrs: ' data-my-app="" ',
      bodyAttrs: ' class="test" ',
      headTags: '',
      bodyTags: '',
      bodyTagsOpen: '',
    })

    expect(dom.serialize().replaceAll('\n\n', '')).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app="" class="layout-default" style="color:red" lang="en"><head>
      <meta charset="utf-8">
      <title>My amazing site</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="My amazing site">
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      </head>
      <body class="test"><div>
      <h1>hello world</h1>
      </div></body></html>"
    `)

    const csrHead = createClientHeadWithContext()
    useHead(csrHead, schema)

    await renderDOMHead(csrHead, { document: dom.window.document })

    let html = dom.serialize().replaceAll('\n\n', '')

    expect(html).toContain('<title>My amazing site</title>')
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('<html data-my-app="" class="layout-default" style="color:red" lang="en">')
    expect(html).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app="" class="layout-default" style="color:red" lang="en"><head>
      <meta charset="utf-8">
      <title>My amazing site</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="My amazing site">
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      </head>
      <body class="test"><div>
      <h1>hello world</h1>
      </div></body></html>"
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

    html = dom.serialize().replaceAll('\n\n', '')

    expect(html).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app="" class="layout-default page-home" style="color: red; background-color: red;" lang="en"><head>
      <meta charset="utf-8">
      <title>Home</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="This is the home page">
      <meta property="og:title" content="Home">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      <script src="https://my-app.com/home.js"></script></head>
      <body class="test"><div>
      <h1>hello world</h1>
      </div></body></html>"
    `)

    // updates title
    expect(html).toContain('<title>Home</title>')
    // creates new entry
    expect(html).toContain('<meta name="description" content="This is the home page"')
    // deletes old entry
    expect(html).not.toContain('<meta name="description" content="My amazing site"')
    // merging class / style to work
    expect(html).toContain('class="layout-default page-home"')
    expect(html).toContain('style="color: red; background-color: red;"')

    homePageEntry.dispose()

    await renderDOMHead(csrHead, { document: dom.window.document })

    html = dom.serialize().replaceAll('\n\n', '')

    expect(html).toContain('<title>My amazing site</title>')
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain('<html data-my-app="" class="layout-default" style="color: red;" lang="en"')

    expect(dom.serialize().replaceAll('\n\n', '')).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app="" class="layout-default" style="color: red;" lang="en"><head>
      <meta charset="utf-8">
      <title>My amazing site</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="My amazing site">
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      </head>
      <body class="test"><div>
      <h1>hello world</h1>
      </div></body></html>"
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

    html = dom.serialize().replaceAll('\n\n', '')

    expect(html).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app="" class="layout-default page-about" style="color: red;" lang="en"><head>
      <meta charset="utf-8">
      <title>About</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="This is the about page">
      <meta property="og:title" content="About">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      <script src="https://my-app.com/about.js"></script></head>
      <body class="test overflow-hidden"><div>
      <h1>hello world</h1>
      </div></body></html>"
    `)

    aboutPage.dispose()

    await renderDOMHead(csrHead, { document: dom.window.document })

    html = dom.serialize().replaceAll('\n\n', '')

    expect(html).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html data-my-app="" class="layout-default" style="color: red;" lang="en"><head>
      <meta charset="utf-8">
      <title>My amazing site</title>
      <script src="https://analytics.example.com/script.js" defer="" async=""></script>
      <meta name="description" content="My amazing site">
      <meta property="og:title" content="My amazing site">
      <meta property="og:description" content="This is my amazing site">
      <meta property="og:image" content="https://cdn.example.com/image.jpg">
      <meta property="og:image" content="https://cdn.example.com/image2.jpg">
      </head>
      <body class="test"><div>
      <h1>hello world</h1>
      </div></body></html>"
    `)
  })
})

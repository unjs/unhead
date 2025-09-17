import { createHead } from '@unhead/dom'
import { describe, it } from 'vitest'
import { useHead, useSeoMeta } from '../../../src'
import { renderSSRHead } from '../../../src/server'
import { transformHtmlTemplate } from '../../../src/server/transformHtmlTemplate'
import { basicSchema, createServerHeadWithContext } from '../../util'

describe('ssr', () => {
  it('basic', async () => {
    const head = createServerHeadWithContext()

    head.push({
      ...basicSchema,
      htmlAttrs: {
        lang: 'de',
      },
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " class="dark"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8">
      <script src="https://cdn.example.com/script.js"></script>
      <link rel="icon" type="image/x-icon" href="https://cdn.example.com/favicon.ico">",
        "htmlAttrs": " lang="de"",
      }
    `)

    head.push({
      ...basicSchema,
      htmlAttrs: {
        lang: 'de',
      },
    })
    await renderSSRHead(head)
  })

  it('number title', async () => {
    const head = createServerHeadWithContext()

    head.push({
      title: 12345,
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>12345</title>",
        "htmlAttrs": "",
      }
    `)
  })

  it('object title', async () => {
    const head = createServerHeadWithContext()

    head.push({
      title: {
        // @ts-expect-error untyped
        foo: 'bar',
      },
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title foo="bar"></title>",
        "htmlAttrs": "",
      }
    `)
  })

  it ('boolean props', async () => {
    const head = createServerHeadWithContext()

    head.push({
      script: [
        {
          defer: true,
          async: false,
          src: 'https://cdn.example.com/script.js',
        },
      ],
    })

    const ctx = await renderSSRHead(head)

    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script defer src="https://cdn.example.com/script.js"></script>",
        "htmlAttrs": "",
      }
    `)
  })

  it('remove break lines', async () => {
    const head = createServerHeadWithContext()

    head.push({
      script: [
        {
          src: 'https://cdn.example.com/script-1.js',
        },
        {
          src: 'https://cdn.example.com/script-2.js',
        },
      ],
    })

    const ctx = await renderSSRHead(head, { omitLineBreaks: true })

    expect(ctx).toMatchInlineSnapshot(`
    {
      "bodyAttrs": "",
      "bodyTags": "",
      "bodyTagsOpen": "",
      "headTags": "<script src="https://cdn.example.com/script-1.js"></script><script src="https://cdn.example.com/script-2.js"></script>",
      "htmlAttrs": "",
    }
  `)
  })

  it('multiword attributes in html template', async () => {
    const head = createServerHeadWithContext()

    expect(await transformHtmlTemplate(head, `
      <html>
      <head>
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      </head>
      <body>
      <!--app-html-->
      </body>
      </html>
      `)).toMatchInlineSnapshot(`
        "
              <html>
              <head>
              <meta http-equiv="X-UA-Compatible" content="IE=edge"></head>
              <body><!--app-html-->
              </body>
              </html>
              "
      `)
  })

  it('useSeoMeta', async () => {
    const head = createServerHeadWithContext()

    useSeoMeta(head, {
      title: 'page name',
      titleTemplate: '%s - site',
      charset: 'utf-8',
      description: 'test',
      ogLocaleAlternate: ['fr', 'zh'],
      twitterCard: 'summary_large_image',
      ogImage: [
        {
          url: 'https://example.com/image.png',
          width: 800,
          height: 600,
          alt: 'My amazing image',
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset="utf-8">
      <title>page name - site</title>
      <meta property="og:locale:alternate" content="fr">
      <meta property="og:locale:alternate" content="zh">
      <meta property="og:image" content="https://example.com/image.png">
      <meta property="og:image:width" content="800">
      <meta property="og:image:height" content="600">
      <meta property="og:image:alt" content="My amazing image">
      <meta name="description" content="test">
      <meta name="twitter:card" content="summary_large_image">",
        "htmlAttrs": "",
      }
    `)
  })

  it('useSeoMeta alt', async () => {
    const head = createServerHeadWithContext()

    useSeoMeta(head, {
      description: 'This is my amazing site, let me tell you all about it.',
      ogDescription: 'This is my amazing site, let me tell you all about it.',
      ogTitle: 'My Amazing Site',
      ogImage: 'https://example.com/image.png',
      twitterCard: 'summary_large_image',
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="description" content="This is my amazing site, let me tell you all about it.">
      <meta property="og:description" content="This is my amazing site, let me tell you all about it.">
      <meta property="og:title" content="My Amazing Site">
      <meta property="og:image" content="https://example.com/image.png">
      <meta name="twitter:card" content="summary_large_image">",
        "htmlAttrs": "",
      }
    `)
  })

  it('title function', async () => {
    const head = createServerHeadWithContext()

    useHead(head, {
      title: 'my default title',
    })

    useHead(head, {
      title: () => {
        return undefined
      },
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>my default title</title>",
        "htmlAttrs": "",
      }
    `)
  })
  it('vite template', async () => {
    const html = `<!doctype html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + Vue + TS</title>
    <!--app-head-->
    </head>
    <body>
    <div id="app"><!--app-html--></div>
      <script type="module" src="/src/entry-client.ts"></script>
      </body>
      </html>`
    const head = createServerHeadWithContext()
    head.push({
      title: 'new title',
      meta: [
        { charset: 'utf-16' },
      ],
    })
    expect(await transformHtmlTemplate(head, html)).toMatchInlineSnapshot(`
      "<!doctype html>
          <html lang="en">
          <head><!--app-head-->
          <meta charset="utf-16">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>new title</title>
      <link rel="icon" type="image/svg+xml" href="/vite.svg"></head>
          <body>
          <div id="app"><!--app-html--></div>
            <script type="module" src="/src/entry-client.ts"></script>
            </body>
            </html>"
    `)
  })
  it('random template', async () => {
    const html = `
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Document</title>
          <link rel="stylesheet" href="style.css">
          <script src="script.js" async type="module"></script>
        </head>
        <body style="accent-color: red;">
          <div>hello</div>
          <script src="ssr.test.ts"></script>
          <script>
          console.log('hello')
</script>
        </body>
      </html>
    `
    const head = createServerHeadWithContext()
    head.push({
      title: 'new title',
      bodyAttrs: {
        style: 'background-color: blue;',
      },
      meta: [
        { charset: 'utf-16' },
      ],
    })
    expect(await transformHtmlTemplate(head, html)).toMatchInlineSnapshot(`
      "
            <html lang="en">
              <head>
                <meta charset="utf-16">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>new title</title>
      <script src="script.js" async type="module"></script>
      <link rel="stylesheet" href="style.css"></head>
              <body style="accent-color:red;background-color:blue">
                <div>hello</div>
                <script src="ssr.test.ts"></script>
                <script>
                console.log('hello')
      </script>
              </body>
            </html>
          "
    `)
  })
  it('random template #2', async () => {
    const html = `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Test description">
  <link rel="stylesheet" href="styles.css">
  <link rel="icon" href="favicon.ico">
  <base href="/">
  <title>Test Document</title>
  <style>body { font-family: Arial, sans-serif; }</style>
  <script src="script.js" async></script>
  <script>console.log('Inline script');</script>
  <!-- Resource Hints -->
  <link rel="preload" href="styles.css" as="style">
  <link rel="preload" href="script.js" as="script">
  <link rel="dns-prefetch" href="//example.com">
  <link rel="preconnect" href="//example.com">
  <link rel="prefetch" href="another-script.js">
</head>
<body style="background-color: #f0f0f0;">
  <div id="content">Hello, world!</div>
  <script src="another-script.js"></script>
</body>
</html>`
    const head = createServerHeadWithContext()
    const processedHtml = await transformHtmlTemplate(head, html)
    expect(processedHtml).toContain('<meta charset="UTF-8">')
    expect(processedHtml).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">')
    expect(processedHtml).toContain('<meta name="description" content="Test description">')
    expect(processedHtml).toContain('<link rel="stylesheet" href="styles.css">')
    expect(processedHtml).toContain('<link rel="icon" href="favicon.ico">')
    expect(processedHtml).toContain('<base href="/">')
    expect(processedHtml).toContain('<title>Test Document</title>')
    expect(processedHtml).toContain('<style>body { font-family: Arial, sans-serif; }</style>')
    expect(processedHtml).toContain('<script src="script.js" async></script>')
    expect(processedHtml).toContain('<script>console.log(\'Inline script\');</script>')
    expect(processedHtml).toContain('<link rel="preload" href="styles.css" as="style">')
    expect(processedHtml).toContain('<link rel="preload" href="script.js" as="script">')
    expect(processedHtml).toContain('<link rel="dns-prefetch" href="//example.com">')
    expect(processedHtml).toContain('<link rel="preconnect" href="//example.com">')
    expect(processedHtml).toContain('<link rel="prefetch" href="another-script.js">')
    expect(processedHtml).toContain('<script src="another-script.js"></script>')
  })
  it('#541', async () => {
    const input = `
    <head>
        <style>
            html { background: url(/foo.png); }
            img::before { content: "foo"; }
        </style>
    </head>
`
    const processedHtml = await transformHtmlTemplate(createHead(), input)
    expect(processedHtml).toMatchInlineSnapshot(`
      "
          <head>
              <style>
                  html { background: url(/foo.png); }
                  img::before { content: "foo"; }
              </style></head>
      "
    `)
  })
})

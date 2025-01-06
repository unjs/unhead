import { renderSSRHead } from '@unhead/ssr'
import { useSeoMeta } from 'unhead'
import { describe, it } from 'vitest'
import { basicSchema } from '../../fixtures'
import { createHeadWithContext } from '../../util'

describe('ssr', () => {
  it('basic', async () => {
    const head = createHeadWithContext()

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
  })

  it('number title', async () => {
    const head = createHeadWithContext()

    head.push({
      // @ts-expect-error handle numbers
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
    const head = createHeadWithContext()

    head.push({
      title: {
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
    const head = createHeadWithContext()

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
    const head = createHeadWithContext()

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

  it('useSeoMeta', async () => {
    const head = createHeadWithContext()

    useSeoMeta({
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
      <meta property="og:image:alt" content="My amazing image">
      <meta property="og:image:width" content="800">
      <meta property="og:image:height" content="600">
      <meta name="description" content="test">
      <meta name="twitter:card" content="summary_large_image">",
        "htmlAttrs": "",
      }
    `)
  })

  it('useSeoMeta alt', async () => {
    const head = createHeadWithContext()

    useSeoMeta({
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
})

import { describe, it } from 'vitest'
import { createHead, useSeoMeta } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'
import { basicSchema } from '../../fixtures'

describe('ssr', () => {
  it('basic', async () => {
    const head = createHead()

    head.push({
      ...basicSchema,
      htmlAttrs: {
        lang: 'de',
      },
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": " class=\\"dark\\"",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\">
      <script src=\\"https://cdn.example.com/script.js\\"></script>
      <link rel=\\"icon\\" type=\\"image/x-icon\\" href=\\"https://cdn.example.com/favicon.ico\\">",
        "htmlAttrs": " lang=\\"de\\"",
      }
    `)
  })
  it ('boolean props', async () => {
    const head = createHead()

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
        "headTags": "<script defer=\\"\\" src=\\"https://cdn.example.com/script.js\\"></script>",
        "htmlAttrs": "",
      }
    `)
  })

  it('useSeoMeta', async () => {
    const head = createHead()

    useSeoMeta({
      charset: 'utf-8',
      description: 'test',
      ogLocaleAlternate: ['fr', 'zh'],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta charset=\\"utf-8\\">
      <meta name=\\"description\\" content=\\"test\\">
      <meta property=\\"og:locale:alternate\\" content=\\"fr\\">
      <meta property=\\"og:locale:alternate\\" content=\\"zh\\">",
        "htmlAttrs": "",
      }
    `)
  })
})

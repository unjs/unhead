import { describe, it } from 'vitest'
import {
  createHead,
  useBodyAttrs, useHead,
  useHtmlAttrs,
  useSeoMeta,
  useTagLink,
  useTagMeta,
  useTagScript,
} from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('composables', () => {
  it('basic', async () => {
    const head = createHead()

    useHtmlAttrs({
      lang: 'en',
      dir: 'ltr',
    })
    useBodyAttrs({
      class: 'dark',
    })
    useTagScript({
      src: 'https://cdn.example.com/script.js',
    })
    useTagMeta({
      charset: 'utf-8',
    })
    useTagLink({
      rel: 'icon',
      type: 'image/x-icon',
      href: 'https://cdn.example.com/favicon.ico',
    })

    useHead({
      title: 'SHOULD NOT BE RENDERED',
    }, {
      mode: 'client',
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
        "htmlAttrs": " lang=\\"en\\" dir=\\"ltr\\"",
      }
    `)
  })
  it('meta flat', async () => {
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

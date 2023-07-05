import { createHead, useSeoMeta } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'
import { describe, it } from 'vitest'

describe('useSeoMeta', () => {
  it('themeColor array', async () => {
    const head = createHead()

    useSeoMeta({
      themeColor: [
        { content: 'cyan', media: '(prefers-color-scheme: light)' },
        { content: 'black', media: '(prefers-color-scheme: dark)' },
      ],
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name=\\"theme-color\\" content=\\"cyan\\" media=\\"(prefers-color-scheme: light)\\">
      <meta name=\\"theme-color\\" content=\\"black\\" media=\\"(prefers-color-scheme: dark)\\">",
        "htmlAttrs": "",
      }
    `)
  })

  it('themeColor string', async () => {
    const head = createHead()

    useSeoMeta({
      themeColor: 'cyan',
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name=\\"theme-color\\" content=\\"cyan\\">",
        "htmlAttrs": "",
      }
    `)
  })

  it('twitter image', async () => {
    const head = createHead()

    useSeoMeta({
      twitterImage: [
        {
          url: '/twitter-image.png',
          alt: 'test',
          width: 100,
          height: 100,
        },
        {
          url: '/twitter-image2.png',
          alt: 'test',
          width: 100,
          height: 100,
        }
      ]
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name=\\"twitter:image\\" content=\\"/twitter-image.png\\">
      <meta name=\\"twitter:image:alt\\" content=\\"test\\">
      <meta name=\\"twitter:image:width\\" content=\\"100\\">
      <meta name=\\"twitter:image:height\\" content=\\"100\\">
      <meta name=\\"twitter:image\\" content=\\"/twitter-image2.png\\">
      <meta name=\\"twitter:image:alt\\" content=\\"test\\">
      <meta name=\\"twitter:image:width\\" content=\\"100\\">
      <meta name=\\"twitter:image:height\\" content=\\"100\\">",
        "htmlAttrs": "",
      }
    `)
  })

  it('twitter image', async () => {
    const head = createHead()

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": "",
      }
    `)
  })
})

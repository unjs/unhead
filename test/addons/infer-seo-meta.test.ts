import { describe, it } from 'vitest'
import { createHead } from 'unhead'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { renderSSRHead } from '@unhead/ssr'

describe('InferSeoMetaPlugin', () => {
  it('simple', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()],
    })

    head.push({
      title: 'My Title',
      meta: [
        {
          name: 'description',
          content: 'My Description',
        },
        {
          property: 'og:image',
          content: 'https://example.com/image.jpg',
        },
      ],
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>My Title</title>
      <meta name=\\"robots\\" content=\\"max-snippet: -1; max-image-preview: large; max-video-preview: -1\\">
      <meta property=\\"twitter:card\\" content=\\"summary_large_image\\">
      <meta name=\\"description\\" content=\\"My Description\\">
      <meta property=\\"og:image\\" content=\\"https://example.com/image.jpg\\">
      <meta property=\\"og:title\\" content=\\"My Title\\">
      <meta property=\\"og:description\\" content=\\"My Description\\">
      <meta property=\\"unhead:ssr\\" content=\\"297046b\\">",
        "htmlAttrs": "",
      }
    `)
  })
  it('conflicts', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()],
    })

    head.push({
      title: 'Title',
      meta: [
        {
          name: 'og:description',
          content: 'My OG description',
        },
        {
          property: 'og:title',
          content: 'My OG title',
        },
      ],
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title</title>
      <meta name=\\"robots\\" content=\\"max-snippet: -1; max-image-preview: large; max-video-preview: -1\\">
      <meta name=\\"og:description\\" content=\\"My OG description\\">
      <meta property=\\"og:title\\" content=\\"My OG title\\">
      <meta property=\\"unhead:ssr\\" content=\\"e938249\\">",
        "htmlAttrs": "",
      }
    `)
  })
  it('empty meta', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()],
    })
    head.push({
      title: 'Title',
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title</title>
      <meta name=\\"robots\\" content=\\"max-snippet: -1; max-image-preview: large; max-video-preview: -1\\">
      <meta property=\\"og:title\\" content=\\"Title\\">
      <meta property=\\"unhead:ssr\\" content=\\"5315441\\">",
        "htmlAttrs": "",
      }
    `)
  })
  it('custom template', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin({
        ogTitle: '%s - My Site',
      })],
    })
    head.push({
      title: 'Title',
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title</title>
      <meta name=\\"robots\\" content=\\"max-snippet: -1; max-image-preview: large; max-video-preview: -1\\">
      <meta property=\\"og:title\\" content=\\"Title - My Site\\">
      <meta property=\\"unhead:ssr\\" content=\\"5315441\\">",
        "htmlAttrs": "",
      }
    `)
  })
})

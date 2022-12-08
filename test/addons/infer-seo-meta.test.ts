import { describe, it } from 'vitest'
import { InferSeoMetaPlugin } from '../../packages/addons/src'
import {createHead} from "unhead";
import {renderSSRHead} from "../../packages/ssr";

describe('InferSeoMetaPlugin', () => {
  it('simple', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()]
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
      ]
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>My Title</title>
      <meta name=\\"description\\" content=\\"My Description\\">
      <meta property=\\"og:image\\" content=\\"https://example.com/image.jpg\\">
      <meta property=\\"og:title\\" content=\\"My Title\\">
      <meta property=\\"og:description\\" content=\\"My Description\\">
      <meta property=\\"twitter:card\\" content=\\"summary_large_image\\">
      <meta name=\\"robots\\" content=\\"max-snippet: -1; max-image-preview: large; max-video-preview: -1\\">",
        "htmlAttrs": "",
      }
    `)
  })
  it('conflicts', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()]
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
      ]
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title</title>
      <meta name=\\"og:description\\" content=\\"My OG description\\">
      <meta property=\\"og:title\\" content=\\"My OG title\\">
      <meta property=\\"twitter:card\\" content=\\"summary_large_image\\">
      <meta name=\\"robots\\" content=\\"max-snippet: -1; max-image-preview: large; max-video-preview: -1\\">",
        "htmlAttrs": "",
      }
    `)
  })
})

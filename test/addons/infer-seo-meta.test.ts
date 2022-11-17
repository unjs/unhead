import { describe, it } from 'vitest'
import { InferSeoMetaPlugin } from '../../packages/addons/src'

describe('state', () => {
  it('exists', async () => {
    const ctx = {
      tags: [
        {
          _e: 1,
          children: 'test',
          props: {},
          tag: 'title',
        },
        {
          _e: 1,
          props: {
            content: 'test',
            name: 'description',
          },
          tag: 'meta',
        },
        {
          _e: 1,
          props: {
            property: 'og:image',
            name: 'https://example.com/image.jpg',
          },
          tag: 'meta',
        },
      ],
    }
    // @ts-expect-error hacky run of hook
    InferSeoMetaPlugin().hooks.tags.resolve(ctx)
    expect(ctx.tags).toMatchInlineSnapshot(`
      [
        {
          "_e": 1,
          "props": {
            "name": "https://example.com/image.jpg",
            "property": "og:image",
          },
          "tag": "meta",
        },
        {
          "_e": 1,
          "props": {
            "content": "test",
            "name": "description",
          },
          "tag": "meta",
        },
        {
          "_e": 1,
          "children": "test",
          "props": {},
          "tag": "title",
        },
        {
          "_e": 1,
          "props": {
            "content": "test",
            "property": "og:title",
          },
          "tag": "meta",
        },
        {
          "_e": 1,
          "props": {
            "content": "test",
            "name": "og:description",
          },
          "tag": "meta",
        },
        {
          "_e": 1,
          "props": {
            "content": "summary_large_image",
            "property": "twitter:card",
          },
          "tag": "meta",
        },
        {
          "_e": 1,
          "props": {
            "content": "max-snippet: -1; max-image-preview: large; max-video-preview: -1",
            "name": "robots",
          },
          "tag": "meta",
        },
      ]
    `)
  })
})

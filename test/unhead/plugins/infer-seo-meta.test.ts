import { renderSSRHead } from '@unhead/ssr'
import { InferSeoMetaPlugin } from 'unhead/optionalPlugins'
import { createHead } from 'unhead/server'
import { describe, it } from 'vitest'

describe('inferSeoMetaPlugin', () => {
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
      <meta name="description" content="My Description">
      <meta property="og:image" content="https://example.com/image.jpg">
      <meta property="og:title" content="My Title">
      <meta property="og:description" content="My Description">
      <meta name="twitter:card" content="summary_large_image">",
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
      <meta name="og:description" content="My OG description">
      <meta property="og:title" content="My OG title">",
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
      <meta property="og:title" content="Title">",
        "htmlAttrs": "",
      }
    `)
  })
  it('template params', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()],
    })
    head.push({
      title: 'Title - %siteName',
      templateParams: {
        siteName: 'My Site',
      },
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title - My Site</title>
      <meta property="og:title" content="Title - My Site">",
        "htmlAttrs": "",
      }
    `)
  })

  it('title and then remove title', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()],
    })
    const entry = head.push({
      title: 'Title',
      templateParams: {
        siteName: 'My Site',
      },
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title</title>
      <meta property="og:title" content="Title">",
        "htmlAttrs": "",
      }
    `)

    entry.dispose()

    head.push({
      title: null,
    })

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

  it('no title and then add title', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()],
    })
    head.push({
      title: null,
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": "",
      }
    `)

    head.push({
      title: 'test',
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>test</title>
      <meta property="og:title" content="test">",
        "htmlAttrs": "",
      }
    `)
  })

  it('handles title template', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()],
    })
    head.push({
      title: 'Title',
      titleTemplate: '%s - My Site',
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title - My Site</title>
      <meta property="og:title" content="Title - My Site">",
        "htmlAttrs": "",
      }
    `)
  })

  it('null title / title template', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()],
    })
    head.push({
      title: null,
      titleTemplate: '%s %separator My Site',
      templateParams: {
        separator: '-',
      },
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>My Site</title>
      <meta property="og:title" content="My Site">",
        "htmlAttrs": "",
      }
    `)
  })

  it('multiple title templates', async () => {
    const head = createHead({
      plugins: [InferSeoMetaPlugin()],
    })

    head.push({
      title: 'test',
      titleTemplate: '%s %separator My Site',
    })

    head.push({
      titleTemplate: null,
    })

    expect(await renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>test</title>
      <meta property="og:title" content="test">",
        "htmlAttrs": "",
      }
    `)
  })
})

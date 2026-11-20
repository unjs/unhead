import { renderSSRHead } from '@unhead/ssr'
import { describe, it } from 'vitest'
import { useHead, useSeoMeta } from '../../../src'
import { renderDOMHead } from '../../../src/client'
import { InferSeoMetaPlugin, TemplateParamsPlugin } from '../../../src/plugins'
import { createHead } from '../../../src/server'
import { createClientHeadWithContext, useDom } from '../../util'

describe('inferSeoMetaPlugin', () => {
  it('simple', async () => {
    const head = createHead({
      disableDefaults: true,
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

    expect((renderSSRHead(head)).headTags).toMatchInlineSnapshot(`
      "<title>My Title</title>
      <meta name="description" content="My Description">
      <meta property="og:image" content="https://example.com/image.jpg">
      <meta name="twitter:card" content="summary_large_image">
      <meta property="og:title" data-infer="" content="My Title">
      <meta property="og:description" data-infer="" content="My Description">"
    `)
  })

  it('infers numeric zero title and description', () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin({ twitterCard: false })],
    })

    head.push({
      title: 0,
      meta: [{ name: 'description', content: 0 }],
    })

    expect(renderSSRHead(head).headTags).toBe([
      '<title>0</title>',
      '<meta name="description" content="0">',
      '<meta property="og:title" data-infer="" content="0">',
      '<meta property="og:description" data-infer="" content="0">',
    ].join('\n'))
  })

  it('passes numeric zero to custom transformers as strings', () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin({
        twitterCard: false,
        ogTitle: title => title!.trim(),
        ogDescription: description => description!.trim(),
      })],
    })

    head.push({
      title: 0,
      meta: [{ name: 'description', content: 0 }],
    })

    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('<meta property="og:title" data-infer="" content="0">')
    expect(headTags).toContain('<meta property="og:description" data-infer="" content="0">')
  })

  it.each([false, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY] as const)('does not infer invalid content: %s', (content) => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin({ twitterCard: false })],
    })

    head.push({
      title: content,
      meta: [{ name: 'description', content }],
    })

    const { headTags } = renderSSRHead(head)
    expect(headTags).not.toContain('<title')
    expect(headTags).not.toContain('name="description"')
    expect(headTags).not.toContain('property="og:title"')
    expect(headTags).not.toContain('property="og:description"')
  })

  it('conflicts', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin()],
    })

    head.push({
      title: 'Title',
      meta: [
        {
          property: 'og:description',
          content: 'My OG description',
        },
        {
          property: 'og:title',
          content: 'My OG title',
        },
      ],
    })

    expect((renderSSRHead(head)).headTags).toMatchInlineSnapshot(`
      "<title>Title</title>
      <meta property="og:description" content="My OG description">
      <meta property="og:title" content="My OG title">
      <meta name="twitter:card" content="summary">"
    `)
  })
  it('empty meta', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin()],
    })
    head.push({
      title: 'Title',
    })

    expect(renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title</title>
      <meta name="twitter:card" content="summary">
      <meta property="og:title" data-infer="" content="Title">",
        "htmlAttrs": "",
      }
    `)
  })
  it('template params', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [
        InferSeoMetaPlugin(),
        TemplateParamsPlugin,
      ],
    })
    head.push({
      title: 'Title - %siteName',
      templateParams: {
        siteName: 'My Site',
      },
    })

    expect(renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title - My Site</title>
      <meta name="twitter:card" content="summary">
      <meta property="og:title" data-infer="" content="Title - My Site">",
        "htmlAttrs": "",
      }
    `)
  })

  it('title and then remove title', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin()],
    })
    const entry = head.push({
      title: 'Title',
      templateParams: {
        siteName: 'My Site',
      },
    })

    expect(renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title</title>
      <meta name="twitter:card" content="summary">
      <meta property="og:title" data-infer="" content="Title">",
        "htmlAttrs": "",
      }
    `)

    entry.dispose()

    head.push({
      title: null,
    })

    expect(renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="twitter:card" content="summary">",
        "htmlAttrs": "",
      }
    `)
  })

  it('no title and then add title', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin()],
    })
    head.push({
      title: null,
    })

    expect(renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="twitter:card" content="summary">",
        "htmlAttrs": "",
      }
    `)

    head.push({
      title: 'test',
    })

    expect(renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>test</title>
      <meta name="twitter:card" content="summary">
      <meta property="og:title" data-infer="" content="test">",
        "htmlAttrs": "",
      }
    `)
  })

  it('handles title template', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [
        InferSeoMetaPlugin(),
        TemplateParamsPlugin,
      ],
    })
    head.push({
      title: 'Title',
      titleTemplate: '%s - My Site',
    })

    expect(renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>Title - My Site</title>
      <meta name="twitter:card" content="summary">
      <meta property="og:title" data-infer="" content="Title - My Site">",
        "htmlAttrs": "",
      }
    `)
  })

  it('null title / title template', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [
        InferSeoMetaPlugin(),
        TemplateParamsPlugin,
      ],
    })
    head.push({
      title: null,
      titleTemplate: '%s %separator My Site',
      templateParams: {
        separator: '-',
      },
    })

    expect(renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>My Site</title>
      <meta name="twitter:card" content="summary">
      <meta property="og:title" data-infer="" content="My Site">",
        "htmlAttrs": "",
      }
    `)
  })

  it('multiple title templates', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [
        InferSeoMetaPlugin(),
        TemplateParamsPlugin,
      ],
    })

    head.push({
      title: 'test',
      titleTemplate: '%s %separator My Site',
    })

    head.push({
      titleTemplate: null,
    })

    expect(renderSSRHead(head)).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<title>test</title>
      <meta name="twitter:card" content="summary">
      <meta property="og:title" data-infer="" content="test">",
        "htmlAttrs": "",
      }
    `)
  })
  it('infers og:title from function titleTemplate with default value', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin()],
    })

    // Simulate the app.vue setup with a function titleTemplate
    head.push({
      title: null,
      titleTemplate: (titleChunk) => {
        return titleChunk ? `${titleChunk} - Website` : 'Welcome to Website'
      },
      meta: [
        {
          name: 'description',
          content: 'Description.',
        },
        {
          name: 'theme-color',
          content: '#007ed4',
        },
      ],
    })

    const result = renderSSRHead(head)

    expect(result.headTags).toContain('<title>Welcome to Website</title>')
    expect(result.headTags).toContain('<meta property="og:title" data-infer="" content="Welcome to Website">')
    expect(result.headTags).toContain('<meta name="description" content="Description.">')
    expect(result.headTags).toContain('<meta name="theme-color" content="#007ed4">')
  })
  it('template params Nuxt SEO #416', async () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [
        InferSeoMetaPlugin(),
        TemplateParamsPlugin,
      ],
    })
    head.push({
      titleTemplate: '%siteName %separator %s',
      templateParams: {
        separator: '–',
        siteName: 'Nuxt SEO',
      },
    })

    // Simulate the app.vue setup with a function titleTemplate
    head.push({
      title: 'Hello World',
    })

    const result = renderSSRHead(head)

    expect(result.headTags).toMatchInlineSnapshot(`
      "<title>Nuxt SEO – Hello World</title>
      <meta name="twitter:card" content="summary">
      <meta property="og:title" data-infer="" content="Nuxt SEO – Hello World">"
    `)
  })

  it('user twitterCard via useSeoMeta overrides plugin default (#555)', () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin()],
    })

    useSeoMeta(head, { twitterCard: 'summary' })

    const result = renderSSRHead(head)
    expect(result.headTags).toMatchInlineSnapshot(`"<meta name="twitter:card" content="summary">"`)
  })

  it('user twitter:card via useHead overrides plugin default (#555)', () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin()],
    })

    useHead(head, { meta: [{ name: 'twitter:card', content: 'summary' }] })

    const result = renderSSRHead(head)
    expect(result.headTags).toMatchInlineSnapshot(`"<meta name="twitter:card" content="summary">"`)
  })

  it('does not push default meta entries when registered more than once', () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin()],
    })

    head.use(InferSeoMetaPlugin())
    head.push({
      title: 'My Title',
      meta: [{ name: 'description', content: 'My Description' }],
    })

    const result = renderSSRHead(head)
    expect(result.headTags).toMatchInlineSnapshot(`
      "<title>My Title</title>
      <meta name="description" content="My Description">
      <meta name="twitter:card" content="summary">
      <meta property="og:title" data-infer="" content="My Title">
      <meta property="og:description" data-infer="" content="My Description">"
    `)
  })

  it('plugin twitterCard: false disables twitter:card output (#555)', () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin({ twitterCard: false })],
    })

    head.push({ title: 'My Title' })

    const result = renderSSRHead(head)
    expect(result.headTags).not.toContain('twitter:card')
    expect(result.headTags).toMatchInlineSnapshot(`
      "<title>My Title</title>
      <meta property="og:title" data-infer="" content="My Title">"
    `)
  })
})

describe('inferSeoMetaPlugin twitter:card', () => {
  function createInferHead() {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin()],
    })
    head.push({ title: 'Title', meta: [{ name: 'description', content: 'Description' }] })
    return head
  }

  function twitterCards(head: ReturnType<typeof createInferHead>) {
    return [...renderSSRHead(head).headTags.matchAll(/<meta name="twitter:card"[^>]*>/g)].map(m => m[0])
  }

  it('uses summary when the head has no image', () => {
    const head = createInferHead()
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary">'])
  })

  it.each([
    { property: 'og:image' },
    { property: 'og:image:url' },
    { property: 'og:image:secure_url' },
    { name: 'twitter:image' },
    { name: 'twitter:image:src' },
  ])('uses summary_large_image for %o', (attr) => {
    const head = createInferHead()
    head.push({ meta: [{ ...attr, content: 'https://example.com/og.png' }] })
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary_large_image">'])
  })

  it('uses summary when the og:image has empty content', () => {
    const head = createInferHead()
    head.push({ meta: [{ property: 'og:image', content: '  ' }] })
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary">'])
  })

  it('follows an image that is added, removed, and disposed later', () => {
    const head = createInferHead()
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary">'])
    const entry = head.push({ meta: [{ property: 'og:image', content: 'https://example.com/og.png' }] })
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary_large_image">'])
    entry.patch({ meta: [{ property: 'og:image', content: '' }] })
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary">'])
    entry.patch({ meta: [{ property: 'og:image', content: 'https://example.com/og.png' }] })
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary_large_image">'])
    entry.dispose()
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary">'])
  })

  it('uses summary_large_image for an image from useSeoMeta', () => {
    const head = createInferHead()
    useSeoMeta(head, { ogImage: { url: 'https://example.com/og.png', width: 1200 } })
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary_large_image">'])
  })

  it('keeps a user summary when the head has an image', () => {
    const head = createInferHead()
    useSeoMeta(head, { ogImage: 'https://example.com/og.png', twitterCard: 'summary' })
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary">'])
  })

  it('keeps a user summary_large_image when the head has no image', () => {
    const head = createInferHead()
    useHead(head, { meta: [{ name: 'twitter:card', content: 'summary_large_image' }] })
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary_large_image">'])
  })

  it('renders one twitter:card next to a high priority image entry', () => {
    const head = createInferHead()
    head.push({
      meta: [
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:image', content: 'https://example.com/og.png' },
        { property: 'og:image', content: 'https://example.com/og.png' },
      ],
    }, { tagPriority: 'high' })
    expect(twitterCards(head)).toEqual(['<meta name="twitter:card" content="summary_large_image">'])
  })

  it('keeps the twitterCard option value without an image', () => {
    const head = createHead({
      disableDefaults: true,
      plugins: [InferSeoMetaPlugin({ twitterCard: 'summary_large_image' })],
    })
    head.push({ title: 'Title' })
    expect(renderSSRHead(head).headTags).toContain('<meta name="twitter:card" content="summary_large_image">')
  })

  it('updates the DOM when an image is added on the client', () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
      plugins: [InferSeoMetaPlugin()],
    })
    head.push({ title: 'Title' })
    const card = () => dom.window.document.querySelectorAll('meta[name="twitter:card"]')
    renderDOMHead(head, { document: dom.window.document })
    expect([...card()].map(el => el.outerHTML)).toEqual(['<meta name="twitter:card" content="summary">'])

    const entry = head.push({ meta: [{ property: 'og:image', content: 'https://example.com/og.png' }] })
    renderDOMHead(head, { document: dom.window.document })
    expect([...card()].map(el => el.outerHTML)).toEqual(['<meta name="twitter:card" content="summary_large_image">'])

    entry.dispose()
    renderDOMHead(head, { document: dom.window.document })
    expect([...card()].map(el => el.outerHTML)).toEqual(['<meta name="twitter:card" content="summary">'])
  })
})

describe('inferSeoMetaPlugin twitter:card hydration', () => {
  const shared = { title: 'Title', meta: [{ name: 'description', content: 'Description' }] }
  // server only, like nuxt-og-image, which skips og:image while the client hydrates
  const image = { meta: [{ property: 'og:image', content: 'https://example.com/og.png' }] }

  function serverDocument(serverOnly?: typeof image) {
    const server = createHead({ disableDefaults: true, plugins: [InferSeoMetaPlugin()] })
    server.push(shared)
    if (serverOnly)
      server.push(serverOnly)
    const document = useDom(renderSSRHead(server)).window.document
    const cards = () => [...document.querySelectorAll('meta[name="twitter:card"]')].map(el => el.getAttribute('content'))
    return { document, cards }
  }

  // the client hydrates the server HTML with the shared entry only
  function hydrate(serverOnly?: typeof image) {
    const { document, cards } = serverDocument(serverOnly)
    const serverCards = cards()
    const head = createClientHeadWithContext({ document, plugins: [InferSeoMetaPlugin()] })
    head.push(shared)
    const render = () => renderDOMHead(head, { document })
    render()
    return { head, render, cards, serverCards }
  }

  it('keeps the server card when og:image exists only on the server', () => {
    const { cards, serverCards } = hydrate(image)
    expect(serverCards).toEqual(['summary_large_image'])
    expect(cards()).toEqual(['summary_large_image'])
  })

  it('keeps the server card on a later client render', () => {
    const { head, render, cards } = hydrate(image)
    head.push({ title: 'Next' })
    render()
    expect(cards()).toEqual(['summary_large_image'])
  })

  it('keeps the server card when the plugin is added to a head that already rendered', () => {
    const { document, cards } = serverDocument(image)
    const head = createClientHeadWithContext({ document })
    head.push(shared)
    renderDOMHead(head, { document })
    head.use(InferSeoMetaPlugin())
    head.push({ title: 'Next' })
    renderDOMHead(head, { document })
    expect(cards()).toEqual(['summary_large_image'])
  })

  it('uses summary once the client takes over the server image and drops it', () => {
    const { head, render, cards } = hydrate(image)
    const entry = head.push({ meta: [{ property: 'og:image', content: 'https://example.com/next.png' }] })
    render()
    expect(cards()).toEqual(['summary_large_image'])
    entry.dispose()
    render()
    expect(cards()).toEqual(['summary'])
  })

  it('keeps summary when the server rendered no image', () => {
    const { cards, serverCards } = hydrate()
    expect(serverCards).toEqual(['summary'])
    expect(cards()).toEqual(['summary'])
  })
})

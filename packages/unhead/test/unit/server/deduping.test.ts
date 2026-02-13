import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { DeprecationsPlugin } from '../../../src/plugins'
import { renderSSRHead } from '../../../src/server'
import { createServerHeadWithContext } from '../../util'

describe('dedupe', () => {
  it('arrays', async () => {
    const head = createServerHeadWithContext()

    // same entry duplicates should not be de-duped
    useHead(head, {
      meta: [
        {
          name: 'google-site-verification',
          content: ['123', '321'],
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="google-site-verification" content="123">
      <meta name="google-site-verification" content="321">",
        "htmlAttrs": "",
      }
    `)
  })

  it ('arrays two', async () => {
    const head = createServerHeadWithContext()

    // same entry duplicates should not be de-duped
    useHead(head, {
      meta: [
        {
          name: 'custom-meta',
          content: ['First custom meta tag', 'Second custom meta tag'],
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags).toMatchInlineSnapshot(`"<meta name="custom-meta" content="Second custom meta tag">"`)
  })

  it('desc', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        {
          name: 'description',
          content: 'my site wide description',
        },
      ],
    })
    head.push({
      meta: [
        {
          name: 'description',
          content: 'my page description',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(`"<meta name="description" content="my page description">"`)
    expect(
      headTags.includes('<meta name="description" content="my page description"'),
    ).toBeTruthy()
  })

  it('dedupes key', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [
        {
          // @ts-expect-error untyped
          myCustomMeta: 'first',
          key: 'custom',
        },
      ],
    })
    head.push({
      script: [
        {
          // @ts-expect-error untyped
          myCustomMeta: 'second',
          key: 'custom',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags.startsWith('<script myCustomMeta="second"')).toBeTruthy()
    expect(headTags.split('myCustomMeta').length === 2).toBeTruthy()
  })

  it('dedupes canonical', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        {
          rel: 'canonical',
          href: 'https://website.com',
        },
      ],
    })
    head.push({
      link: [
        {
          rel: 'canonical',
          href: 'https://website.com/new',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(
      headTags.startsWith(
        '<link rel="canonical" href="https://website.com/new"',
      ),
    ).toBeTruthy()
    expect(headTags.split('canonical').length === 2).toBeTruthy()
  })

  it('dedupes charset', async () => {
    const head = createServerHeadWithContext()
    head.push(
      {
        meta: [
          {
            charset: 'utf-8-overridden',
          },
        ],
      },
    )
    head.push({
      meta: [
        {
          charset: 'utf-8-two',
        },
      ],
    })
    head.push({
      meta: [
        {
          charset: 'utf-8',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags.startsWith('<meta charset="utf-8"')).toBeTruthy()
    expect(headTags.split('charset').length === 2).toBeTruthy()
  })

  it('dedupes base', async () => {
    const head = createServerHeadWithContext()
    head.push({
      base: {
        href: '/old',
        target: '_blank',
      },
    })
    head.push({
      base: {
        href: '/',
      },
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags.split('base').length === 2).toBeTruthy()
    expect(headTags.startsWith('<base href="/">')).toBeTruthy()
  })

  it('dedupes http-equiv', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        {
          'http-equiv': 'content-security-policy',
          'content': 'default-src https',
        },
      ],
    })
    head.push({
      meta: [
        {
          'http-equiv': 'content-security-policy',
          'content':
            'default-src https: \'unsafe-eval\' \'unsafe-inline\'; object-src \'none\'',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags.split('http-equiv').length === 2).toBeTruthy()
  })

  it('issue #104', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'canonical', href: 'https://mydomain.me' },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<link rel="icon" href="/favicon.ico">
      <link rel="canonical" href="https://mydomain.me">"
    `,
    )
  })

  it('doesn\'t dedupe over tag types', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        {
          key: 'icon',
          name: 'description',
          content: 'test',
        },
      ],
      link: [{ rel: 'icon', href: '/favicon.ico', key: 'icon' }],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<meta name="description" content="test">
      <link rel="icon" href="/favicon.ico" data-hid="icon">"
    `,
    )
  })

  it('dedupes legacy', async () => {
    const head = createServerHeadWithContext({
      plugins: [DeprecationsPlugin],
    })
    head.push({
      meta: [
        {
          // @ts-expect-error untyped
          'unknown-key': 'description',
          'vmid': 'desc-1',
          'content': 'test',
        },
      ],
    })
    head.push({
      meta: [
        {
          // @ts-expect-error untyped
          'unknown-key': 'description',
          'vmid': 'desc-2',
          'content': 'test 2',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<meta unknown-key="description" content="test">
      <meta unknown-key="description" content="test 2">"
    `,
    )
  })

  it('no deduping for entry and content', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        {
          property: 'og:image',
          content: [
            'https://example.com/image1.jpg',
            'https://example.com/image2.jpg',
            'https://example.com/image3.jpg',
            'https://example.com/image4.jpg',
            'https://example.com/image5.jpg',
          ],
        },
        {
          property: 'og:image',
          content: 'https://example.com/image6.jpg',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<meta property="og:image" content="https://example.com/image1.jpg">
      <meta property="og:image" content="https://example.com/image2.jpg">
      <meta property="og:image" content="https://example.com/image3.jpg">
      <meta property="og:image" content="https://example.com/image4.jpg">
      <meta property="og:image" content="https://example.com/image5.jpg">
      <meta property="og:image" content="https://example.com/image6.jpg">"
    `,
    )
  })

  it('key example readme', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        {
          name: 'og:image',
          key: 'parent-og-image',
          content: 'https://example.com/image1.jpg',
        },
      ],
    })
    head.push({
      meta: [
        {
          name: 'og:image',
          key: 'child-og-image',
          content: 'https://example.com/image2.jpg',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `"<meta name="og:image" content="https://example.com/image2.jpg">"`,
    )
  })

  it('removing tag with null props', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        {
          name: 'description',
          content: 'my description',
        },
      ],
    })
    head.push({
      meta: [
        {
          name: 'description',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(`""`)
  })

  it('null attr override', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [
        {
          key: 'my-script',
          src: 'test',
          fetchpriority: 'high',
          crossorigin: 'anonymous',
          referrerpolicy: 'no-referrer-when-downgrade',
          innerHTML: 'console.log(\'A\')',
        },
      ],
    })
    head.push({
      script: [
        {
          key: 'my-script',
          src: null,
          fetchpriority: null,
          crossorigin: false,
          referrerpolicy: null,
          // @ts-expect-error untyped
          foo: 'bar',
          innerHTML: 'console.log(\'B\')',
        },
      ],
    })

    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(`"<script data-hid="my-script" foo="bar">console.log('B')</script>"`)
  })

  it('duplicate viewport', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        {
          key: 'test',
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        // charset
        {
          charset: 'utf-8',
        },
        {
          key: 'desc',
          name: 'description',
          content: 'test',
        },
      ],
    })
    head.push({
      meta: [
        {
          key: 'test2',
          name: 'viewport',
          content: 'width=device-width, initial-scale=2',
        },
        {
          charset: 'utf-1',
        },
        {
          key: 'des123c',
          name: 'description',
          content: 'test 2',
        },
      ],
    })

    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(`
      "<meta charset="utf-1">
      <meta name="viewport" content="width=device-width, initial-scale=2">
      <meta name="description" content="test 2">"
    `)
  })

  it('meta tags with unique keys should not be deduplicated', async () => {
    const head = createServerHeadWithContext()
    head.push({
      meta: [
        {
          name: 'custom-meta',
          content: 'First custom meta tag',
          key: 'custom-meta-1',
        },
        {
          name: 'custom-meta',
          content: 'Second custom meta tag',
          key: 'custom-meta-2',
        },
      ],
    })

    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(`
      "<meta name="custom-meta" content="First custom meta tag">
      <meta name="custom-meta" content="Second custom meta tag">"
    `)
  })

  it('dedupes alternate links by hreflang', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        {
          rel: 'alternate',
          hreflang: 'en',
          href: 'https://example.com/en/page',
        },
        {
          rel: 'alternate',
          hreflang: 'fr',
          href: 'https://example.com/fr/page',
        },
        {
          rel: 'alternate',
          hreflang: 'x-default',
          href: 'https://example.com/page',
        },
      ],
    })
    // Simulate hydration - push the same links again
    head.push({
      link: [
        {
          rel: 'alternate',
          hreflang: 'en',
          href: 'https://example.com/en/page',
        },
        {
          rel: 'alternate',
          hreflang: 'fr',
          href: 'https://example.com/fr/page',
        },
        {
          rel: 'alternate',
          hreflang: 'x-default',
          href: 'https://example.com/page',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // Should only have 3 alternate links, not 6
    expect(headTags.split('rel="alternate"').length).toBe(4) // 3 tags + 1 base = 4 parts
    expect(headTags).toMatchInlineSnapshot(`
      "<link rel="alternate" hreflang="en" href="https://example.com/en/page">
      <link rel="alternate" hreflang="fr" href="https://example.com/fr/page">
      <link rel="alternate" hreflang="x-default" href="https://example.com/page">"
    `)
  })

  it('dedupes alternate links with same hreflang and href', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        {
          rel: 'alternate',
          hreflang: 'en',
          href: 'https://example.com/en/page',
        },
      ],
    })
    // Push the exact same link again (simulating hydration)
    head.push({
      link: [
        {
          rel: 'alternate',
          hreflang: 'en',
          href: 'https://example.com/en/page',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // Should only have 1 alternate link
    expect(headTags.split('rel="alternate"').length).toBe(2) // 1 tag + 1 base = 2 parts
    expect(headTags).toContain('https://example.com/en/page')
  })

  it('dedupes same hreflang with different hrefs', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        {
          rel: 'alternate',
          hreflang: 'en',
          href: 'https://example.com/en/page1',
        },
      ],
    })
    // Same hreflang should be deduped regardless of href
    head.push({
      link: [
        {
          rel: 'alternate',
          hreflang: 'en',
          href: 'https://example.com/en/page2',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // Should have 1 alternate link - last one wins
    expect(headTags.split('rel="alternate"').length).toBe(2)
    expect(headTags).toContain('https://example.com/en/page2')
    expect(headTags).not.toContain('https://example.com/en/page1')
  })

  it('dedupes alternate links without hreflang using href', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          href: 'https://example.com/feed.xml',
          title: 'RSS Feed',
        },
      ],
    })
    // Push again (simulating hydration)
    head.push({
      link: [
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          href: 'https://example.com/feed.xml',
          title: 'RSS Feed',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // Should only have 1 alternate link
    expect(headTags.split('rel="alternate"').length).toBe(2) // 1 tag + 1 base = 2 parts
    expect(headTags).toMatchInlineSnapshot(`"<link rel="alternate" type="application/rss+xml" href="https://example.com/feed.xml" title="RSS Feed">"`)
  })

  it('allows multiple alternate links with different hreflang', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        {
          rel: 'alternate',
          hreflang: 'en',
          href: 'https://example.com/en',
        },
        {
          rel: 'alternate',
          hreflang: 'de',
          href: 'https://example.com/de',
        },
        {
          rel: 'alternate',
          hreflang: 'fr',
          href: 'https://example.com/fr',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // Should have all 3 different alternate links
    expect(headTags.split('rel="alternate"').length).toBe(4) // 3 tags + 1 base = 4 parts
    expect(headTags).toContain('hreflang="en"')
    expect(headTags).toContain('hreflang="de"')
    expect(headTags).toContain('hreflang="fr"')
  })

  it('dedupes RSS feeds with same type', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        { rel: 'alternate', type: 'application/rss+xml', href: 'https://example.com/feed.xml', title: 'RSS Feed' },
      ],
    })
    head.push({
      link: [
        { rel: 'alternate', type: 'application/rss+xml', href: 'https://example.com/feed2.xml', title: 'RSS Feed 2' },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags.split('rel="alternate"').length).toBe(2)
    expect(headTags).toContain('feed2.xml')
    expect(headTags).not.toContain('feed.xml"')
  })

  it('allows RSS and Atom feeds to coexist', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        { rel: 'alternate', type: 'application/rss+xml', href: 'https://example.com/rss.xml', title: 'RSS' },
        { rel: 'alternate', type: 'application/atom+xml', href: 'https://example.com/atom.xml', title: 'Atom' },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags.split('rel="alternate"').length).toBe(3)
    expect(headTags).toContain('rss.xml')
    expect(headTags).toContain('atom.xml')
  })

  it('bare alternate without hreflang or type dedupes by href', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        { rel: 'alternate', href: 'https://example.com/a' },
        { rel: 'alternate', href: 'https://example.com/b' },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // both should exist since they have different hrefs
    expect(headTags.split('rel="alternate"').length).toBe(3)
  })

  it('dedupes bare alternate links with same href on hydration', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        { rel: 'alternate', href: '/' },
      ],
    })
    // Simulate hydration - push the same link again
    head.push({
      link: [
        { rel: 'alternate', href: '/' },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // Should only have 1 alternate link
    expect(headTags.split('rel="alternate"').length).toBe(2)
  })

  it('dedupes bare alternate links without href on hydration', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        { rel: 'alternate' },
      ],
    })
    // Simulate hydration - push the same link again
    head.push({
      link: [
        { rel: 'alternate' },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // Should only have 1 alternate link
    expect(headTags.split('rel="alternate"').length).toBe(2)
  })

  it('dedupes alternate links by id (i18n use case)', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        { id: 'i18n-alt-nl', rel: 'alternate', href: 'http://localhost:3000/nl/products/big-chair', hreflang: 'nl' },
      ],
    })
    // Simulate dynamic parameter translation update
    head.push({
      link: [
        { id: 'i18n-alt-nl', rel: 'alternate', href: 'http://localhost:3000/nl/products/grote-stoel', hreflang: 'nl' },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // Should only have 1 alternate link - last one wins via hreflang dedupe
    expect(headTags.split('rel="alternate"').length).toBe(2)
    expect(headTags).toContain('grote-stoel')
    expect(headTags).not.toContain('big-chair')
  })

  it('alternate links with key dedupe by key', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        { key: 'my-alt', rel: 'alternate', href: 'https://example.com/a' },
      ],
    })
    head.push({
      link: [
        { key: 'my-alt', rel: 'alternate', href: 'https://example.com/b' },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // Should have 1 alternate link deduped by key - last one wins
    expect(headTags.split('rel="alternate"').length).toBe(2)
    expect(headTags).toContain('https://example.com/b')
    expect(headTags).not.toContain('https://example.com/a')
  })

  it('alternate links with id dedupe by id when no hreflang', async () => {
    const head = createServerHeadWithContext()
    head.push({
      link: [
        { id: 'my-feed', rel: 'alternate', href: 'https://example.com/feed-v1.xml' },
      ],
    })
    head.push({
      link: [
        { id: 'my-feed', rel: 'alternate', href: 'https://example.com/feed-v2.xml' },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    // Should have 1 alternate link deduped by id - last one wins
    expect(headTags.split('rel="alternate"').length).toBe(2)
    expect(headTags).toContain('feed-v2.xml')
    expect(headTags).not.toContain('feed-v1.xml')
  })
})

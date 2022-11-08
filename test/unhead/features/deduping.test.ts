import { describe, it } from 'vitest'
import { createHead, useHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('dedupe', () => {
  it('arrays', async () => {
    const head = createHead()

    // same entry duplicates should not be de-duped
    useHead({
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
        "headTags": "<meta name=\\"google-site-verification\\" content=\\"123\\">
      <meta name=\\"google-site-verification\\" content=\\"321\\">",
        "htmlAttrs": "",
      }
    `)
  })

  it('desc', async () => {
    const head = createHead()
    head.push({
      meta: [
        {
          name: 'description',
          content: 'my site wide description',
        },
      ],
    },
    )
    head.push({
      meta: [
        {
          name: 'description',
          content: 'my page description',
        },
      ],
    },
    )
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot('"<meta name=\\"description\\" content=\\"my page description\\">"')
    expect(
      headTags.includes('<meta name="description" content="my page description"'),
    ).toBeTruthy()
  })

  it('dedupes key', async () => {
    const head = createHead()
    head.push({
      meta: [
        {
          myCustomMeta: 'first',
          key: 'custom',
        },
      ],
    })
    head.push({
      meta: [
        {
          myCustomMeta: 'second',
          key: 'custom',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags.startsWith('<meta myCustomMeta="second"')).toBeTruthy()
    expect(headTags.split('myCustomMeta').length === 2).toBeTruthy()
  })

  test('dedupes canonical', async () => {
    const head = createHead()
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

  test('dedupes charset', async () => {
    const head = createHead()
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

  test('dedupes base', async () => {
    const head = createHead()
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

  test('dedupes http-equiv', async () => {
    const head = createHead()
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

  test('issue #104', async () => {
    const head = createHead()
    head.push({
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'canonical', href: 'https://mydomain.me' },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<link rel=\\"icon\\" href=\\"/favicon.ico\\">
      <link rel=\\"canonical\\" href=\\"https://mydomain.me\\">"
    `,
    )
  })

  test('doesn\'t dedupe over tag types', async () => {
    const head = createHead()
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
      "<meta name=\\"description\\" content=\\"test\\">
      <link rel=\\"icon\\" href=\\"/favicon.ico\\">"
    `,
    )
  })

  test('dedupes legacy', async () => {
    const head = createHead()
    head.push({
      meta: [
        {
          'unknown-key': 'description',
          'vmid': 'desc-1',
          'content': 'test',
        },
      ],
    })
    head.push({
      meta: [
        {
          'unknown-key': 'description',
          'vmid': 'desc-2',
          'content': 'test 2',
        },
      ],
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<meta unknown-key=\\"description\\" content=\\"test\\">
      <meta unknown-key=\\"description\\" content=\\"test 2\\">"
    `,
    )
  })

  test('no deduping for entry and content', async () => {
    const head = createHead()
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
      "<meta property=\\"og:image\\" content=\\"https://example.com/image1.jpg\\">
      <meta property=\\"og:image\\" content=\\"https://example.com/image2.jpg\\">
      <meta property=\\"og:image\\" content=\\"https://example.com/image3.jpg\\">
      <meta property=\\"og:image\\" content=\\"https://example.com/image4.jpg\\">
      <meta property=\\"og:image\\" content=\\"https://example.com/image5.jpg\\">
      <meta property=\\"og:image\\" content=\\"https://example.com/image6.jpg\\">"
    `,
    )
  })

  test('key example readme', async () => {
    const head = createHead()
    head.push({
      meta: [
        {
          name: 'og:image',
          key: 'parent-og-image',
          content: 'https://example.com/image1.jpg',
        },
      ],
    },
    )
    head.push({
      meta: [
        {
          name: 'og:image',
          key: 'child-og-image',
          content: 'https://example.com/image2.jpg',
        },
      ],
    },
    )
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<meta name=\\"og:image\\" content=\\"https://example.com/image1.jpg\\">
      <meta name=\\"og:image\\" content=\\"https://example.com/image2.jpg\\">"
    `,
    )
  })

  test('removing tag with null props', async () => {
    const head = createHead()
    head.push({
      meta: [
        {
          key: 'description',
          name: 'description',
          content: 'my description',
        },
      ],
    },
    )
    head.push({
      meta: [
        {
          key: 'description',
        },
      ],
    },
    )
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot('""')
  })
})

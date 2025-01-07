import { renderDOMHead } from '@unhead/dom'
import { defineImage, defineOrganization, defineQuestion, defineWebPage, defineWebSite, SchemaOrgUnheadPlugin, useSchemaOrg } from '@unhead/schema-org'
import { renderSSRHead } from '@unhead/ssr'
import { useHead } from 'unhead'
import { describe, expect, it } from 'vitest'
import { useDom } from '../../../../test/fixtures'
import { createHeadWithContext } from '../../../../test/util'

describe('schema.org e2e', () => {
  it('basic hydration', async () => {
    const ssrHead = createHeadWithContext({
      plugins: [
        SchemaOrgUnheadPlugin(),
      ],
    })

    useHead({
      templateParams: {
        siteDescription: 'hello world',
      },
    })

    useSchemaOrg([
      defineWebPage({
        name: 'test',
        description: '%siteDescription',
      }),
    ])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#webpage",
            "@type": "WebPage",
            "description": "hello world",
            "name": "test"
          }
        ]
      }</script>"
    `)

    const dom = useDom(data)

    const csrHead = createHeadWithContext()
    await renderDOMHead(csrHead, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>
      <script type="application/ld+json" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#webpage",
            "@type": "WebPage",
            "description": "hello world",
            "name": "test"
          }
        ]
      }</script>


      </body></html>"
    `)
  })

  it('hierarchy', async () => {
    const ssrHead = createHeadWithContext({
      plugins: [
        SchemaOrgUnheadPlugin({
          path: '/about',
        }),
      ],
    })

    useSchemaOrg([
      defineWebPage({
        name: 'Home',
      }),
    ])

    useSchemaOrg([
      defineWebPage({
        '@type': 'AboutPage',
        'name': 'About',
      }),
    ])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "/about/#webpage",
            "name": "About",
            "url": "/about",
            "@type": [
              "WebPage",
              "AboutPage"
            ]
          }
        ]
      }</script>"
    `)

    const dom = useDom(data)

    const csrHead = createHeadWithContext()
    await renderDOMHead(csrHead, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>
      <script type="application/ld+json" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "/about/#webpage",
            "name": "About",
            "url": "/about",
            "@type": [
              "WebPage",
              "AboutPage"
            ]
          }
        ]
      }</script>


      </body></html>"
    `)
  })

  it('linking', async () => {
    const ssrHead = createHeadWithContext({
      plugins: [
        SchemaOrgUnheadPlugin({
          path: '/about',
          host: 'https://example.com',
        }),
      ],
    })
    useSchemaOrg([
      defineOrganization({
        name: 'test',
      }),
      defineWebSite({
        name: 'test',
        publisher: {
          '@type': 'Organization',
          '@id': '#identity',
        },
      }),
    ])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "https://example.com/#identity",
            "@type": "Organization",
            "name": "test",
            "url": "https://example.com"
          },
          {
            "@id": "https://example.com/#website",
            "@type": "WebSite",
            "name": "test",
            "url": "https://example.com",
            "publisher": {
              "@id": "https://example.com/#identity"
            }
          }
        ]
      }</script>"
    `)
  })

  it('faq', async () => {
    const ssrHead = createHeadWithContext({
      plugins: [
        SchemaOrgUnheadPlugin({
          path: '/about',
          host: 'https://example.com',
        }),
      ],
    })
    useSchemaOrg([
      defineWebPage({
        '@type': 'FAQPage',
      }),
      defineQuestion({
        question: 'What is your return policy?',
        answer: 'Most unopened items in new condition and returned within 90 days will receive a refund or exchange.',
      }),
      defineQuestion({
        question: 'What is something else?',
        answer: 'Something else',
      }),
    ])
    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "https://example.com/about/#webpage",
            "url": "https://example.com/about",
            "@type": [
              "WebPage",
              "FAQPage"
            ],
            "mainEntity": [
              {
                "@id": "https://example.com/about/#/schema/question/ab1c398"
              },
              {
                "@id": "https://example.com/about/#/schema/question/6396da9"
              }
            ]
          },
          {
            "@id": "https://example.com/about/#/schema/question/ab1c398",
            "@type": "Question",
            "name": "What is your return policy?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Most unopened items in new condition and returned within 90 days will receive a refund or exchange."
            }
          },
          {
            "@id": "https://example.com/about/#/schema/question/6396da9",
            "@type": "Question",
            "name": "What is something else?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Something else"
            }
          }
        ]
      }</script>"
    `)
  })

  it('canonical', async () => {
    const ssrHead = createHeadWithContext({
      plugins: [
        SchemaOrgUnheadPlugin(),
      ],
    })

    useHead({
      link: [
        { rel: 'canonical', href: `%siteUrl/some-path` },
      ],
    })

    useSchemaOrg([
      defineWebSite(),
      defineWebPage({
        name: 'test',
      }),
    ])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#website",
            "@type": "WebSite"
          },
          {
            "@id": "#webpage",
            "@type": "WebPage",
            "name": "test",
            "isPartOf": {
              "@id": "#website"
            }
          }
        ]
      }</script>"
    `)
  })

  it('empty', async () => {
    const ssrHead = createHeadWithContext({
      plugins: [
        SchemaOrgUnheadPlugin(),
      ],
    })
    useSchemaOrg(['test'])
    useSchemaOrg([])
    // @ts-expect-error intentional
    useSchemaOrg('')
    // @ts-expect-error intentional
    useSchemaOrg('test')

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`""`)
  })
  it('#441', async () => {
    const ssrHead = createHeadWithContext({
      plugins: [
        SchemaOrgUnheadPlugin(),
      ],
    })

    useSchemaOrg([{
      '@type': 'ImageGallery',
      'name': 'Gallery',
      'image': [defineImage({
        url: 'test',
      })],
    }])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#/schema/image-gallery/6e5ff96",
            "@type": "ImageGallery",
            "name": "Gallery",
            "image": [
              {
                "@type": "ImageObject",
                "url": "test",
                "contentUrl": "test"
              }
            ]
          }
        ]
      }</script>"
    `)
  })
})

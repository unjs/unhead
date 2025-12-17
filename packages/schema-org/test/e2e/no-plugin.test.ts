import { defineOrganization, defineQuestion, defineWebPage, defineWebSite, useSchemaOrg } from '@unhead/schema-org'
import { useHead } from 'unhead'
import { createHead as createClientHead, renderDOMHead } from 'unhead/client'
import { createHead as createServerHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { useDom } from '../../../unhead/test/fixtures'

describe('schema.org e2e no plugin', () => {
  it('basic hydration', async () => {
    const ssrHead = createServerHead({
      disableDefaults: true,
    })

    useSchemaOrg(ssrHead, [
      defineWebPage({
        name: 'test',
      }),
    ])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#webpage",
            "@type": "WebPage",
            "name": "test"
          }
        ]
      }</script>"
    `)

    const dom = useDom(data)

    const csrHead = createClientHead()
    await renderDOMHead(csrHead, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>
      <script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#webpage",
            "@type": "WebPage",
            "name": "test"
          }
        ]
      }</script>


      </body></html>"
    `)
  })

  it('hierarchy', async () => {
    const ssrHead = createServerHead({
      disableDefaults: true,
    })

    useHead(ssrHead, {
      templateParams: {
        schemaOrg: {
          path: '/about',
        },
      },
    })

    useSchemaOrg(ssrHead, [
      defineWebPage({
        name: 'Home',
      }),
    ])

    useSchemaOrg(ssrHead, [
      defineWebPage({
        '@type': 'AboutPage',
        'name': 'About',
      }),
    ])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "/about#webpage",
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

    const csrHead = createClientHead()
    await renderDOMHead(csrHead, { document: dom.window.document })
    expect(dom.serialize()).toMatchInlineSnapshot(`
      "<!DOCTYPE html><html><head>

      </head>
      <body>

      <div>
      <h1>hello world</h1>
      </div>
      <script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "/about#webpage",
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
    const ssrHead = createServerHead({
      disableDefaults: true,
    })

    useHead(ssrHead, {
      templateParams: {
        schemaOrg: {
          path: '/about',
          host: 'https://example.com',
        },
      },
    })

    useSchemaOrg(ssrHead, [
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
      "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "https://example.com#identity",
            "@type": "Organization",
            "name": "test",
            "url": "https://example.com"
          },
          {
            "@id": "https://example.com#website",
            "@type": "WebSite",
            "name": "test",
            "url": "https://example.com",
            "publisher": {
              "@id": "https://example.com#identity"
            }
          }
        ]
      }</script>"
    `)
  })

  it('faq', async () => {
    const ssrHead = createServerHead({
      disableDefaults: true,
    })

    useHead(ssrHead, {
      templateParams: {
        schemaOrg: {
          path: '/about',
          host: 'https://example.com',
        },
      },
    })

    useSchemaOrg(ssrHead, [
      defineWebPage({
        '@type': 'FAQPage',
      }),
      defineQuestion({
        name: 'What is your return policy?',
        acceptedAnswer: 'Most unopened items in new condition and returned within 90 days will receive a refund or exchange.',
      }),
      defineQuestion({
        name: 'What is something else?',
        acceptedAnswer: 'Something else',
      }),
    ])
    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "https://example.com/about#webpage",
            "url": "https://example.com/about",
            "@type": [
              "WebPage",
              "FAQPage"
            ],
            "mainEntity": [
              {
                "@id": "https://example.com/about#/schema/question/1"
              },
              {
                "@id": "https://example.com/about#/schema/question/2"
              }
            ]
          },
          {
            "@id": "https://example.com/about#/schema/question/1",
            "@type": "Question",
            "name": "What is your return policy?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Most unopened items in new condition and returned within 90 days will receive a refund or exchange."
            }
          },
          {
            "@id": "https://example.com/about#/schema/question/2",
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

  it('many registrations', async () => {
    const ssrHead = createServerHead({
      disableDefaults: true,
    })
    useSchemaOrg(ssrHead, [
      defineWebPage({
        name: 'One',
      }),
    ])
    useSchemaOrg(ssrHead, [
      defineWebPage({
        name: 'Two',
      }),
    ])
    useSchemaOrg(ssrHead, [
      defineWebPage({
        name: 'Three',
      }),
    ])
    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#webpage",
            "@type": "WebPage",
            "name": "Three"
          }
        ]
      }</script>"
    `)
  })
})

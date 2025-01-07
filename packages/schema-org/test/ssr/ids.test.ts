import { defineWebPage, defineWebSite, useSchemaOrg } from '@unhead/schema-org'
import { useHead } from 'unhead'
import { describe, expect, it } from 'vitest'
import { createHeadWithContext } from '../../../../test/util'

describe('schema.org ssr ids', () => {
  it('adds host prefix to custom id without host', async () => {
    const ssrHead = createHeadWithContext()

    useHead({
      templateParams: {
        schemaOrg: {
          host: 'https://example.com',
        },
      },
    })

    useSchemaOrg([
      defineWebPage({
        '@id': '#foo',
        'name': 'foo',
      }),
    ])

    const tags = await ssrHead.resolveTags()
    const id = JSON.parse(tags[0].innerHTML!)['@graph'][0]['@id']
    expect(id).toMatchInlineSnapshot(`"https://example.com/#/schema/web-page/#foo"`)
  })
  it('allows ids with custom domains', async () => {
    const ssrHead = createHeadWithContext()

    useHead({
      templateParams: {
        schemaOrg: {
          host: 'https://example.com',
        },
      },
    })

    useSchemaOrg([
      defineWebPage({
        '@id': 'https://custom-domain.com/#foo',
        'name': 'foo',
      }),
    ])

    const tags = await ssrHead.resolveTags()
    const id = JSON.parse(tags[0].innerHTML!)['@graph'][0]['@id']
    expect(id).toMatchInlineSnapshot('"https://custom-domain.com/#foo"')
  })
  it('full relative paths', async () => {
    const ssrHead = createHeadWithContext()

    useHead({
      templateParams: {
        schemaOrg: {
          host: 'https://example.com',
        },
      },
    })

    useSchemaOrg([
      defineWebPage({
        '@id': '/fr#website',
        'name': 'foo',
      }),
    ])

    const tags = await ssrHead.resolveTags()
    const id = JSON.parse(tags[0].innerHTML!)['@graph'][0]['@id']
    expect(id).toMatchInlineSnapshot(`"https://example.com/fr#website"`)
  })

  it('full relative paths relations', async () => {
    const ssrHead = createHeadWithContext()

    useHead({
      templateParams: {
        schemaOrg: {
          host: 'https://example.com',
        },
      },
    })

    useSchemaOrg([
      defineWebSite({
        '@id': '/en#website',
        'name': 'foo',
        'workTranslation': [
          { '@type': 'WebSite', '@id': '/es#website' },
          { '@type': 'WebSite', '@id': '/fr#website' },
        ],
      }),
      defineWebPage(),
    ])

    useSchemaOrg([
      defineWebPage({
        name: 'merge?',
      }),
    ])

    useSchemaOrg([
      defineWebPage({
        potentialAction: {
          '@type': 'ViewAction',
          'target': ['https://example.com'],
        },
      }),
    ], {
      tagDuplicateStrategy: 'replace',
    })

    const tags = await ssrHead.resolveTags()
    const graph = JSON.parse(tags[0]!.innerHTML!)?.['@graph']
    expect(graph).toMatchInlineSnapshot(`
      [
        {
          "@id": "https://example.com/en#website",
          "@type": "WebSite",
          "name": "foo",
          "url": "https://example.com",
          "workTranslation": [
            {
              "@id": "https://example.com/es#website",
            },
            {
              "@id": "https://example.com/fr#website",
            },
          ],
        },
        {
          "@id": "https://example.com/#webpage",
          "@type": "WebPage",
          "isPartOf": {
            "@id": "https://example.com/en#website",
          },
          "potentialAction": {
            "@type": "ViewAction",
            "target": [
              "https://example.com",
            ],
          },
          "url": "https://example.com",
        },
      ]
    `)
  })
})

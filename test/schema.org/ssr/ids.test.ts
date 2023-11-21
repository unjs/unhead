import { describe, expect, it } from 'vitest'
import { createHead, useHead } from 'unhead'
import { defineWebPage, useSchemaOrg } from '@unhead/schema-org'

describe('schema.org ssr ids', () => {
  it('adds host prefix to custom id without host', async () => {
    const ssrHead = createHead()

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
    expect(id).toMatchInlineSnapshot('"https://example.com/#foo"')
  })
  it('allows ids with custom domains', async () => {
    const ssrHead = createHead()

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
})

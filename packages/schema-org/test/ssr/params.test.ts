import { defineWebPage, useSchemaOrg } from '@unhead/schema-org'
import { createHead, renderSSRHead } from '@unhead/ssr'
import { useHead } from 'unhead'
import { describe, expect, it } from 'vitest'

describe('schema.org params', () => {
  it('trailingSlash as a boolean through plain useHead (#819)', () => {
    const ssrHead = createHead()

    useHead(ssrHead, {
      templateParams: {
        schemaOrg: {
          host: 'https://example.com',
          path: '/blog',
          trailingSlash: true,
        },
      },
    })

    useSchemaOrg(ssrHead, [
      defineWebPage(),
    ])

    const data = renderSSRHead(ssrHead)
    expect(data.bodyTags).toContain('"url": "https://example.com/blog/"')
  })
})

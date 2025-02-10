import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { defineWebSite, useSchemaOrg } from '../../../src/schema-org'

describe('schema.org dupes', () => {
  it('basic websites', async () => {
    const ssrHead = createHead()

    useSchemaOrg(ssrHead, [
      defineWebSite({
        url: '/',
        inLanguage: 'en',
        name: 'hello',
      }),
    ])

    useSchemaOrg(ssrHead, [
      defineWebSite({
        '@type': 'AboutPage',
      }),
    ])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#website",
            "@type": "AboutPage",
            "inLanguage": "en"
          }
        ]
      }</script>"
    `)
  })
})

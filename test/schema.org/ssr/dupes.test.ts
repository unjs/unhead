import { defineWebSite, UnheadSchemaOrg } from '@unhead/schema-org'
import { renderSSRHead } from '@unhead/ssr'
import { createHead, useHead } from 'unhead'
import { describe, expect, it } from 'vitest'

describe('schema.org dupes', () => {
  it('basic websites', async () => {
    const ssrHead = createHead()

    ssrHead.use(UnheadSchemaOrg())

    useHead({
      script: [
        {
          type: 'application/ld+json',
          key: 'schema-org-graph',
          nodes: [
            defineWebSite({
              url: '/',
              inLanguage: 'en',
              name: 'hello',
            }),
          ],
        },
        {
          type: 'application/ld+json',
          key: 'schema-org-graph',
          id: 'schema-org-graph-2',
          nodes: [
            defineWebSite({
              '@type': 'AboutPage',
            }),
          ],
        },
      ],
    })

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" id="schema-org-graph-2" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#website",
            "@type": "AboutPage",
            "inLanguage": "en",
            "name": "hello",
            "url": "/"
          }
        ]
      }</script>"
    `)
  })
})

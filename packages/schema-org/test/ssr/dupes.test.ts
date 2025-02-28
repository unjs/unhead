import { defineWebSite, UnheadSchemaOrg } from '@unhead/schema-org'
import { useHead } from 'unhead'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'

describe('schema.org dupes', () => {
  it('basic websites', async () => {
    const ssrHead = createHead()

    ssrHead.use(UnheadSchemaOrg())

    useHead(ssrHead, {
      script: [
        {
          type: 'application/ld+json',
          key: 'schema-org-graph',
          // @ts-expect-error untyped
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
          // @ts-expect-error untyped
          nodes: [
            // @ts-expect-error broken
            defineWebSite({
              '@type': 'AboutPage',
            }),
          ],
        },
      ],
    })

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="schema-org-graph" id="schema-org-graph-2">{
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

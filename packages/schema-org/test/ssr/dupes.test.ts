import { defineWebSite, UnheadSchemaOrg } from '@unhead/schema-org'
import { useHead } from 'unhead'
import { createHead, renderSSRHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'

const JSON_LD_RE = /application\/ld\+json/g

describe('schema.org dupes', () => {
  it('basic websites', async () => {
    const ssrHead = createHead()

    ssrHead.use(UnheadSchemaOrg())

    useHead(ssrHead, {
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
        } as any,
        {
          type: 'application/ld+json',
          key: 'schema-org-graph',
          id: 'schema-org-graph-2',
          nodes: [
            // @ts-expect-error broken
            defineWebSite({
              '@type': 'AboutPage',
            }),
          ],
        } as any,
      ],
    })

    const data = renderSSRHead(ssrHead)
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

  it('handles tags without props in afterResolve without crashing', async () => {
    const ssrHead = createHead()

    ssrHead.use(UnheadSchemaOrg())

    ssrHead.hooks.hook('tags:resolve', (ctx) => {
      // @ts-expect-error simulating a malformed tag with no props
      ctx.tags.push({ tag: 'meta', props: undefined, _p: 0, _w: 0 })
    })
    ssrHead.hooks.hook('tags:afterResolve', (ctx) => {
      ctx.tags = ctx.tags.filter(({ props }) => props !== undefined)
    })

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
      ],
    })

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#website",
            "@type": "WebSite",
            "inLanguage": "en",
            "name": "hello",
            "url": "/"
          }
        ]
      }</script>"
    `)
  })

  it('handles three or more duplicate schema-org entries without crashing', async () => {
    const ssrHead = createHead()

    ssrHead.use(UnheadSchemaOrg())

    useHead(ssrHead, {
      script: [
        {
          type: 'application/ld+json',
          key: 'schema-org-graph',
          nodes: [
            defineWebSite({
              url: '/',
              inLanguage: 'en',
              name: 'first',
            }),
          ],
        },
        {
          type: 'application/ld+json',
          key: 'schema-org-graph',
          nodes: [
            // @ts-expect-error broken
            defineWebSite({
              '@type': 'AboutPage',
            }),
          ],
        },
        {
          type: 'application/ld+json',
          key: 'schema-org-graph',
          nodes: [
            defineWebSite({
              name: 'third',
            }),
          ],
        },
      ] as any,
    })

    const data = await renderSSRHead(ssrHead)
    // should merge all three into a single script tag without throwing
    expect(data.bodyTags).toContain('"@context": "https://schema.org"')
    expect(data.bodyTags.match(JSON_LD_RE)?.length).toBe(1)
  })
})

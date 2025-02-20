import { defineArticle, defineWebPage, useSchemaOrg } from '@unhead/schema-org/vue'
import { useHead } from '@unhead/vue'
import { createHead as createClientHead, renderDOMHead } from '@unhead/vue/client'
import { renderSSRHead } from '@unhead/vue/server'
import { describe, expect, it } from 'vitest'
import { useDom } from '../../../unhead/test/fixtures'
import { ssrVueAppWithUnhead } from '../../../vue/test/util'

describe('schema.org e2e', () => {
  it('dates', async () => {
    const head = await ssrVueAppWithUnhead(() => {
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
        defineArticle({
          datePublished: new Date(Date.UTC(2021, 10, 1, 0, 0, 0)),
          dateModified: new Date(Date.UTC(2022, 1, 1, 0, 0, 0)),
        }),
      ])
    })

    const data = await renderSSRHead(head)
    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#webpage",
            "@type": "WebPage",
            "dateModified": "2022-02-01T00:00:00.000Z",
            "datePublished": "2021-11-01T00:00:00.000Z",
            "description": "hello world",
            "name": "test",
            "potentialAction": [
              {
                "@type": "ReadAction",
                "target": [
                  ""
                ]
              }
            ]
          },
          {
            "@id": "#article",
            "@type": "Article",
            "dateModified": "2022-02-01T00:00:00.000Z",
            "datePublished": "2021-11-01T00:00:00.000Z",
            "isPartOf": {
              "@id": "#webpage"
            },
            "mainEntityOfPage": {
              "@id": "#webpage"
            }
          }
        ]
      }</script>",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": "",
      }
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
            "dateModified": "2022-02-01T00:00:00.000Z",
            "datePublished": "2021-11-01T00:00:00.000Z",
            "description": "hello world",
            "name": "test",
            "potentialAction": [
              {
                "@type": "ReadAction",
                "target": [
                  ""
                ]
              }
            ]
          },
          {
            "@id": "#article",
            "@type": "Article",
            "dateModified": "2022-02-01T00:00:00.000Z",
            "datePublished": "2021-11-01T00:00:00.000Z",
            "isPartOf": {
              "@id": "#webpage"
            },
            "mainEntityOfPage": {
              "@id": "#webpage"
            }
          }
        ]
      }</script>


      </body></html>"
    `)
  })
  it('empty', async () => {
    const head = await ssrVueAppWithUnhead(() => {
      const schema = useSchemaOrg()
      schema.patch([
        defineWebPage({
          name: 'test',
        }),
      ])
    })
    const data = await renderSSRHead(head)
    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "<script type="application/ld+json" data-hid="schema-org-graph">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#webpage",
            "@type": "WebPage",
            "name": "test"
          }
        ]
      }</script>",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": "",
      }
    `)
  })
})

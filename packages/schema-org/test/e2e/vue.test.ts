import { renderDOMHead } from '@unhead/dom'
import { defineArticle, defineWebPage, useSchemaOrg } from '@unhead/schema-org/vue'
import { renderSSRHead } from '@unhead/ssr'
import { createHead, useHead } from 'unhead'
import { describe, expect, it } from 'vitest'
import { useDom } from '../../../../test/fixtures'
import { createHeadWithContext } from '../../../../test/util'

describe('schema.org e2e', () => {
  it('dates', async () => {
    const ssrHead = createHeadWithContext()

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

    const data = await renderSSRHead(ssrHead)
    expect(data).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "<script type="application/ld+json" data-hid="3437552">{
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

    const csrHead = createHead()
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
})

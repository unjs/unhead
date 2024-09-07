import { defineWebPage, useSchemaOrg } from '@unhead/schema-org'
import { renderSSRHead } from '@unhead/ssr'
import { createHead, useHead } from 'unhead'
import { describe, expect, it } from 'vitest'

describe('schema.org ssr xss', () => {
  it('basic', async () => {
    const ssrHead = createHead()

    useHead({
      templateParams: {
        // use XSS for json script
        xssVar: '</script><script>alert(1)</script>',
      },
    })

    useSchemaOrg([
      defineWebPage({
        name: 'test',
        description: '%xssVar',
        foo: '"}</script><script>alert(2)</script>',
      }),
    ])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#webpage",
            "@type": "WebPage",
            "description": "\\u003C/script>\\u003Cscript>alert(1)\\u003C/script>",
            "foo": "\\"}\\u003C/script>\\u003Cscript>alert(2)\\u003C/script>",
            "name": "test"
          }
        ]
      }</script>"
    `)
  })
})

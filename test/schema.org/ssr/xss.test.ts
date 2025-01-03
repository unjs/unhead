import { defineQuestion, defineWebPage, useSchemaOrg } from '@unhead/schema-org'
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

  it('question', async () => {
    const ssrHead = createHead()

    useSchemaOrg([
      defineQuestion({
        name: 'What is the <i>meaning of life</i>?',
        acceptedAnswer: '<strong>Let me tell you!</strong>It\'s at least 42.',
      }),
    ])

    const data = await renderSSRHead(ssrHead)
    expect(data.bodyTags).toMatchInlineSnapshot(`
      "<script type="application/ld+json" data-hid="3437552">{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@id": "#/schema/question/2a5f1e8",
            "@type": "Question",
            "name": "What is the \\u003Ci>meaning of life\\u003C/i>?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "\\u003Cstrong>Let me tell you!\\u003C/strong>It's at least 42."
            }
          }
        ]
      }</script>"
    `)
  })
})
